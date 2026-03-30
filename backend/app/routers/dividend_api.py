"""배당 캘린더 API"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.config import settings
from app.dependencies import get_current_user
from app.models.user import User
from app.services.dart_client import DartClient
from app.services.financial_data import build_dividend_calendar_event_with_record_date, get_dividend_history, get_watchlist_dividend_calendar
from app.services.popular_stocks import get_popular_stocks
from app.services.response_cache import get_or_set
from app.services.watchlist import load_watchlist

router = APIRouter()


@router.get("/calendar")
async def get_dividend_calendar(
    years: int = Query(5, ge=2, le=10),
    user: User = Depends(get_current_user),
):
    watchlist = await load_watchlist(user.id)
    if not watchlist:
        return {"events": []}

    dart_client = DartClient(api_key=settings.dart_api_key)
    events = await get_watchlist_dividend_calendar(dart_client, watchlist, years=years)
    return {"events": events}


@router.get("/calendar/{corp_code}")
async def get_company_dividend_calendar(
    corp_code: str,
    years: int = Query(5, ge=2, le=10),
):
    dart_client = DartClient(api_key=settings.dart_api_key)
    history = await get_dividend_history(dart_client, corp_code, years=years)
    event = await build_dividend_calendar_event_with_record_date(
        dart_client=dart_client,
        corp_code=corp_code,
        corp_name="",
        stock_code="",
        dividend_history=history,
    )
    return {"event": event}


@router.get("/public/preview")
async def get_public_dividend_preview(
    limit: int = Query(6, ge=1, le=12),
    years: int = Query(5, ge=2, le=10),
):
    async def _load():
        dart_client = DartClient(api_key=settings.dart_api_key)
        candidates = await get_popular_stocks(limit=max(limit * 2, limit))
        events = []

        for stock in candidates:
            history = await get_dividend_history(dart_client, stock["corp_code"], years=years)
            event = await build_dividend_calendar_event_with_record_date(
                dart_client=dart_client,
                corp_code=stock["corp_code"],
                corp_name=stock["corp_name"],
                stock_code=stock.get("stock_code", ""),
                dividend_history=history,
            )
            if event:
                events.append(event)
            if len(events) >= limit:
                break

        return {"events": events[:limit]}

    return await get_or_set(f"dividend:public-preview:{limit}:{years}", 300, _load)
