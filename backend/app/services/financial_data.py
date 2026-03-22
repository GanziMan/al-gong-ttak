"""재무제표, 배당, 대주주 데이터 서비스 (DART API + DB 캐시)"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta

from sqlalchemy import select

from app.database import async_session
from app.models.financial_data import FinancialData
from app.services.dart_client import DartClient

logger = logging.getLogger(__name__)

CACHE_TTL_HOURS = 24


def _is_cache_fresh(fetched_at: str) -> bool:
    try:
        dt = datetime.fromisoformat(fetched_at)
        return datetime.now() - dt < timedelta(hours=CACHE_TTL_HOURS)
    except Exception:
        return False


async def _get_cached(corp_code: str, data_type: str, bsns_year: str, reprt_code: str) -> dict | None:
    async with async_session() as session:
        row = await session.get(FinancialData, (corp_code, data_type, bsns_year, reprt_code))
        if row and _is_cache_fresh(row.fetched_at):
            return row.data
    return None


async def _save_cache(corp_code: str, data_type: str, bsns_year: str, reprt_code: str, data: dict) -> None:
    async with async_session() as session:
        existing = await session.get(FinancialData, (corp_code, data_type, bsns_year, reprt_code))
        if existing:
            existing.data = data
            existing.fetched_at = datetime.now().isoformat()
        else:
            session.add(FinancialData(
                corp_code=corp_code,
                data_type=data_type,
                bsns_year=bsns_year,
                reprt_code=reprt_code,
                data=data,
                fetched_at=datetime.now().isoformat(),
            ))
        await session.commit()


def _parse_financial_statements(raw: dict) -> list[dict]:
    """DART 재무제표 응답에서 주요 계정 추출 (연결재무제표 우선)"""
    if raw.get("status") != "000":
        return []

    items = raw.get("list", [])
    # 연결재무제표(CFS) 우선, 없으면 개별(OFS)
    cfs = [i for i in items if i.get("fs_div") == "CFS"]
    rows = cfs if cfs else [i for i in items if i.get("fs_div") == "OFS"]

    result = []
    for row in rows:
        account = row.get("account_nm", "")
        # 주요 계정만 추출
        if account in ("매출액", "영업이익", "당기순이익", "자산총계", "부채총계", "자본총계"):
            val = row.get("thstrm_amount", "")
            result.append({
                "account": account,
                "amount": _parse_amount(val),
                "amount_raw": val,
            })
    return result


def _parse_dividends(raw: dict) -> list[dict]:
    """DART 배당 응답 파싱"""
    if raw.get("status") != "000":
        return []
    return raw.get("list", [])


def _parse_shareholders(raw: dict) -> list[dict]:
    """DART 대주주 응답 파싱"""
    if raw.get("status") != "000":
        return []
    items = raw.get("list", [])
    result = []
    for item in items:
        result.append({
            "name": item.get("nm", ""),
            "relation": item.get("relate", ""),
            "shares": _parse_amount(item.get("stock_knd", "") + " " + item.get("bsis_posesn_stock_co", "")),
            "shares_raw": item.get("bsis_posesn_stock_co", ""),
            "ownership_pct": item.get("bsis_posesn_stock_qota_rt", ""),
        })
    return result


def _parse_amount(val: str) -> int:
    """문자열 금액 → 정수 (쉼표, 공백 제거)"""
    if not val:
        return 0
    try:
        return int(val.replace(",", "").replace(" ", "").replace("-", "0"))
    except (ValueError, TypeError):
        return 0


async def get_financial_summary(dart_client: DartClient, corp_code: str, years: int = 5) -> list[dict]:
    """최근 N년 재무제표 요약 (병렬 조회)"""
    current_year = datetime.now().year
    year_list = [str(y) for y in range(current_year - years, current_year)]

    async def _fetch_one(bsns_year: str) -> dict:
        cached = await _get_cached(corp_code, "financial", bsns_year, "11011")
        if cached:
            return {"year": bsns_year, "accounts": cached}
        try:
            raw = await dart_client.get_financial_statements(corp_code, bsns_year)
            parsed = _parse_financial_statements(raw)
            await _save_cache(corp_code, "financial", bsns_year, "11011", parsed)
            return {"year": bsns_year, "accounts": parsed}
        except Exception:
            logger.warning("Failed to fetch financials for %s/%s", corp_code, bsns_year)
            return {"year": bsns_year, "accounts": []}

    return await asyncio.gather(*[_fetch_one(y) for y in year_list])


async def get_dividend_history(dart_client: DartClient, corp_code: str, years: int = 5) -> list[dict]:
    """최근 N년 배당 이력 (병렬 조회)"""
    current_year = datetime.now().year
    year_list = [str(y) for y in range(current_year - years, current_year)]

    async def _fetch_one(bsns_year: str) -> dict:
        cached = await _get_cached(corp_code, "dividend", bsns_year, "11011")
        if cached:
            return {"year": bsns_year, "dividends": cached}
        try:
            raw = await dart_client.get_dividends(corp_code, bsns_year)
            parsed = _parse_dividends(raw)
            await _save_cache(corp_code, "dividend", bsns_year, "11011", parsed)
            return {"year": bsns_year, "dividends": parsed}
        except Exception:
            logger.warning("Failed to fetch dividends for %s/%s", corp_code, bsns_year)
            return {"year": bsns_year, "dividends": []}

    return await asyncio.gather(*[_fetch_one(y) for y in year_list])


async def get_shareholders(dart_client: DartClient, corp_code: str) -> list[dict]:
    """최신 대주주 현황 (최근 연도 사업보고서)"""
    current_year = datetime.now().year

    # 올해 → 작년 순으로 시도
    for year in range(current_year, current_year - 3, -1):
        bsns_year = str(year)
        cached = await _get_cached(corp_code, "shareholder", bsns_year, "11011")
        if cached:
            return cached

        try:
            raw = await dart_client.get_major_shareholders(corp_code, bsns_year)
            parsed = _parse_shareholders(raw)
            if parsed:
                await _save_cache(corp_code, "shareholder", bsns_year, "11011", parsed)
                return parsed
        except Exception:
            logger.warning("Failed to fetch shareholders for %s/%s", corp_code, bsns_year)

    return []
