"""관심 종목 공시 필터링 (DART 응답 캐싱)"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timedelta

from app.services.dart_client import DartClient
from app.services.dart_cache import get_or_set_disclosures
from app.services.watchlist import load_watchlist

logger = logging.getLogger(__name__)
SLOW_DISCLOSURE_FETCH_MS = 600


def _normalize_window_days(days: int) -> int:
    if days <= 14:
        return 14
    if days <= 30:
        return 30
    return days


async def get_watchlist_disclosures(
    dart_client: DartClient,
    days: int = 1,
    user_id: int | None = None,
    watchlist: list[dict] | None = None,
) -> list[dict]:
    """관심 종목의 최근 공시만 필터링하여 반환 (캐시 + 병렬 호출)"""
    started = time.perf_counter()
    if watchlist is None:
        watchlist = await load_watchlist(user_id) if user_id else []
    if not watchlist:
        return []

    today = datetime.now().strftime("%Y%m%d")
    cache_days = _normalize_window_days(days)
    start = (datetime.now() - timedelta(days=cache_days)).strftime("%Y%m%d")
    requested_start = (datetime.now() - timedelta(days=days)).strftime("%Y%m%d")
    cache_key_suffix = f"_{cache_days}_{start}_{today}"

    async def _fetch_one(stock: dict) -> list[dict]:
        corp_code = stock["corp_code"]
        cache_key = corp_code + cache_key_suffix

        async def _load() -> list[dict]:
            try:
                data = await dart_client.get_disclosure_list(
                    corp_code=corp_code,
                    bgn_de=start,
                    end_de=today,
                    page_count=100,
                )
                items = []
                if data.get("status") == "000":
                    for item in data.get("list", []):
                        item["_watchlist_name"] = stock["corp_name"]
                        items.append(item)
                return items
            except Exception:
                logger.warning("Failed to fetch disclosures for %s", stock.get("corp_name", ""))
                return []

        cached_items = await get_or_set_disclosures(cache_key, _load)
        return [
            item for item in cached_items
            if (item.get("rcept_dt", "") or "") >= requested_start
        ]

    # 모든 종목 병렬 호출 (개별 실패 허용)
    all_results = await asyncio.gather(*[_fetch_one(s) for s in watchlist])

    results = [item for sublist in all_results for item in sublist]
    results.sort(key=lambda x: x.get("rcept_dt", ""), reverse=True)
    elapsed_ms = (time.perf_counter() - started) * 1000
    logger.info(
        "watchlist disclosures user_id=%s days=%s stocks=%d disclosures=%d in %.1fms",
        user_id,
        days,
        len(watchlist),
        len(results),
        elapsed_ms,
    )
    if elapsed_ms >= SLOW_DISCLOSURE_FETCH_MS:
        logger.warning(
            "Slow watchlist disclosure fetch user_id=%s days=%s took %.1fms",
            user_id,
            days,
            elapsed_ms,
        )
    return results
