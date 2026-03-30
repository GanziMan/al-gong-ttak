"""대시보드 집계 API"""
from __future__ import annotations
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Query, Depends

from app.config import settings
from app.dependencies import get_current_user
from app.models.user import User
from app.services.briefing import generate_daily_briefing
from app.services.dart_client import DartClient
from app.services.analysis_cache import get_cached_analyses
from app.services.dart_cache import get_cached_disclosures, set_cached_disclosures
from app.services.response_cache import get_or_set
from app.services.user_snapshot import get_user_watchlist_disclosures_snapshot

router = APIRouter()
SUMMARY_WINDOW_DAYS = 7
DEFAULT_HISTORY_DAYS = 14


async def _attach_analyses(disclosures: list[dict]) -> None:
    """공시 목록에 캐시된 분석 결과를 병렬로 붙인다."""
    analysis_map = await get_cached_analyses([d.get("rcept_no", "") for d in disclosures])
    for d in disclosures:
        cached = analysis_map.get(d.get("rcept_no", ""))
        if cached:
            d["analysis"] = cached


def _filter_recent_disclosures(disclosures: list[dict], days: int) -> list[dict]:
    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y%m%d")
    return [d for d in disclosures if (d.get("rcept_dt", "") or "") >= cutoff]


def _build_summary_payload(watchlist: list[dict], disclosures: list[dict]) -> dict:
    bullish = 0
    bearish = 0
    important = []

    for disclosure in disclosures:
        cached = disclosure.get("analysis")
        if not cached:
            continue
        cat = cached.get("category", "")
        score = cached.get("importance_score", 0)
        if cat == "호재":
            bullish += 1
        elif cat == "악재":
            bearish += 1
        if score >= 50:
            important.append(disclosure)

    return {
        "watchlist_count": len(watchlist),
        "today_disclosures": len(disclosures),
        "bullish": bullish,
        "bearish": bearish,
        "important_disclosures": important[:5],
        "recent_disclosures": disclosures[:10],
    }


def _build_history_payload(disclosures: list[dict]) -> dict:
    by_date: dict[str, list[dict]] = defaultdict(list)
    for disclosure in disclosures:
        dt = disclosure.get("rcept_dt", "")
        if dt:
            by_date[dt].append(disclosure)

    history = []
    for date in sorted(by_date.keys()):
        items = by_date[date]
        analyses = [item["analysis"] for item in items if item.get("analysis")]
        scores = [analysis.get("importance_score", 0) for analysis in analyses]
        avg_score = round(sum(scores) / len(scores)) if scores else 0
        bullish = sum(1 for analysis in analyses if analysis.get("category") == "호재")
        bearish = sum(1 for analysis in analyses if analysis.get("category") == "악재")
        history.append({
            "date": date,
            "count": len(items),
            "avg_score": avg_score,
            "bullish": bullish,
            "bearish": bearish,
        })
    return {"history": history}


@router.get("/public")
async def get_public_summary():
    async def _load():
        dart_client = DartClient(api_key=settings.dart_api_key)
        now = datetime.now()
        today = now.strftime("%Y%m%d")
        start = (now - timedelta(days=7)).strftime("%Y%m%d")
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

    return await get_or_set("dashboard:public", 30, _load)


@router.get("/summary")
async def get_summary(user: User = Depends(get_current_user)):
    async def _load():
        snapshot = await get_user_watchlist_disclosures_snapshot(user.id, days=DEFAULT_HISTORY_DAYS)
        watchlist = snapshot["watchlist"]
        disclosures = _filter_recent_disclosures(snapshot["disclosures"], SUMMARY_WINDOW_DAYS)
        return _build_summary_payload(watchlist, disclosures)

    return await get_or_set(f"dashboard:summary:{user.id}", 20, _load)


@router.get("/history")
async def get_history(days: int = Query(30, ge=1, le=90), user: User = Depends(get_current_user)):
    async def _load():
        snapshot = await get_user_watchlist_disclosures_snapshot(user.id, days=days)
        watchlist = snapshot["watchlist"]
        if not watchlist:
            return {"history": []}

        return _build_history_payload(snapshot["disclosures"])

    return await get_or_set(f"dashboard:history:{user.id}:{days}", 30, _load)


@router.get("/bootstrap")
async def get_dashboard_bootstrap(
    history_days: int = Query(DEFAULT_HISTORY_DAYS, ge=7, le=30),
    user: User = Depends(get_current_user),
):
    async def _load():
        snapshot = await get_user_watchlist_disclosures_snapshot(user.id, days=history_days)
        watchlist = snapshot["watchlist"]
        disclosures = snapshot["disclosures"]
        summary = _build_summary_payload(
            watchlist,
            _filter_recent_disclosures(disclosures, SUMMARY_WINDOW_DAYS),
        )
        history = _build_history_payload(disclosures)
        briefing = await generate_daily_briefing(user.id)
        return {
            "summary": summary,
            "history": history["history"],
            "briefing": briefing,
        }

    return await get_or_set(f"dashboard:bootstrap:{user.id}:{history_days}", 20, _load)
