"""재무제표, 배당, 대주주 데이터 서비스 (DART API + DB 캐시)"""
from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select

from app.database import async_session
from app.models.financial_data import FinancialData
from app.services.dart_client import DartClient
from app.services.response_cache import get_or_set

logger = logging.getLogger(__name__)

CACHE_TTL_HOURS = 24

DIVIDEND_CHANGE_ORDER = {
    "confirmed": -1,
    "increase": 0,
    "flat": 1,
    "decrease": 2,
    "no_dividend": 3,
    "new": 4,
    "unknown": 5,
}

DIVIDEND_RECORD_DATE_KEYWORDS = (
    "현금ㆍ현물배당결정",
    "현금·현물배당결정",
    "현금현물배당결정",
    "주주명부폐쇄기간또는기준일설정",
    "주주명부폐쇄기준일",
    "배당기준일",
)

DIVIDEND_RECORD_DATE_LABELS = (
    "배당기준일",
    "주주명부폐쇄기준일",
    "주주명부 폐쇄기준일",
    "주주명부폐쇄 기간 또는 기준일",
    "주주명부폐쇄기간 또는 기준일",
    "기준일",
)

RECENT_DIVIDEND_HISTORY_YEARS = 3
DIRECT_DIVIDEND_REPORT_KEYWORDS = (
    "현금ㆍ현물배당결정",
    "현금·현물배당결정",
    "현금현물배당결정",
)
DIVIDEND_CONTEXT_KEYWORDS = (
    "배당",
    "현금배당",
    "현금ㆍ현물배당",
    "현금·현물배당",
    "주당배당금",
)


def _is_cache_fresh(fetched_at: str) -> bool:
    try:
        dt = datetime.fromisoformat(fetched_at)
        return datetime.now() - dt < timedelta(hours=CACHE_TTL_HOURS)
    except Exception:
        return False


async def _batch_get_cached(corp_code: str) -> dict[tuple[str, str, str], dict]:
    """corp_code의 모든 캐시 데이터를 한 번에 로드 → {(data_type, year, reprt_code): data}"""
    async with async_session() as session:
        stmt = select(FinancialData).where(FinancialData.corp_code == corp_code)
        result = await session.execute(stmt)
        rows = result.scalars().all()

    cache = {}
    for row in rows:
        if _is_cache_fresh(row.fetched_at):
            cache[(row.data_type, row.bsns_year, row.reprt_code)] = row.data
    return cache


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


async def _batch_save_cache(items: list[tuple[str, str, str, str, dict]]) -> None:
    """여러 캐시를 한 트랜잭션에 저장: [(corp_code, data_type, year, reprt_code, data), ...]"""
    if not items:
        return
    async with async_session() as session:
        for corp_code, data_type, bsns_year, reprt_code, data in items:
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
    cfs = [i for i in items if i.get("fs_div") == "CFS"]
    rows = cfs if cfs else [i for i in items if i.get("fs_div") == "OFS"]

    result = []
    for row in rows:
        account = row.get("account_nm", "")
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


def _parse_float(val: Any) -> float | None:
    if val is None:
        return None
    text = str(val).replace(",", "").replace("%", "").strip()
    if not text or text == "-":
        return None
    try:
        return float(text)
    except (TypeError, ValueError):
        return None


def _safe_int(val: Any) -> int | None:
    parsed = _parse_float(val)
    if parsed is None:
        return None
    return int(round(parsed))


def _find_dividend_value(items: list[dict], label: str, field: str = "thstrm") -> str:
    row = next((item for item in items if item.get("se") == label), None)
    if not row:
        return ""
    return str(row.get(field, "")).strip()


def _pick_reference_date(items: list[dict]) -> str:
    for item in items:
        stlm_dt = str(item.get("stlm_dt", "")).strip()
        if stlm_dt:
            return stlm_dt
    return ""


def _normalize_korean_date(date_text: str) -> str | None:
    normalized = re.sub(r"[./]", "-", date_text.strip())
    match = re.search(r"(20\d{2})-(\d{1,2})-(\d{1,2})", normalized)
    if not match:
        return None
    year, month, day = match.groups()
    try:
        return datetime(int(year), int(month), int(day)).strftime("%Y-%m-%d")
    except ValueError:
        return None


