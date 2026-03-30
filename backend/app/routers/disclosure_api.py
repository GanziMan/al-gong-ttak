"""공시 피드 API"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Query, Depends

from app.config import settings
from app.dependencies import get_current_user
from app.models.user import User
from app.services.dart_client import DartClient
from app.services.disclosure_filter import get_watchlist_disclosures
from app.services.analysis_cache import get_cached_analysis, get_cached_analyses, get_cached_full, save_analysis
from app.services.dart_cache import get_cached_disclosures, set_cached_disclosures
from app.services.settings import load_settings
from app.services.telegram import send_alert, format_disclosure_alert
from app.services.stock_price import calculate_price_impact
from app.services.corp_code_loader import get_corp_by_name
from app.agents.runner import analyze_disclosure

logger = logging.getLogger(__name__)

router = APIRouter()

CONCURRENT_ANALYSIS_LIMIT = 5
_background_tasks: set[asyncio.Task] = set()
_analyzing_rcept_nos: set[str] = set()  # 현재 분석 중인 공시 번호
_analysis_semaphore = asyncio.Semaphore(CONCURRENT_ANALYSIS_LIMIT)


def _normalize_action_item(category: str, action_item: str) -> str:
    text = (action_item or "").strip()
    banned_phrases = [
        "별도 대응 불필요",
        "대응은 불필요",
        "판단하기 어렵",
        "영향은 제한적이므로",
        "직접적인 영향은 제한적이므로",
    ]
    if any(p in text for p in banned_phrases):
        if category == "단순정보":
            return "정기 공시 제출 건입니다. 핵심 지표 변동 여부를 함께 확인하세요."
        return "핵심 공시 수치와 후속 공시 여부를 확인하며 보수적으로 대응하세요."
    return text or "핵심 공시 수치와 후속 공시 여부를 확인하세요."


def _normalize_analysis(analysis: dict | None) -> dict | None:
    if not analysis:
        return analysis
    normalized = dict(analysis)
    category = normalized.get("category", "단순정보")
    normalized["action_item"] = _normalize_action_item(category, normalized.get("action_item", ""))
    return normalized


def _to_preview_item(disclosure: dict) -> dict:
    analysis = disclosure.get("analysis")
    return {
        "rcept_no": disclosure.get("rcept_no", ""),
        "rcept_dt": disclosure.get("rcept_dt", ""),
        "corp_name": disclosure.get("corp_name", ""),
        "corp_code": disclosure.get("corp_code", ""),
        "report_nm": disclosure.get("report_nm", ""),
        "analysis": (
            {
                "category": analysis.get("category", ""),
                "importance_score": analysis.get("importance_score", 0),
                "summary": analysis.get("summary", ""),
                "action_item": analysis.get("action_item", ""),
            }
            if analysis
            else None
        ),
    }


async def _fetch_document_text(rcept_no: str) -> str:
    """공시 본문 텍스트를 DART에서 가져온다."""
    if not rcept_no:
        return ""
    try:
        dart_client = DartClient(api_key=settings.dart_api_key)
        text = await dart_client.get_document_text(rcept_no)
        if text:
            logger.info("Fetched document text for %s (%d chars)", rcept_no, len(text))
        return text
    except Exception:
        logger.warning("Failed to fetch document for %s", rcept_no)
        return ""


async def _enrich_one(d: dict) -> dict:
    """단일 공시에 AI 분석 결과를 붙인다 (캐시 우선)."""
    rcept_no = d.get("rcept_no", "")
    cached = (await get_cached_analysis(rcept_no)) if rcept_no else None

    if cached:
        d["analysis"] = _normalize_analysis(cached)
        return d

    try:
        title = d.get("report_nm", "")
        # 공시 본문 가져오기
        doc_text = await _fetch_document_text(rcept_no)
        if doc_text:
            content = doc_text
        else:
            content = f"{d.get('corp_name', '')} {title} (접수일: {d.get('rcept_dt', '')})"
        analysis = await analyze_disclosure(
            corp_name=d.get("corp_name", ""),
            title=title,
            content=content,
        )
        if rcept_no:
            await save_analysis(rcept_no, analysis, metadata={
                "rcept_dt": d.get("rcept_dt", ""),
                "corp_name": d.get("corp_name", ""),
                "report_nm": d.get("report_nm", ""),
            })
        d["analysis"] = _normalize_analysis(analysis)
    except Exception:
        logger.exception("AI analysis failed for %s: %s", d.get("corp_name", ""), d.get("report_nm", ""))
        # 실패해도 DB에 저장해서 무한 재시도 방지
        fallback = {
            "category": "단순정보",
            "importance_score": 0,
            "summary": "공시 핵심 항목을 자동 요약하지 못했습니다. 제목과 접수일 기준 기본 정보만 제공됩니다.",
            "action_item": "공시 원문의 재무 수치·자금조달 조건·확정 여부를 우선 확인하세요.",
        }
        if rcept_no:
            await save_analysis(rcept_no, fallback, metadata={
                "rcept_dt": d.get("rcept_dt", ""),
                "corp_name": d.get("corp_name", ""),
                "report_nm": d.get("report_nm", ""),
            })
        d["analysis"] = _normalize_analysis(fallback)

    return d


async def _analyze_batch(disclosures: list[dict], user_id: int) -> None:
    """백그라운드에서 미분석 공시를 배치 처리한다."""
    # 이미 분석 중인 공시 제외
    to_analyze = [d for d in disclosures if d.get("rcept_no", "") not in _analyzing_rcept_nos]
    if not to_analyze:
        return

    rcept_nos = {d.get("rcept_no", "") for d in to_analyze}
    _analyzing_rcept_nos.update(rcept_nos)
    logger.info("Background analysis started for %d disclosures (skipped %d in-progress)",
                len(to_analyze), len(disclosures) - len(to_analyze))

    user_settings = await load_settings(user_id)
    tg_enabled = user_settings.get("telegram_enabled", False)
    tg_chat_id = user_settings.get("telegram_chat_id", "")
    tg_categories = user_settings.get("alert_categories", [])
    tg_min_score = user_settings.get("min_importance_score", 0)

    async def _limited(d: dict) -> None:
        rcept_no = d.get("rcept_no", "")
        try:
            async with _analysis_semaphore:
                await _enrich_one(d)
                analysis = d.get("analysis")
                if (
                    tg_enabled
                    and tg_chat_id
                    and settings.telegram_bot_token
                    and analysis
                ):
                    cat = analysis.get("category", "")
                    score = analysis.get("importance_score", 0)
                    if cat in tg_categories and score >= tg_min_score:
                        msg = format_disclosure_alert(
                            corp_name=d.get("corp_name", ""),
                            title=d.get("report_nm", ""),
                            category=cat,
                            importance=score,
                            summary=analysis.get("summary", ""),
                            action_item=analysis.get("action_item", ""),
                            rcept_no=d.get("rcept_no", ""),
                        )
                        await send_alert(settings.telegram_bot_token, tg_chat_id, msg)
        finally:
            _analyzing_rcept_nos.discard(rcept_no)

    try:
        await asyncio.gather(*[_limited(d) for d in to_analyze])
        logger.info("Background analysis completed")
    except Exception:
        logger.exception("Background analysis failed")


async def _analyze_batch_public(disclosures: list[dict]) -> None:
    """백그라운드에서 미분석 공시를 배치 처리 (public, 텔레그램 없음)."""
    to_analyze = [d for d in disclosures if d.get("rcept_no", "") not in _analyzing_rcept_nos]
    if not to_analyze:
        return

    rcept_nos = {d.get("rcept_no", "") for d in to_analyze}
    _analyzing_rcept_nos.update(rcept_nos)
    logger.info("Public background analysis started for %d disclosures", len(to_analyze))

    async def _limited(d: dict) -> None:
        rcept_no = d.get("rcept_no", "")
        try:
            async with _analysis_semaphore:
                await _enrich_one(d)
        finally:
            _analyzing_rcept_nos.discard(rcept_no)

    try:
        await asyncio.gather(*[_limited(d) for d in to_analyze])
        logger.info("Public background analysis completed")
    except Exception:
        logger.exception("Public background analysis failed")


@router.get("/count")
async def get_disclosure_count(since: str = Query(None), user: User = Depends(get_current_user)):
    dart_client = DartClient(api_key=settings.dart_api_key)
    disclosures = await get_watchlist_disclosures(dart_client, days=7, user_id=user.id)
    if since:
        disclosures = [d for d in disclosures if d.get("rcept_dt", "") >= since]
    return {"count": len(disclosures)}


@router.get("/public")
async def get_public_disclosures(
    days: int = Query(7, ge=1, le=30),
    category: str = Query(None, description="호재/악재/중립/단순정보"),
    min_score: int = Query(0, ge=0, le=100),
    corp_code: str = Query(None, description="특정 기업 코드로 필터링"),
):
    return await _get_public_disclosures_impl(
        days=days,
        category=category,
        min_score=min_score,
        corp_code=corp_code,
    )


async def _get_public_disclosures_impl(
    days: int,
    category: str | None = None,
    min_score: int = 0,
    corp_code: str | None = None,
):
    dart_client = DartClient(api_key=settings.dart_api_key)
    now = datetime.now()
    today = now.strftime("%Y%m%d")
    start = (now - timedelta(days=days)).strftime("%Y%m%d")

    if corp_code:
        # 특정 종목: DART API에 corp_code 직접 전달
        cache_key = f"public_{corp_code}_{start}_{today}"
        cached_list = await get_cached_disclosures(cache_key)
        if cached_list is None:
            try:
                data = await dart_client.get_disclosure_list(
                    corp_code=corp_code, bgn_de=start, end_de=today, page_count=100
                )
                cached_list = data.get("list", []) if data.get("status") == "000" else []
            except Exception:
                logger.exception("Public disclosures corp_code query failed: %s", corp_code)
                # 폴백: 전체 공시 조회 후 corp_code 필터
                try:
                    all_list = await dart_client.get_all_disclosures(bgn_de=start, end_de=today)
                    cached_list = [d for d in all_list if d.get("corp_code") == corp_code]
                except Exception:
                    logger.exception("Public disclosures fallback(all->filter) failed: %s", corp_code)
                    cached_list = []
            await set_cached_disclosures(cache_key, cached_list)
    else:
        # 전체 공시
        cache_key = f"public_{start}_{today}"
        cached_list = await get_cached_disclosures(cache_key)
        if cached_list is None:
            cached_list = await dart_client.get_all_disclosures(bgn_de=start, end_de=today)
            await set_cached_disclosures(cache_key, cached_list)

    disclosures = list(cached_list)

    analysis_map = await get_cached_analyses([d.get("rcept_no", "") for d in disclosures])

    pending = []
    for d in disclosures:
        cached = analysis_map.get(d.get("rcept_no", ""))
        d["analysis"] = _normalize_analysis(cached)
        if cached is None:
            pending.append(d)

    if pending:
        task = asyncio.create_task(_analyze_batch_public(pending))
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)

    results = list(disclosures)

    if category:
        results = [d for d in results if d.get("analysis") and d["analysis"].get("category") == category]
    if min_score > 0:
        results = [d for d in results if d.get("analysis") and d["analysis"].get("importance_score", 0) >= min_score]

    return {
        "disclosures": results,
        "total": len(results),
        "pending_analysis": len(pending),
    }


@router.get("/public/preview")
async def get_public_disclosures_preview(
    days: int = Query(3, ge=1, le=30),
    limit: int = Query(10, ge=1, le=20),
):
    data = await _get_public_disclosures_impl(days=days)
    return {
        "disclosures": [_to_preview_item(d) for d in data["disclosures"][:limit]],
        "total": data["total"],
        "pending_analysis": data["pending_analysis"],
    }


@router.get("/{rcept_no}/price-impact")
async def get_price_impact(rcept_no: str):
    cached = await get_cached_full(rcept_no)
    if not cached:
        return {"impact": None}
    corp_name = cached.get("corp_name", "")
    rcept_dt = cached.get("rcept_dt", "")
    corp_info = get_corp_by_name(corp_name)
    stock_code = corp_info["stock_code"] if corp_info else ""
    corp_code = corp_info["corp_code"] if corp_info else ""
    if not stock_code or not rcept_dt:
        return {"impact": None}
    impact = await calculate_price_impact(stock_code, corp_code, rcept_dt)
    return {"impact": impact}


@router.get("")
async def get_disclosures(
    days: int = Query(7, ge=1, le=30),
    category: str = Query(None, description="호재/악재/중립/단순정보"),
    min_score: int = Query(0, ge=0, le=100),
    corp_code: str = Query(None, description="특정 기업 코드로 필터링"),
    user: User = Depends(get_current_user),
):
    dart_client = DartClient(api_key=settings.dart_api_key)
    disclosures = await get_watchlist_disclosures(dart_client, days=days, user_id=user.id)

    analysis_map = await get_cached_analyses([d.get("rcept_no", "") for d in disclosures])

    pending = []
    for d in disclosures:
        cached = analysis_map.get(d.get("rcept_no", ""))
        d["analysis"] = _normalize_analysis(cached)
        if cached is None:
            pending.append(d)

    if pending:
        task = asyncio.create_task(_analyze_batch(pending, user.id))
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)

    results = list(disclosures)

    if corp_code:
        results = [d for d in results if d.get("corp_code") == corp_code]
    if category:
        results = [
            d for d in results
            if d.get("analysis") and d["analysis"].get("category") == category
        ]
    if min_score > 0:
        results = [
            d for d in results
            if d.get("analysis") and d["analysis"].get("importance_score", 0) >= min_score
        ]

    return {
        "disclosures": results,
        "total": len(results),
        "pending_analysis": len(pending),
    }
