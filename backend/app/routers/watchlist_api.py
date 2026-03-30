"""관심종목 API"""
import time
import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.models.user import User
from app.services.watchlist import load_watchlist, add_stock, remove_stock
from app.services.user_snapshot import get_user_watchlist_overview_snapshot

logger = logging.getLogger(__name__)
router = APIRouter()


class AddStockRequest(BaseModel):
    corp_code: str
    corp_name: str
    stock_code: str


@router.get("")
async def get_watchlist(user: User = Depends(get_current_user)):
    t0 = time.time()
    result = await load_watchlist(user.id)
    logger.info("load_watchlist took %.0fms", (time.time() - t0) * 1000)
    return {"watchlist": result}


@router.get("/overview")
async def get_watchlist_overview(user: User = Depends(get_current_user)):
    t0 = time.time()
    overview = await get_user_watchlist_overview_snapshot(user.id)
    logger.info("load_watchlist_overview took %.0fms", (time.time() - t0) * 1000)
    return overview


@router.post("")
async def add_to_watchlist(req: AddStockRequest, user: User = Depends(get_current_user)):
    watchlist = await add_stock(user.id, req.corp_code, req.corp_name, req.stock_code)
    return {"watchlist": watchlist}


@router.delete("/{corp_code}")
async def remove_from_watchlist(corp_code: str, user: User = Depends(get_current_user)):
    watchlist = await remove_stock(user.id, corp_code)
    return {"watchlist": watchlist}
