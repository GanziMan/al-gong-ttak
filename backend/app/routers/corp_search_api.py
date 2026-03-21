"""기업 검색 API"""
from fastapi import APIRouter, Query

from app.services.corp_code_loader import search_corps

router = APIRouter()


@router.get("/search")
async def search(q: str = Query(..., min_length=1, description="검색 키워드")):
    results = search_corps(q)
    return {"results": results[:20]}
