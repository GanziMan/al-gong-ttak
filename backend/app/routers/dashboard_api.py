"""대시보드 집계 API"""
from fastapi import APIRouter

from app.config import settings
from app.services.dart_client import DartClient
from app.services.disclosure_filter import get_watchlist_disclosures
from app.services.watchlist import load_watchlist
from app.services.analysis_cache import get_cached_analysis

router = APIRouter()


@router.get("/summary")
async def get_summary():
    watchlist = load_watchlist()
    dart_client = DartClient(api_key=settings.dart_api_key)

    disclosures = await get_watchlist_disclosures(dart_client, days=1) if watchlist else []

    bullish = 0
    bearish = 0
    important = []

    for d in disclosures:
        rcept_no = d.get("rcept_no", "")
        cached = get_cached_analysis(rcept_no) if rcept_no else None
        if cached:
            d["analysis"] = cached
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
