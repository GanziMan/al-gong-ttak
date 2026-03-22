from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.services.corp_code_loader import load_cached_corps, download_corp_codes
from app.services.dart_client import DartClient
from app.services.disclosure_filter import get_watchlist_disclosures
from app.services.analysis_cache import get_cached_analysis
from app.routers.disclosure_api import _enrich_one
from app.services.settings import load_settings
from app.services.telegram import send_alert, format_disclosure_alert, format_keyword_alert
from app.routers import corp_search_api, watchlist_api, disclosure_api, dashboard_api, settings_api, bookmarks_api

logger = logging.getLogger(__name__)

AUTO_SCAN_INTERVAL = 30 * 60  # 30분


async def _auto_scan_loop() -> None:
    """30분 간격으로 1일치 공시를 스캔하고 미분석 건을 순차 분석, 조건 충족 시 텔레그램 알림."""
    while True:
        await asyncio.sleep(AUTO_SCAN_INTERVAL)
        try:
            logger.info("Auto-scan started")
            dart_client = DartClient(api_key=settings.dart_api_key)
            disclosures = await get_watchlist_disclosures(dart_client, days=1)

            # 미분석 건 필터
            pending = []
            for d in disclosures:
                rcept_no = d.get("rcept_no", "")
                cached = get_cached_analysis(rcept_no) if rcept_no else None
                if cached is None:
                    pending.append(d)

            if not pending:
                logger.info("Auto-scan: no pending disclosures")
                continue

            # 텔레그램 설정
            user_settings = load_settings()
            tg_enabled = user_settings.get("telegram_enabled", False)
            tg_chat_id = user_settings.get("telegram_chat_id", "")
            tg_categories = user_settings.get("alert_categories", [])
            tg_min_score = user_settings.get("min_importance_score", 0)

            # 순차 처리 (API 쿼터 부하 최소화)
            for d in pending:
                await _enrich_one(d)
                analysis = d.get("analysis")
                if (
                    tg_enabled
                    and tg_chat_id
                    and settings.telegram_bot_token
                    and analysis
                ):
                    cat = analysis.get("category", "")
                    score = analysis.get("importance_score", 0)
                    if cat in tg_categories and score >= tg_min_score:
                        msg = format_disclosure_alert(
                            corp_name=d.get("corp_name", ""),
                            title=d.get("report_nm", ""),
                            category=cat,
                            importance=score,
                            summary=analysis.get("summary", ""),
                            action_item=analysis.get("action_item", ""),
                            rcept_no=d.get("rcept_no", ""),
                        )
                        await send_alert(settings.telegram_bot_token, tg_chat_id, msg)

            logger.info("Auto-scan completed: %d disclosures analyzed", len(pending))

            # 키워드 알림 스캔
            alert_keywords = user_settings.get("alert_keywords", [])
            if (
                alert_keywords
                and tg_enabled
                and tg_chat_id
                and settings.telegram_bot_token
            ):
                try:
                    all_disclosures = await dart_client.get_all_disclosures()
                    for kw in alert_keywords:
                        matched = [
                            d for d in all_disclosures
                            if kw in d.get("report_nm", "")
                            and not get_cached_analysis(d.get("rcept_no", ""))
                        ]
                        if matched:
                            msg = format_keyword_alert(kw, matched)
                            await send_alert(settings.telegram_bot_token, tg_chat_id, msg)
                except Exception:
                    logger.exception("Keyword alert scan failed")
        except Exception:
            logger.exception("Auto-scan failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 앱 시작 시 캐시 파일이 없으면 DART에서 다운로드
    try:
        if not load_cached_corps() and settings.dart_api_key:
            await download_corp_codes(settings.dart_api_key)
    except Exception:
        logger.warning("Failed to download corp codes on startup, will retry later")
    # 자동 스캔 스케줄러 시작
    scan_task = asyncio.create_task(_auto_scan_loop())
    yield
    scan_task.cancel()


app = FastAPI(
    title="알잘딱 - AI 금융 에이전트",
    description="공시와 뉴스를 필터링해주는 AI 에이전트 서비스",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://al-zal-ttak.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(corp_search_api.router, prefix="/api/corps", tags=["기업 검색"])
app.include_router(watchlist_api.router, prefix="/api/watchlist", tags=["관심종목"])
app.include_router(disclosure_api.router, prefix="/api/disclosures", tags=["공시"])
app.include_router(dashboard_api.router, prefix="/api/dashboard", tags=["대시보드"])
app.include_router(settings_api.router, prefix="/api/settings", tags=["설정"])
app.include_router(bookmarks_api.router, prefix="/api/bookmarks", tags=["북마크"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}