def _extract_record_date_from_text(text: str) -> str | None:
    if not text:
        return None

    compact = re.sub(r"\s+", " ", text)
    for label in DIVIDEND_RECORD_DATE_LABELS:
        pattern = rf"{re.escape(label)}[^0-9]{{0,20}}(20\d{{2}}[./-]\d{{1,2}}[./-]\d{{1,2}}|20\d{{2}}년\s*\d{{1,2}}월\s*\d{{1,2}}일)"
        match = re.search(pattern, compact)
        if not match:
            continue
        raw_date = match.group(1)
        raw_date = raw_date.replace("년", "-").replace("월", "-").replace("일", "")
        parsed = _normalize_korean_date(raw_date)
        if parsed:
            return parsed
    return None


def _has_dividend_context(text: str) -> bool:
    compact = re.sub(r"\s+", "", text)
    return any(keyword in compact for keyword in DIVIDEND_CONTEXT_KEYWORDS)


async def _find_dividend_record_date(
    dart_client: DartClient,
    corp_code: str,
) -> str | None:
    history = await _find_dividend_record_date_history(dart_client, corp_code)
    if not history:
        return None
    return history[0]["record_date"]


async def _find_dividend_record_date_history(
    dart_client: DartClient,
    corp_code: str,
) -> list[dict]:
    async def _load() -> list[dict]:
        end = datetime.now().strftime("%Y%m%d")
        start = (datetime.now() - timedelta(days=900)).strftime("%Y%m%d")
        data = await dart_client.get_disclosure_list(
            corp_code=corp_code,
            bgn_de=start,
            end_de=end,
            page_count=100,
        )
        if data.get("status") != "000":
            return None

        disclosures = sorted(
            data.get("list", []),
            key=lambda item: item.get("rcept_dt", ""),
            reverse=True,
        )
        candidates: list[tuple[int, dict]] = []
        for item in disclosures:
            report_name = re.sub(r"\s+", "", str(item.get("report_nm", "")))
            if any(keyword in report_name for keyword in DIRECT_DIVIDEND_REPORT_KEYWORDS):
                candidates.append((0, item))
            elif "배당기준일" in report_name:
                candidates.append((1, item))
            elif any(keyword in report_name for keyword in DIVIDEND_RECORD_DATE_KEYWORDS):
                candidates.append((2, item))

        results: list[dict] = []
        seen_dates: set[str] = set()

        for priority, item in candidates[:12]:
            rcept_no = str(item.get("rcept_no", "")).strip()
            if not rcept_no:
                continue
            text = await dart_client.get_document_text(rcept_no)
            if priority >= 2 and not _has_dividend_context(text):
                continue
            record_date = _extract_record_date_from_text(text)
            if record_date:
                dedupe_key = f"{record_date}:{rcept_no}"
                if dedupe_key in seen_dates:
                    continue
                seen_dates.add(dedupe_key)
                results.append({
                    "record_date": record_date,
                    "year": record_date[:4],
                    "report_nm": str(item.get("report_nm", "")).strip(),
                    "rcept_dt": str(item.get("rcept_dt", "")).strip(),
                })

        results.sort(key=lambda item: item["record_date"], reverse=True)
        return results

    return await get_or_set(f"dividend:record-date-history:v2:{corp_code}", 21600, _load)


def _estimate_payout_frequency(record_date_history: list[dict]) -> tuple[int | None, str]:
    if not record_date_history:
        return None, "확인된 이력 부족"

    counts_by_year: dict[str, int] = {}
    current_year = datetime.now().year
    for item in record_date_history:
        year = item.get("year", "")
        if not year:
            continue
        if int(year) < current_year - RECENT_DIVIDEND_HISTORY_YEARS:
            continue
        counts_by_year[year] = counts_by_year.get(year, 0) + 1

    if not counts_by_year:
        return None, "확인된 이력 부족"

    frequency = max(counts_by_year.values())
    if frequency >= 4:
        return frequency, "분기배당 추정"
    if frequency == 2:
        return frequency, "반기배당 추정"
    if frequency == 1:
        return frequency, "연 1회 배당 추정"
    return frequency, "비정기 배당 추정"


