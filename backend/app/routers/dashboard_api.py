"""대시보드 집계 API"""
from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Query, Depends

from app.config import settings
from app.dependencies import get_current_user
from app.models.user import User
from app.services.dart_client import DartClient
from app.services.disclosure_filter import get_watchlist_disclosures
from app.services.watchlist import load_watchlist
from app.services.analysis_cache import get_cached_analysis
from app.services.dart_cache import get_cached_disclosures, set_cached_disclosures

router = APIRouter()


async def _attach_analyses(disclosures: list[dict]) -> None:
    """공시 목록에 캐시된 분석 결과를 병렬로 붙인다."""
    async def _get(rcept_no: str):
        if not rcept_no:
            return None
        return await get_cached_analysis(rcept_no)

    results = await asyncio.gather(*[_get(d.get("rcept_no", "")) for d in disclosures])
    for d, cached in zip(disclosures, results):
        if cached:
            d["analysis"] = cached


@router.get("/public")
async def get_public_summary():
    dart_client = DartClient(api_key=settings.dart_api_key)
    today = datetime.now().strftime("%Y%m%d")
    start = (datetime.now() - timedelta(days=7)).strftime("%Y%m%d")
    cache_key = f"public_{start}_{today}"

    cached_list = await get_cached_disclosures(cache_key)
    if cached_list is None:
        cached_list = await dart_client.get_all_disclosures(bgn_de=start, end_de=today)
        await set_cached_disclosures(cache_key, cached_list)

    disclosures = list(cached_list)
    await _attach_analyses(disclosures)

    bullish = 0
    bearish = 0
    important = []

    for d in disclosures:
        cached = d.get("analysis")
        if cached:
            cat = cached.get("category", "")
            score = cached.get("importance_score", 0)
            if cat == "호재":
                bullish += 1
            elif cat == "악재":
                bearish += 1
            if score >= 50:
                important.append(d)

    return {
        "watchlist_count": 0,
        "today_disclosures": len(disclosures),
        "bullish": bullish,
        "bearish": bearish,
        "important_disclosures": important[:5],
        "recent_disclosures": disclosures[:10],
    }


@router.get("/summary")
async def get_summary(user: User = Depends(get_current_user)):
    watchlist = await load_watchlist(user.id)
    dart_client = DartClient(api_key=settings.dart_api_key)

    disclosures = await get_watchlist_disclosures(dart_client, days=7, watchlist=watchlist) if watchlist else []

    await _attach_analyses(disclosures)

    bullish = 0
    bearish = 0
    important = []

    for d in disclosures:
        cached = d.get("analysis")
        if cached:
            cat = cached.get("category", "")
            score = cached.get("importance_score", 0)
            if cat == "호재":
                bullish += 1
            elif cat == "악재":
                bearish += 1
            if score >= 50:
                important.append(d)

    return {
        "watchlist_count": len(watchlist),
        "today_disclosures": len(disclosures),
        "bullish": bullish,
        "bearish": bearish,
        "important_disclosures": important[:5],
        "recent_disclosures": disclosures[:10],
    }


@router.get("/history")
async def get_history(days: int = Query(30, ge=1, le=90), user: User = Depends(get_current_user)):
    watchlist = await load_watchlist(user.id)
    if not watchlist:
        return {"history": []}

    dart_client = DartClient(api_key=settings.dart_api_key)
    disclosures = await get_watchlist_disclosures(dart_client, days=days, watchlist=watchlist)

    await _attach_analyses(disclosures)

    by_date: dict[str, list[dict]] = defaultdict(list)
    for d in disclosures:
        dt = d.get("rcept_dt", "")
        if dt:
            by_date[dt].append(d)

    history = []
    for date in sorted(by_date.keys()):
        items = by_date[date]
        analyses = [i["analysis"] for i in items if i.get("analysis")]
        scores = [a.get("importance_score", 0) for a in analyses]
        avg_score = round(sum(scores) / len(scores)) if scores else 0
        bullish = sum(1 for a in analyses if a.get("category") == "호재")
        bearish = sum(1 for a in analyses if a.get("category") == "악재")
        history.append({
            "date": date,
            "count": len(items),
            "avg_score": avg_score,
            "bullish": bullish,
            "bearish": bearish,
        })
    return {"history": history}
