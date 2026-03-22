"""DART API 응답을 메모리에 TTL 캐싱"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

logger = logging.getLogger(__name__)

# corp_code -> (data, timestamp)
_disclosure_cache: dict[str, tuple[list[dict], float]] = {}
_cache_lock = asyncio.Lock()

# 캐시 유효 시간 (초)
CACHE_TTL = 5 * 60  # 5분


async def get_cached_disclosures(corp_code: str) -> list[dict] | None:
    """캐시된 공시 목록 반환. 없거나 만료되면 None."""
    entry = _disclosure_cache.get(corp_code)
    if entry is None:
        return None
    data, ts = entry
    if time.time() - ts > CACHE_TTL:
        return None
    return data


async def set_cached_disclosures(corp_code: str, data: list[dict]) -> None:
    """공시 목록을 캐시에 저장."""
    _disclosure_cache[corp_code] = (data, time.time())


def get_cache_stats() -> dict[str, Any]:
    """캐시 통계."""
    now = time.time()
    total = len(_disclosure_cache)
    fresh = sum(1 for _, (_, ts) in _disclosure_cache.items() if now - ts <= CACHE_TTL)
    return {"total": total, "fresh": fresh, "stale": total - fresh}
