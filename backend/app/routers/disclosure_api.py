"""공시 피드 API"""
from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Query, Depends

from app.config import settings
from app.dependencies import get_current_user
from app.models.user import User
from app.services.dart_client import DartClient
from app.services.disclosure_filter import get_watchlist_disclosures
from app.services.analysis_cache import get_cached_analysis, get_cached_full, save_analysis, search_similar
from app.services.settings import load_settings
from app.services.telegram import send_alert, format_disclosure_alert
from app.agents.runner import analyze_disclosure

logger = logging.getLogger(__name__)

router = APIRouter()

CONCURRENT_ANALYSIS_LIMIT = 5
_background_tasks: set[asyncio.Task] = set()
_analyzing_rcept_nos: set[str] = set()  # 현재 분석 중인 공시 번호


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
        d["analysis"] = cached
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
        d["analysis"] = analysis
    except Exception:
        logger.exception("AI analysis failed for %s: %s", d.get("corp_name", ""), d.get("report_nm", ""))
        # 실패해도 DB에 저장해서 무한 재시도 방지
        fallback = {
            "category": "단순정보",
            "importance_score": 0,
            "summary": "AI 분석을 수행할 수 없습니다.",
            "action_item": "원문을 직접 확인하세요.",
        }
        if rcept_no:
            await save_analysis(rcept_no, fallback, metadata={
                "rcept_dt": d.get("rcept_dt", ""),
                "corp_name": d.get("corp_name", ""),
                "report_nm": d.get("report_nm", ""),
            })
        d["analysis"] = fallback

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

    sem = asyncio.Semaphore(CONCURRENT_ANALYSIS_LIMIT)

    user_settings = await load_settings(user_id)
    tg_enabled = user_settings.get("telegram_enabled", False)
    tg_chat_id = user_settings.get("telegram_chat_id", "")
    tg_categories = user_settings.get("alert_categories", [])
    tg_min_score = user_settings.get("min_importance_score", 0)

    async def _limited(d: dict) -> None:
        rcept_no = d.get("rcept_no", "")
        try:
            async with sem:
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


@router.get("/count")
async def get_disclosure_count(since: str = Query(None), user: User = Depends(get_current_user)):
    dart_client = DartClient(api_key=settings.dart_api_key)
    disclosures = await get_watchlist_disclosures(dart_client, days=7, user_id=user.id)
    if since:
        disclosures = [d for d in disclosures if d.get("rcept_dt", "") >= since]
    return {"count": len(disclosures)}


@router.get("/{rcept_no}/similar")
async def get_similar_disclosures(rcept_no: str, limit: int = Query(5, ge=1, le=20)):
    cached = await get_cached_full(rcept_no)
    if not cached:
        return {"similar": []}
    analysis = cached.get("analysis", {})
    category = analysis.get("category", "")
    report_nm = cached.get("report_nm", "")
    stop_words = {"의", "및", "등", "에", "을", "를", "이", "가", "은", "는", "로", "과", "와"}
    keywords = [w for w in report_nm.split() if len(w) > 2 and w not in stop_words]
    if not category or not keywords:
        return {"similar": []}
    results = await search_similar(category, keywords, exclude_rcept_no=rcept_no, limit=limit)
    return {"similar": results}


@router.get("")
async def get_disclosures(
    days: int = Query(7, ge=1, le=30),
    category: str = Query(None, description="호재/악재/중립/단순정보"),
    min_score: int = Query(0, ge=0, le=100),
    user: User = Depends(get_current_user),
):
    dart_client = DartClient(api_key=settings.dart_api_key)
    disclosures = await get_watchlist_disclosures(dart_client, days=days, user_id=user.id)

    # 분석 캐시를 병렬로 조회
    async def _get_analysis(rcept_no: str):
        if not rcept_no:
            return None
        return await get_cached_analysis(rcept_no)

    cached_results = await asyncio.gather(*[_get_analysis(d.get("rcept_no", "")) for d in disclosures])

    pending = []
    for d, cached in zip(disclosures, cached_results):
        d["analysis"] = cached
        if cached is None:
            pending.append(d)

    if pending:
        task = asyncio.create_task(_analyze_batch(pending, user.id))
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)

    results = list(disclosures)

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
