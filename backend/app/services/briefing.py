"""오늘의 AI 브리핑 생성"""
from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.database import async_session
from app.models.analysis_cache import AnalysisCache
from app.services.watchlist import load_watchlist


async def generate_daily_briefing(user_id: int | None = None) -> dict:
    now = datetime.now(tz=ZoneInfo("Asia/Seoul"))
    cutoff = now.strftime("%Y%m%d")
    today = now.strftime("%Y-%m-%d")

    # 오늘 날짜 공시만 조회
    async with async_session() as session:
        query = select(AnalysisCache).where(AnalysisCache.rcept_dt >= cutoff)
        result = await session.execute(query)
        rows = result.scalars().all()

    # 로그인 유저: 관심종목 필터링
    if user_id:
        watchlist = await load_watchlist(user_id)
        watch_names = {w["corp_name"] for w in watchlist}
        if watch_names:
            rows = [r for r in rows if r.corp_name in watch_names]

    total = len(rows)
    bullish = 0
    bearish = 0
    neutral = 0
    scored = []

    for r in rows:
        analysis = r.analysis or {}
        cat = (analysis.get("category", "") or "").strip()
        score = analysis.get("importance_score", 0)
        if cat == "호재":
            bullish += 1
        elif cat == "악재":
            bearish += 1
        else:
            neutral += 1
        scored.append({
            "corp_name": r.corp_name or "",
            "report_nm": r.report_nm or "",
            "category": cat,
            "importance_score": score,
        })

    # 상위 3개 (중요도 기준)
    scored.sort(key=lambda x: -x["importance_score"])
    top_disclosures = scored[:3]

    # 요약 narrative 생성
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
