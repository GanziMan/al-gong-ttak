"""관심 종목 관리 (DB 기반, 유저별)"""
from __future__ import annotations

import time

from sqlalchemy import select, delete, and_
from app.database import async_session
from app.models.watchlist import Watchlist
from app.services.response_cache import invalidate

_WATCHLIST_CACHE_TTL = 60
_watchlist_cache: dict[int, tuple[list[dict], float]] = {}


def invalidate_user_caches(user_id: int) -> None:
    invalidate(f"dashboard:bootstrap:{user_id}:")
    invalidate(f"dashboard:summary:{user_id}")
    invalidate(f"dashboard:history:{user_id}:")
    invalidate(f"user-snapshot:disclosures:{user_id}:")
    invalidate(f"user-snapshot:overview:{user_id}")
    invalidate("briefing:")


async def load_watchlist(user_id: int) -> list[dict]:
    now = time.time()
    cached = _watchlist_cache.get(user_id)
    if cached and now - cached[1] < _WATCHLIST_CACHE_TTL:
        return cached[0]

    async with async_session() as session:
        result = await session.execute(
            select(Watchlist).where(Watchlist.user_id == user_id)
        )
        rows = result.scalars().all()
        data = [{"corp_code": r.corp_code, "corp_name": r.corp_name, "stock_code": r.stock_code} for r in rows]
        _watchlist_cache[user_id] = (data, now)
        return data


async def add_stock(user_id: int, corp_code: str, corp_name: str, stock_code: str) -> list[dict]:
    async with async_session() as session:
        existing = await session.get(Watchlist, (user_id, corp_code))
        if existing:
            return await load_watchlist(user_id)
        session.add(Watchlist(user_id=user_id, corp_code=corp_code, corp_name=corp_name, stock_code=stock_code))
        await session.commit()
    _watchlist_cache.pop(user_id, None)
    invalidate_user_caches(user_id)
    return await load_watchlist(user_id)


async def remove_stock(user_id: int, corp_code: str) -> list[dict]:
    async with async_session() as session:
        await session.execute(
            delete(Watchlist).where(and_(Watchlist.user_id == user_id, Watchlist.corp_code == corp_code))
        )
        await session.commit()
    _watchlist_cache.pop(user_id, None)
    invalidate_user_caches(user_id)
    return await load_watchlist(user_id)
