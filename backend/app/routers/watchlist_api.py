"""관심종목 API"""
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.watchlist import load_watchlist, add_stock, remove_stock

router = APIRouter()


class AddStockRequest(BaseModel):
    corp_code: str
    corp_name: str
    stock_code: str


@router.get("")
async def get_watchlist():
    return {"watchlist": load_watchlist()}


@router.post("")
async def add_to_watchlist(req: AddStockRequest):
    watchlist = add_stock(req.corp_code, req.corp_name, req.stock_code)
    return {"watchlist": watchlist}


@router.delete("/{corp_code}")
async def remove_from_watchlist(corp_code: str):
    watchlist = remove_stock(corp_code)
    return {"watchlist": watchlist}
