"""짧은 TTL 메모리 캐시"""
from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable
from typing import TypeVar

T = TypeVar("T")

logger = logging.getLogger(__name__)
_cache: dict[str, tuple[object, float]] = {}
_inflight: dict[str, asyncio.Task] = {}
_lock = asyncio.Lock()


async def get_or_set(key: str, ttl_seconds: int, loader: Callable[[], Awaitable[T]]) -> T:
    now = time.time()
    cached = _cache.get(key)
    if cached and cached[1] > now:
        logger.info("response_cache hit key=%s ttl=%.1fs", key, cached[1] - now)
        return cached[0]  # type: ignore[return-value]

    logger.info("response_cache miss key=%s", key)
    async with _lock:
        cached = _cache.get(key)
        now = time.time()
        if cached and cached[1] > now:
            logger.info("response_cache hit-after-lock key=%s ttl=%.1fs", key, cached[1] - now)
            return cached[0]  # type: ignore[return-value]

        existing = _inflight.get(key)
        if existing is None:
            logger.info("response_cache load key=%s", key)
            existing = asyncio.create_task(loader())
            _inflight[key] = existing
        else:
            logger.info("response_cache join-inflight key=%s", key)

    try:
        value = await existing
    finally:
        async with _lock:
            if _inflight.get(key) is existing:
                _inflight.pop(key, None)

    _cache[key] = (value, time.time() + ttl_seconds)
    logger.info("response_cache store key=%s ttl=%ss", key, ttl_seconds)
    return value


def invalidate(prefix: str | None = None) -> None:
    if prefix is None:
        logger.info("response_cache invalidate-all")
        _cache.clear()
        return
    removed = 0
    for key in list(_cache.keys()):
        if key.startswith(prefix):
            _cache.pop(key, None)
            removed += 1
    if removed:
        logger.info("response_cache invalidate prefix=%s removed=%d", prefix, removed)