def _build_dividend_year_summary(year_data: dict) -> dict | None:
    items = year_data.get("dividends", [])
    if not items:
        return None

    dps_raw = _find_dividend_value(items, "주당 현금배당금(원)")
    yield_raw = _find_dividend_value(items, "현금배당수익률(%)")
    payout_raw = _find_dividend_value(items, "현금배당성향(%)")
    record_date = _pick_reference_date(items)

    return {
        "year": year_data.get("year", ""),
        "record_date": record_date,
        "dps_raw": dps_raw,
        "dps": _safe_int(dps_raw) or 0,
        "yield_pct": _parse_float(yield_raw),
        "payout_pct": _parse_float(payout_raw),
    }


def _compare_dividend(latest: dict, previous: dict | None) -> str:
    latest_dps = latest.get("dps", 0)
    previous_dps = previous.get("dps", 0) if previous else None

    if latest_dps <= 0:
        return "no_dividend"
    if previous_dps is None:
        return "new"
    if previous_dps <= 0:
        return "new"
    if latest_dps > previous_dps:
        return "increase"
    if latest_dps < previous_dps:
        return "decrease"
    return "flat"


def build_dividend_calendar_event(
    corp_code: str,
    corp_name: str,
    stock_code: str,
    dividend_history: list[dict],
) -> dict | None:
    summaries = [
        summary
        for summary in (_build_dividend_year_summary(row) for row in dividend_history)
        if summary
    ]
    summaries.sort(key=lambda item: item.get("year", ""), reverse=True)

    if not summaries:
        return None

    latest = summaries[0]
    previous = summaries[1] if len(summaries) > 1 else None

    return {
        "corp_code": corp_code,
        "corp_name": corp_name,
        "stock_code": stock_code,
        "status": "unknown",
        "event_type": "record_date",
        "next_event_date": "",
        "recent_dps": latest.get("dps", 0),
        "recent_dps_raw": latest.get("dps_raw", ""),
        "yield_pct": latest.get("yield_pct"),
        "payout_pct": latest.get("payout_pct"),
        "change_vs_prev_year": _compare_dividend(latest, previous),
        "source_year": latest.get("year", ""),
        "reference_date": latest.get("record_date", ""),
        "note": "OpenDART 배당 데이터에서는 결산기준일만 확인되어, 실제 배당 기준일은 별도 공시 확인이 필요합니다.",
    }


async def build_dividend_calendar_event_with_record_date(
    dart_client: DartClient,
    corp_code: str,
    corp_name: str,
    stock_code: str,
    dividend_history: list[dict],
) -> dict | None:
    event = build_dividend_calendar_event(
        corp_code=corp_code,
        corp_name=corp_name,
        stock_code=stock_code,
        dividend_history=dividend_history,
    )
    if not event:
        return None

    record_date_history = await _find_dividend_record_date_history(dart_client, corp_code)
    if record_date_history:
        record_date = record_date_history[0]["record_date"]
        event["status"] = "confirmed"
        event["next_event_date"] = record_date
        event["note"] = "배당 관련 공시 본문에서 확인한 배당기준일입니다."
        event["last_confirmed_record_date"] = record_date
        latest_year = int(record_date[:4])
        previous_year = next(
            (item["record_date"] for item in record_date_history if item["year"] == str(latest_year - 1)),
            "",
        )
        event["previous_year_record_date"] = previous_year
        event["record_date_history"] = record_date_history[:6]
        frequency, cycle_label = _estimate_payout_frequency(record_date_history)
        event["payout_frequency_per_year"] = frequency
        event["payout_cycle_label"] = cycle_label
    else:
        event["last_confirmed_record_date"] = ""
        event["previous_year_record_date"] = ""
        event["record_date_history"] = []
        event["payout_frequency_per_year"] = None
        event["payout_cycle_label"] = "확인된 이력 부족"

    return event


