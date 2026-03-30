"""기업 검색 API"""
from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from sqlalchemy import func, select

from app.database import async_session
from app.models.analysis_cache import AnalysisCache
from app.models.financial_data import FinancialData
from app.services.financial_data import _build_dividend_year_summary, _compare_dividend, _is_cache_fresh
from app.services.response_cache import get_or_set
from app.services.corp_code_loader import search_corps
from app.services.popular_stocks import get_popular_stocks
from app.services.sector_mapping import get_sectors

router = APIRouter()


async def _build_search_preview(results: list[dict]) -> list[dict]:
    if not results:
        return []

    corp_codes = [item["corp_code"] for item in results]
    corp_names = [item["corp_name"] for item in results]
    cutoff = (datetime.now() - timedelta(days=30)).strftime("%Y%m%d")

    async with async_session() as session:
        disclosure_stmt = (
            select(AnalysisCache.corp_name, func.count().label("count"))
            .where(AnalysisCache.corp_name.in_(corp_names), AnalysisCache.rcept_dt >= cutoff)
            .group_by(AnalysisCache.corp_name)
        )
        disclosure_rows = await session.execute(disclosure_stmt)
        disclosure_counts = {corp_name: count for corp_name, count in disclosure_rows.all()}

        dividend_stmt = select(FinancialData).where(
            FinancialData.corp_code.in_(corp_codes),
            FinancialData.data_type == "dividend",
            FinancialData.reprt_code == "11011",
        )
        dividend_rows = (await session.execute(dividend_stmt)).scalars().all()

    dividends_by_corp: dict[str, list[FinancialData]] = {}
    for row in dividend_rows:
        if not _is_cache_fresh(row.fetched_at):
            continue
        dividends_by_corp.setdefault(row.corp_code, []).append(row)

    preview: list[dict] = []
    for item in results:
        rows = sorted(
            dividends_by_corp.get(item["corp_code"], []),
            key=lambda row: row.bsns_year,
            reverse=True,
        )
        summaries = []
        for row in rows[:2]:
            summary = _build_dividend_year_summary({"year": row.bsns_year, "dividends": row.data})
            if summary:
                summaries.append(summary)

        latest = summaries[0] if summaries else None
        previous = summaries[1] if len(summaries) > 1 else None
        preview.append({
            **item,
            "recent_disclosure_count": disclosure_counts.get(item["corp_name"], 0),
            "recent_dps": latest.get("dps", 0) if latest else 0,
            "source_year": latest.get("year", "") if latest else "",
            "change_vs_prev_year": _compare_dividend(latest, previous) if latest else "unknown",
        })

    return preview


@router.get("/search")
async def search(q: str = Query(..., min_length=1, description="검색 키워드")):
    results = await search_corps(q)
    return JSONResponse(
        content={"results": results},
        headers={"Cache-Control": "public, max-age=30"},
    )


@router.get("/search-preview")
async def search_preview(q: str = Query(..., min_length=1, description="검색 키워드")):
    async def _load() -> list[dict]:
        results = (await search_corps(q))[:8]
        return await _build_search_preview(results)

    preview = await get_or_set(f"corp-search-preview:{q.strip().lower()}", 30, _load)
    return JSONResponse(
        content={"results": preview},
        headers={"Cache-Control": "public, max-age=30"},
    )


@router.get("/popular")
async def popular(limit: int = Query(10, ge=1, le=30)):
    stocks = await get_popular_stocks(limit=limit)
    return {"stocks": stocks}


@router.get("/sectors")
async def sectors():
    data = await get_sectors()
    return {"sectors": data}
