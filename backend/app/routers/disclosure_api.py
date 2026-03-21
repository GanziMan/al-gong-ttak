"""공시 피드 API"""
from __future__ import annotations

import asyncio

import logging

from fastapi import APIRouter, Query

from app.config import settings
from app.services.dart_client import DartClient
from app.services.disclosure_filter import get_watchlist_disclosures
from app.services.analysis_cache import get_cached_analysis, save_analysis
from app.agents.runner import analyze_disclosure

logger = logging.getLogger(__name__)

router = APIRouter()

CONCURRENT_ANALYSIS_LIMIT = 5
_background_tasks: set[asyncio.Task] = set()


async def _enrich_one(d: dict) -> dict:
    """단일 공시에 AI 분석 결과를 붙인다 (캐시 우선)."""
    rcept_no = d.get("rcept_no", "")
    cached = get_cached_analysis(rcept_no) if rcept_no else None

    if cached:
        d["analysis"] = cached
        return d

    try:
        title = d.get("report_nm", "")
        content = f"{d.get('corp_name', '')} {title} (접수일: {d.get('rcept_dt', '')})"
        analysis = await analyze_disclosure(
            corp_name=d.get("corp_name", ""),
            title=title,
            content=content,
        )
        if rcept_no:
            save_analysis(rcept_no, analysis)
        d["analysis"] = analysis
    except Exception:
        d["analysis"] = None

    return d


async def _analyze_batch(disclosures: list[dict]) -> None:
    """백그라운드에서 미분석 공시를 배치 처리한다."""
    logger.info("Background analysis started for %d disclosures", len(disclosures))
    sem = asyncio.Semaphore(CONCURRENT_ANALYSIS_LIMIT)

    async def _limited(d: dict) -> None:
        async with sem:
            await _enrich_one(d)

    try:
        await asyncio.gather(*[_limited(d) for d in disclosures])
        logger.info("Background analysis completed")
    except Exception:
        logger.exception("Background analysis failed")


@router.get("")
async def get_disclosures(
    days: int = Query(7, ge=1, le=30),
    category: str = Query(None, description="호재/악재/중립/단순정보"),
    min_score: int = Query(0, ge=0, le=100),
):
    dart_client = DartClient(api_key=settings.dart_api_key)
    disclosures = await get_watchlist_disclosures(dart_client, days=days)

    # 즉시 반환: 캐시된 분석만 첨부
    pending = []
    for d in disclosures:
        rcept_no = d.get("rcept_no", "")
        cached = get_cached_analysis(rcept_no) if rcept_no else None
        d["analysis"] = cached  # None if not cached
        if cached is None:
            pending.append(d)

    # 미분석 건은 백그라운드 태스크로 처리 (fire-and-forget)
    if pending:
        task = asyncio.create_task(_analyze_batch(pending))
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
