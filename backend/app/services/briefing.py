"""오늘의 AI 브리핑 생성"""
from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.database import async_session
from app.models.analysis_cache import AnalysisCache
from app.services.response_cache import get_or_set
from app.services.user_snapshot import get_user_watchlist_disclosures_snapshot


def _build_briefing_payload(
    today: str,
    items: list[dict],
) -> dict:
    total = len(items)
    bullish = 0
    bearish = 0
    neutral = 0
    scored = []

    for item in items:
        analysis = item.get("analysis") or {}
        cat = (analysis.get("category", "") or "").strip()
        score = analysis.get("importance_score", 0)
        if cat == "호재":
            bullish += 1
        elif cat == "악재":
            bearish += 1
        else:
            neutral += 1
        scored.append({
            "corp_name": item.get("corp_name", ""),
            "report_nm": item.get("report_nm", ""),
            "category": cat,
            "importance_score": score,
        })

    scored.sort(key=lambda x: -x["importance_score"])
    top_disclosures = scored[:3]

    if total == 0:
        narrative = "오늘 접수된 공시가 없습니다."
    else:
        parts = []
        if bullish:
            parts.append(f"호재 {bullish}건")
        if bearish:
            parts.append(f"악재 {bearish}건")
        if neutral:
            parts.append(f"중립/기타 {neutral}건")
        narrative = f"총 {total}건의 공시가 접수되었으며, {', '.join(parts)}입니다."
        if top_disclosures:
            top = top_disclosures[0]
            narrative += f" 가장 주목할 공시는 {top['corp_name']}의 '{top['report_nm']}'입니다."

    return {
        "date": today,
        "total": total,
        "bullish": bullish,
        "bearish": bearish,
        "neutral": neutral,
        "top_disclosures": top_disclosures,
        "narrative": narrative,
    }


async def generate_daily_briefing(user_id: int | None = None) -> dict:
    now = datetime.now(tz=ZoneInfo("Asia/Seoul"))
    cutoff = now.strftime("%Y%m%d")
    today = now.strftime("%Y-%m-%d")

    async def _load():
        if user_id:
            snapshot = await get_user_watchlist_disclosures_snapshot(user_id, days=1)
            items = [
                {
                    "corp_name": disclosure.get("corp_name", ""),
                    "report_nm": disclosure.get("report_nm", ""),
                    "analysis": disclosure.get("analysis"),
                }
                for disclosure in snapshot["disclosures"]
                if (disclosure.get("rcept_dt", "") or "") >= cutoff and disclosure.get("analysis")
            ]
            return _build_briefing_payload(today, items)

        async with async_session() as session:
            query = select(AnalysisCache).where(AnalysisCache.rcept_dt >= cutoff)
            result = await session.execute(query)
            rows = result.scalars().all()

        items = [
            {
                "corp_name": row.corp_name or "",
                "report_nm": row.report_nm or "",
                "analysis": row.analysis or {},
            }
            for row in rows
        ]
        return _build_briefing_payload(today, items)

    cache_key = f"briefing:{today}:{user_id or 0}"
    return await get_or_set(cache_key, 60, _load)
