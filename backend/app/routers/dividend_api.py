"""배당 캘린더 API"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.config import settings
from app.dependencies import get_current_user
from app.models.user import User
from app.services.dart_client import DartClient
from app.services.financial_data import build_dividend_calendar_event, get_dividend_history, get_watchlist_dividend_calendar
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
    event = build_dividend_calendar_event(
        corp_code=corp_code,
        corp_name="",
        stock_code="",
        dividend_history=history,
    )
    return {"event": event}
