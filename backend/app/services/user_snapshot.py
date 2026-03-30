"""사용자별 개인화 응답 스냅샷 캐시"""
from __future__ import annotations

import logging

from app.config import settings
from app.services.analysis_cache import get_cached_analyses
from app.services.dart_client import DartClient
from app.services.disclosure_filter import get_watchlist_disclosures
from app.services.financial_data import get_watchlist_dividend_calendar
from app.services.response_cache import get_or_set
from app.services.watchlist import load_watchlist

DISCLOSURE_SNAPSHOT_TTL_SECONDS = 20
OVERVIEW_SNAPSHOT_TTL_SECONDS = 30
logger = logging.getLogger(__name__)


async def _attach_cached_analyses(disclosures: list[dict]) -> None:
    analysis_map = await get_cached_analyses([d.get("rcept_no", "") for d in disclosures])
    for disclosure in disclosures:
        cached = analysis_map.get(disclosure.get("rcept_no", ""))
        if cached:
            disclosure["analysis"] = cached


async def get_user_watchlist_disclosures_snapshot(user_id: int, days: int = 7) -> dict:
    async def _load() -> dict:
        logger.info("user_snapshot build disclosures user_id=%s days=%s", user_id, days)
        watchlist = await load_watchlist(user_id)
        if not watchlist:
            return {"watchlist": [], "disclosures": []}

        dart_client = DartClient(api_key=settings.dart_api_key)
        disclosures = await get_watchlist_disclosures(
            dart_client,
            days=days,
            user_id=user_id,
            watchlist=watchlist,
        )
        await _attach_cached_analyses(disclosures)
        return {"watchlist": watchlist, "disclosures": disclosures}

    return await get_or_set(
        f"user-snapshot:disclosures:{user_id}:{days}",
        DISCLOSURE_SNAPSHOT_TTL_SECONDS,
        _load,
    )


async def get_user_watchlist_overview_snapshot(user_id: int) -> dict:
    async def _load() -> dict:
        logger.info("user_snapshot build overview user_id=%s", user_id)
        watchlist = await load_watchlist(user_id)
        if not watchlist:
            return {"watchlist": [], "dividend_events": []}

        dart_client = DartClient(api_key=settings.dart_api_key)
        dividend_events = await get_watchlist_dividend_calendar(dart_client, watchlist)
        return {"watchlist": watchlist, "dividend_events": dividend_events}

    return await get_or_set(
        f"user-snapshot:overview:{user_id}",
        OVERVIEW_SNAPSHOT_TTL_SECONDS,
        _load,
    )
