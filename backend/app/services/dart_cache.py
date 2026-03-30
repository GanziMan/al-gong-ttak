"""DART API 응답을 메모리에 TTL 캐싱"""
from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable
from typing import Any

logger = logging.getLogger(__name__)

# corp_code -> (data, timestamp)
_disclosure_cache: dict[str, tuple[list[dict], float]] = {}
_inflight: dict[str, asyncio.Task[list[dict]]] = {}
_cache_lock = asyncio.Lock()

# 캐시 유효 시간 (초)
CACHE_TTL = 10 * 60  # 10분


async def get_cached_disclosures(corp_code: str) -> list[dict] | None:
    """캐시된 공시 목록 반환. 없거나 만료되면 None."""
    entry = _disclosure_cache.get(corp_code)
    if entry is None:
        return None
    data, ts = entry
    if time.time() - ts > CACHE_TTL:
        logger.info("dart_cache stale key=%s age=%.1fs", corp_code, time.time() - ts)
        return None
    logger.info("dart_cache hit key=%s age=%.1fs", corp_code, time.time() - ts)
    return data


async def set_cached_disclosures(corp_code: str, data: list[dict]) -> None:
    """공시 목록을 캐시에 저장."""
    _disclosure_cache[corp_code] = (data, time.time())
    logger.info("dart_cache store key=%s items=%d ttl=%ss", corp_code, len(data), CACHE_TTL)


async def get_or_set_disclosures(
    cache_key: str,
    loader: Callable[[], Awaitable[list[dict]]],
) -> list[dict]:
    cached = await get_cached_disclosures(cache_key)
    if cached is not None:
        return cached

    logger.info("dart_cache miss key=%s", cache_key)

    async with _cache_lock:
        cached = await get_cached_disclosures(cache_key)
        if cached is not None:
            return cached

        task = _inflight.get(cache_key)
        if task is None:
            logger.info("dart_cache load key=%s", cache_key)
            task = asyncio.create_task(loader())
            _inflight[cache_key] = task
        else:
            logger.info("dart_cache join-inflight key=%s", cache_key)

    try:
        data = await task
    finally:
        async with _cache_lock:
            if _inflight.get(cache_key) is task:
                _inflight.pop(cache_key, None)

    await set_cached_disclosures(cache_key, data)
    return data


def get_cache_stats() -> dict[str, Any]:
    """캐시 통계."""
    now = time.time()
    total = len(_disclosure_cache)
    fresh = sum(1 for _, (_, ts) in _disclosure_cache.items() if now - ts <= CACHE_TTL)
    return {
        "total": total,
        "fresh": fresh,
        "stale": total - fresh,
        "inflight": len(_inflight),
    }
