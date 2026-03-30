"""인기 종목 조회 (관심종목 등록 수 기준)"""
from __future__ import annotations

from sqlalchemy import select, func

from app.database import async_session
from app.models.watchlist import Watchlist
from app.services.response_cache import get_or_set


async def get_popular_stocks(limit: int = 10) -> list[dict]:
    async def _load():
        async with async_session() as session:
            query = (
                select(
                    Watchlist.corp_code,
                    Watchlist.corp_name,
                    Watchlist.stock_code,
                    func.count(Watchlist.user_id).label("watchers"),
                )
                .group_by(Watchlist.corp_code, Watchlist.corp_name, Watchlist.stock_code)
                .order_by(func.count(Watchlist.user_id).desc())
                .limit(limit)
            )
            result = await session.execute(query)
            return [
                {
                    "corp_code": row.corp_code,
                    "corp_name": row.corp_name,
                    "stock_code": row.stock_code,
                    "watchers": row.watchers,
                }
                for row in result.all()
            ]

    return await get_or_set(f"popular:{limit}", 60, _load)
