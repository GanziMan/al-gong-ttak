"""공시 피드 API"""
import asyncio

from fastapi import APIRouter, Query

from app.config import settings
from app.services.dart_client import DartClient
from app.services.disclosure_filter import get_watchlist_disclosures
from app.services.analysis_cache import get_cached_analysis, save_analysis
from app.agents.runner import analyze_disclosure

router = APIRouter()

CONCURRENT_ANALYSIS_LIMIT = 5


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


@router.get("")
async def get_disclosures(
    days: int = Query(7, ge=1, le=30),
    category: str = Query(None, description="호재/악재/중립/단순정보"),
    min_score: int = Query(0, ge=0, le=100),
):
    dart_client = DartClient(api_key=settings.dart_api_key)
    disclosures = await get_watchlist_disclosures(dart_client, days=days)

    # 세마포어로 동시 AI 호출 수 제한하며 병렬 처리
    sem = asyncio.Semaphore(CONCURRENT_ANALYSIS_LIMIT)

    async def _limited(d: dict) -> dict:
        async with sem:
            return await _enrich_one(d)

    enriched = await asyncio.gather(*[_limited(d) for d in disclosures])

    results = list(enriched)

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

    return {"disclosures": results, "total": len(results)}
