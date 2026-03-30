"""AI 분석 결과 캐싱 (DB 기반)"""
from __future__ import annotations

import logging
import asyncio

from sqlalchemy import select, cast, String
from app.database import async_session
from app.models.analysis_cache import AnalysisCache

logger = logging.getLogger(__name__)


async def get_cached_analysis(rcept_no: str) -> dict | None:
    async with async_session() as session:
        row = await session.get(AnalysisCache, rcept_no)
        if not row:
            return None
        return row.analysis


async def get_cached_analyses(rcept_nos: list[str]) -> dict[str, dict]:
    keys = [rcept_no for rcept_no in dict.fromkeys(rcept_nos) if rcept_no]
    if not keys:
        return {}

    async with async_session() as session:
        result = await session.execute(
            select(AnalysisCache).where(AnalysisCache.rcept_no.in_(keys))
        )
        rows = result.scalars().all()

    return {
        row.rcept_no: row.analysis
        for row in rows
        if row.analysis
    }


async def save_analysis(rcept_no: str, analysis: dict, metadata: dict | None = None):
    async with async_session() as session:
        row = await session.get(AnalysisCache, rcept_no)
        if not row:
            row = AnalysisCache(rcept_no=rcept_no)
            session.add(row)
        row.analysis = analysis
        if metadata:
            row.rcept_dt = metadata.get("rcept_dt", "")
            row.corp_name = metadata.get("corp_name", "")
            row.report_nm = metadata.get("report_nm", "")
        await session.commit()


async def get_cached_full(rcept_no: str) -> dict | None:
    async with async_session() as session:
        row = await session.get(AnalysisCache, rcept_no)
        if not row or not row.analysis:
            return None
        return {
            "rcept_no": row.rcept_no,
            "rcept_dt": row.rcept_dt,
            "corp_name": row.corp_name,
            "report_nm": row.report_nm,
            "analysis": row.analysis,
        }


async def list_all_cached_full() -> list[dict]:
    async with async_session() as session:
        result = await session.execute(
            select(AnalysisCache).where(AnalysisCache.rcept_dt != "")
        )
        rows = result.scalars().all()
        return [
            {
                "rcept_no": r.rcept_no,
                "rcept_dt": r.rcept_dt,
                "corp_name": r.corp_name,
                "report_nm": r.report_nm,
                "analysis": r.analysis,
            }
            for r in rows
        ]


async def list_cached() -> list[str]:
    async with async_session() as session:
        result = await session.execute(select(AnalysisCache.rcept_no))
        return [r[0] for r in result.all()]


async def search_similar(
    category: str,
    keywords: list[str],
    exclude_rcept_no: str,
    limit: int = 5,
) -> list[dict]:
    """DB 쿼리로 유사 공시 검색 (키워드 매칭)"""
    async with async_session() as session:
        # 같은 카테고리의 캐시만 조회
        query = (
            select(AnalysisCache)
            .where(
                AnalysisCache.rcept_no != exclude_rcept_no,
                AnalysisCache.rcept_dt != "",
                cast(AnalysisCache.analysis["category"], String) == f'"{category}"',
            )
            .limit(200)
        )
        result = await session.execute(query)
        rows = result.scalars().all()

    # 키워드 매칭은 메모리에서 (최대 200건)
    scored = []
    for r in rows:
        analysis = r.analysis or {}
        match_count = sum(1 for kw in keywords if kw in (r.report_nm or ""))
        if match_count == 0:
            continue
        scored.append({
            "rcept_no": r.rcept_no,
            "corp_name": r.corp_name or "",
            "report_nm": r.report_nm or "",
            "rcept_dt": r.rcept_dt or "",
            "category": analysis.get("category", ""),
            "importance_score": analysis.get("importance_score", 0),
            "summary": analysis.get("summary", ""),
            "_match": match_count,
        })
    scored.sort(key=lambda x: (-x["_match"], -x["importance_score"]))
    for item in scored:
        del item["_match"]
    return scored[:limit]


async def search_similar_with_impact(
    category: str,
    keywords: list[str],
    exclude_rcept_no: str,
    limit: int = 5,
) -> tuple[list[dict], float | None]:
    """유사 공시 검색 + 각 결과에 주가 영향 추가"""
    from app.services.stock_price import calculate_price_impact
    from app.services.corp_code_loader import _corps_cache

    results = await search_similar(category, keywords, exclude_rcept_no, limit)

    # corp_name → stock_code, corp_code 매핑
    name_map: dict[str, dict] = {}
    for c in _corps_cache:
        name_map[c["corp_name"]] = c

    async def _enrich_price_change(r: dict) -> float | None:
        corp_info = name_map.get(r["corp_name"])
        if not corp_info or not r.get("rcept_dt"):
            r["price_change_5d"] = None
            return None
        try:
            impact = await calculate_price_impact(
                corp_info["stock_code"],
                corp_info["corp_code"],
                r["rcept_dt"],
            )
            if impact and impact.get("change_5d") is not None:
                r["price_change_5d"] = impact["change_5d"]
                return impact["change_5d"]
            else:
                r["price_change_5d"] = None
        except Exception:
            logger.warning("Price impact failed for %s", r.get("rcept_no"))
            r["price_change_5d"] = None
        return None

    changes = [c for c in await asyncio.gather(*[_enrich_price_change(r) for r in results]) if c is not None]

    avg_price_change = round(sum(changes) / len(changes), 2) if changes else None
    return results, avg_price_change