async def get_watchlist_dividend_calendar(
    dart_client: DartClient,
    watchlist: list[dict],
    years: int = 5,
) -> list[dict]:
    async def _build(item: dict) -> dict | None:
        history = await get_dividend_history(dart_client, item["corp_code"], years=years)
        return await build_dividend_calendar_event_with_record_date(
            dart_client=dart_client,
            corp_code=item["corp_code"],
            corp_name=item["corp_name"],
            stock_code=item.get("stock_code", ""),
            dividend_history=history,
        )

    events = await asyncio.gather(*[_build(item) for item in watchlist])
    filtered = [event for event in events if event]
    filtered.sort(
        key=lambda event: (
            event.get("next_event_date", "9999-12-31") or "9999-12-31",
            DIVIDEND_CHANGE_ORDER.get(event.get("change_vs_prev_year", "unknown"), 99),
            event.get("corp_name", ""),
        )
    )
    return filtered


async def get_all_company_data(
    dart_client: DartClient, corp_code: str, years: int = 5,
) -> tuple[list[dict], list[dict], list[dict]]:
    """재무 + 배당 + 대주주를 한 번에 효율적으로 조회.

    1) DB에서 corp_code의 모든 캐시를 1번의 쿼리로 로드
    2) 캐시 미스인 항목만 DART API 병렬 호출
    3) 새로 가져온 데이터를 1번의 트랜잭션으로 일괄 저장
    """
    current_year = datetime.now().year
    year_list = [str(y) for y in range(current_year - years, current_year)]

    # 1) 캐시 일괄 로드 (DB 쿼리 1번)
    cache = await _batch_get_cached(corp_code)

    # 2) 캐시 히트/미스 분류
    financials_result: dict[str, list[dict]] = {}
    dividends_result: dict[str, list[dict]] = {}
    shareholders_result: list[dict] | None = None

    dart_tasks: list[tuple[str, str, str, asyncio.Task]] = []  # (type, year, reprt_code, task)

    for y in year_list:
        # 재무
        cached_fin = cache.get(("financial", y, "11011"))
        if cached_fin is not None:
            financials_result[y] = cached_fin
        else:
            task = asyncio.create_task(_fetch_dart(dart_client, "financial", corp_code, y))
            dart_tasks.append(("financial", y, "11011", task))

        # 배당
        cached_div = cache.get(("dividend", y, "11011"))
        if cached_div is not None:
            dividends_result[y] = cached_div
        else:
            task = asyncio.create_task(_fetch_dart(dart_client, "dividend", corp_code, y))
            dart_tasks.append(("dividend", y, "11011", task))

    # 대주주: 최신 연도 캐시 확인
    sh_tasks: list[tuple[str, asyncio.Task]] = []
    for y in range(current_year, current_year - 3, -1):
        cached_sh = cache.get(("shareholder", str(y), "11011"))
        if cached_sh is not None:
            shareholders_result = cached_sh
            break

    if shareholders_result is None:
        # 캐시 없으면 최근 3년 병렬 조회
        for y in range(current_year, current_year - 3, -1):
            task = asyncio.create_task(_fetch_dart(dart_client, "shareholder", corp_code, str(y)))
            sh_tasks.append((str(y), task))

    # 3) DART API 병렬 대기
    save_items: list[tuple[str, str, str, str, dict]] = []

    if dart_tasks:
        await asyncio.gather(*[t[3] for t in dart_tasks], return_exceptions=True)
        for data_type, year, reprt_code, task in dart_tasks:
            try:
                parsed = task.result()
            except Exception:
                logger.warning("Failed to fetch %s for %s/%s", data_type, corp_code, year)
                parsed = []

            if data_type == "financial":
                financials_result[year] = parsed
            else:
                dividends_result[year] = parsed

            save_items.append((corp_code, data_type, year, reprt_code, parsed))

    # 대주주 결과 처리
    if shareholders_result is None:
        for y_str, task in sh_tasks:
            try:
                await task
                parsed = task.result()
            except Exception:
                logger.warning("Failed to fetch shareholders for %s/%s", corp_code, y_str)
                parsed = []

            if parsed:
                shareholders_result = parsed
                save_items.append((corp_code, "shareholder", y_str, "11011", parsed))
                # 나머지 태스크 취소
                for _, remaining_task in sh_tasks:
                    if remaining_task is not task and not remaining_task.done():
                        remaining_task.cancel()
                break

        if shareholders_result is None:
            shareholders_result = []

    # 4) 새 데이터 일괄 저장 (DB 트랜잭션 1번)
    if save_items:
        try:
            await _batch_save_cache(save_items)
        except Exception:
            logger.warning("Failed to batch save cache for %s", corp_code)

    # 결과 조립
    financials = [{"year": y, "accounts": financials_result.get(y, [])} for y in year_list]
    dividends = [{"year": y, "dividends": dividends_result.get(y, [])} for y in year_list]

    return financials, dividends, shareholders_result


async def _fetch_dart(dart_client: DartClient, data_type: str, corp_code: str, bsns_year: str) -> list[dict]:
    """DART API 호출 + 파싱"""
    if data_type == "financial":
        raw = await dart_client.get_financial_statements(corp_code, bsns_year)
        return _parse_financial_statements(raw)
    elif data_type == "dividend":
        raw = await dart_client.get_dividends(corp_code, bsns_year)
        return _parse_dividends(raw)
    elif data_type == "shareholder":
        raw = await dart_client.get_major_shareholders(corp_code, bsns_year)
        return _parse_shareholders(raw)
    return []


# --- 개별 API용 (하위호환) ---

async def get_financial_summary(dart_client: DartClient, corp_code: str, years: int = 5) -> list[dict]:
    current_year = datetime.now().year
    year_list = [str(y) for y in range(current_year - years, current_year)]
    cache = await _batch_get_cached(corp_code)

    async def _fetch_one(bsns_year: str) -> dict:
        cached = cache.get(("financial", bsns_year, "11011"))
        if cached is not None:
            return {"year": bsns_year, "accounts": cached}
        try:
            parsed = await _fetch_dart(dart_client, "financial", corp_code, bsns_year)
            await _save_cache(corp_code, "financial", bsns_year, "11011", parsed)
            return {"year": bsns_year, "accounts": parsed}
        except Exception:
            logger.warning("Failed to fetch financials for %s/%s", corp_code, bsns_year)
            return {"year": bsns_year, "accounts": []}

    return await asyncio.gather(*[_fetch_one(y) for y in year_list])


async def get_dividend_history(dart_client: DartClient, corp_code: str, years: int = 5) -> list[dict]:
    current_year = datetime.now().year
    year_list = [str(y) for y in range(current_year - years, current_year)]
    cache = await _batch_get_cached(corp_code)

    async def _fetch_one(bsns_year: str) -> dict:
        cached = cache.get(("dividend", bsns_year, "11011"))
        if cached is not None:
            return {"year": bsns_year, "dividends": cached}
        try:
            parsed = await _fetch_dart(dart_client, "dividend", corp_code, bsns_year)
            await _save_cache(corp_code, "dividend", bsns_year, "11011", parsed)
            return {"year": bsns_year, "dividends": parsed}
        except Exception:
            logger.warning("Failed to fetch dividends for %s/%s", corp_code, bsns_year)
            return {"year": bsns_year, "dividends": []}

    return await asyncio.gather(*[_fetch_one(y) for y in year_list])


async def get_shareholders(dart_client: DartClient, corp_code: str) -> list[dict]:
    current_year = datetime.now().year
    cache = await _batch_get_cached(corp_code)

    for year in range(current_year, current_year - 3, -1):
        bsns_year = str(year)
        cached = cache.get(("shareholder", bsns_year, "11011"))
        if cached is not None:
            return cached
        try:
            parsed = await _fetch_dart(dart_client, "shareholder", corp_code, bsns_year)
            if parsed:
                await _save_cache(corp_code, "shareholder", bsns_year, "11011", parsed)
                return parsed
        except Exception:
            logger.warning("Failed to fetch shareholders for %s/%s", corp_code, bsns_year)

    return []
