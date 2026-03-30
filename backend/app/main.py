from __future__ import annotations

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, text

from app.config import settings
from app.database import init_db, async_session
from app.services.corp_code_loader import load_cached_corps, download_corp_codes
from app.services.dart_client import DartClient
from app.services.disclosure_filter import get_watchlist_disclosures
from app.services.analysis_cache import get_cached_analysis
from app.services.dart_cache import get_cached_disclosures, set_cached_disclosures
from app.services.watchlist import load_watchlist
from app.routers.disclosure_api import _enrich_one, _analyze_batch_public
from app.services.settings import load_settings
from app.services.telegram import send_alert, format_disclosure_alert, format_keyword_alert
from app.models.watchlist import Watchlist
from app.routers import corp_search_api, watchlist_api, disclosure_api, dashboard_api, settings_api, bookmarks_api, auth_api, financial_api, briefing_api, dividend_api

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

AUTO_SCAN_INTERVAL = 30 * 60  # 30분
SLOW_REQUEST_MS = 800


async def _get_active_user_ids() -> list[int]:
    """관심종목이 있는 유저 ID 목록"""
    async with async_session() as session:
        result = await session.execute(
            select(Watchlist.user_id).distinct()
        )
        return [r[0] for r in result.all()]


async def _warmup_public_cache() -> None:
    """서버 시작 시 public 공시를 미리 분석한다."""
    try:
        await asyncio.sleep(3)
        logger.info("Public cache warmup: fetching recent disclosures")
        dart_client = DartClient(api_key=settings.dart_api_key)
        now = datetime.now()
        today = now.strftime("%Y%m%d")
        start = (now - timedelta(days=7)).strftime("%Y%m%d")
        cache_key = f"public_{start}_{today}"

        cached_list = await get_cached_disclosures(cache_key)
        if cached_list is None:
            cached_list = await dart_client.get_all_disclosures(bgn_de=start, end_de=today)
            await set_cached_disclosures(cache_key, cached_list)

        disclosures = list(cached_list)

        # 미분석 공시 찾기
        pending = []
        for d in disclosures:
            rcept_no = d.get("rcept_no", "")
            if rcept_no:
                cached = await get_cached_analysis(rcept_no)
                if cached is None:
                    pending.append(d)

        if pending:
            logger.info("Public cache warmup: analyzing %d disclosures", len(pending))
            await _analyze_batch_public(pending)
        else:
            logger.info("Public cache warmup: all disclosures already analyzed")
    except Exception:
        logger.exception("Public cache warmup failed")


async def _warmup_cache() -> None:
    """서버 시작 시 모든 유저의 공시 캐시를 미리 채운다."""
    try:
        await asyncio.sleep(5)  # DB 초기화 대기
        user_ids = await _get_active_user_ids()
        if not user_ids:
            logger.info("Cache warmup: no active users")
            return
        logger.info("Cache warmup: preloading disclosures for %d users", len(user_ids))
        dart_client = DartClient(api_key=settings.dart_api_key)
        for user_id in user_ids:
            try:
                await get_watchlist_disclosures(dart_client, days=7, user_id=user_id)
            except Exception:
                logger.warning("Cache warmup failed for user %d", user_id)
        logger.info("Cache warmup completed")
    except Exception:
        logger.exception("Cache warmup failed")


async def _auto_scan_loop() -> None:
    """30분 간격으로 모든 유저의 공시를 스캔."""
    while True:
        await asyncio.sleep(AUTO_SCAN_INTERVAL)
        try:
            # public 공시 미리 분석
            await _warmup_public_cache()
            logger.info("Auto-scan started")
            user_ids = await _get_active_user_ids()
            dart_client = DartClient(api_key=settings.dart_api_key)

            for user_id in user_ids:
                try:
                    disclosures = await get_watchlist_disclosures(dart_client, days=1, user_id=user_id)

                    pending = []
                    for d in disclosures:
                        rcept_no = d.get("rcept_no", "")
                        cached = (await get_cached_analysis(rcept_no)) if rcept_no else None
                        if cached is None:
                            pending.append(d)

                    if not pending:
                        continue

                    user_settings = await load_settings(user_id)
                    tg_enabled = user_settings.get("telegram_enabled", False)
                    tg_chat_id = user_settings.get("telegram_chat_id", "")
                    tg_categories = user_settings.get("alert_categories", [])
                    tg_min_score = user_settings.get("min_importance_score", 0)

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

                    # 키워드 알림
                    alert_keywords = user_settings.get("alert_keywords", [])
                    if alert_keywords and tg_enabled and tg_chat_id and settings.telegram_bot_token:
                        try:
                            all_disclosures = await dart_client.get_all_disclosures()
                            for kw in alert_keywords:
                                matched = []
                                for d in all_disclosures:
                                    if kw in d.get("report_nm", ""):
                                        c = await get_cached_analysis(d.get("rcept_no", ""))
                                        if not c:
                                            matched.append(d)
                                if matched:
                                    msg = format_keyword_alert(kw, matched)
                                    await send_alert(settings.telegram_bot_token, tg_chat_id, msg)
                        except Exception:
                            logger.exception("Keyword alert scan failed for user %d", user_id)
                except Exception:
                    logger.exception("Auto-scan failed for user %d", user_id)

            logger.info("Auto-scan completed for %d users", len(user_ids))
        except Exception:
            logger.exception("Auto-scan failed")


async def _download_corps_background() -> None:
    """DB에 기업코드가 없으면 DART에서 다운로드"""
    try:
        logger.info("Checking corp codes in DB...")
        cached = await load_cached_corps()
        logger.info("Found %d corp codes in DB", len(cached))
        if not cached and settings.dart_api_key:
            logger.info("No corp codes found, downloading from DART...")
            await download_corp_codes(settings.dart_api_key)
            logger.info("Corp codes downloaded successfully")
        elif not settings.dart_api_key:
            logger.warning("DART_API_KEY is not set, skipping corp code download")
    except Exception:
        logger.exception("Failed to download corp codes")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    corp_task = asyncio.create_task(_download_corps_background())
    public_warmup_task = asyncio.create_task(_warmup_public_cache())
    warmup_task = asyncio.create_task(_warmup_cache())
    scan_task = asyncio.create_task(_auto_scan_loop())
    yield
    scan_task.cancel()
    warmup_task.cancel()
    public_warmup_task.cancel()
    corp_task.cancel()


app = FastAPI(
    title="공시딱 - AI 금융 에이전트",
    description="공시와 뉴스를 필터링해주는 AI 에이전트 서비스",
    version="0.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://gongsittak.com",
        "https://gongsi-ttak.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_timing(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Response-Time"] = f"{elapsed_ms:.1f}ms"
    response.headers["Server-Timing"] = f"app;dur={elapsed_ms:.1f}"

    if request.url.path.startswith("/api/"):
        logger.info(
            "API %s %s -> %s in %.1fms",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
        if elapsed_ms >= SLOW_REQUEST_MS:
            logger.warning(
                "Slow API %s %s took %.1fms",
                request.method,
                request.url.path,
                elapsed_ms,
            )

    return response

app.include_router(auth_api.router, prefix="/api/auth", tags=["인증"])
app.include_router(corp_search_api.router, prefix="/api/corps", tags=["기업 검색"])
app.include_router(watchlist_api.router, prefix="/api/watchlist", tags=["관심종목"])
app.include_router(disclosure_api.router, prefix="/api/disclosures", tags=["공시"])
app.include_router(dashboard_api.router, prefix="/api/dashboard", tags=["대시보드"])
app.include_router(settings_api.router, prefix="/api/settings", tags=["설정"])
app.include_router(bookmarks_api.router, prefix="/api/bookmarks", tags=["북마크"])
app.include_router(financial_api.router, prefix="/api/company", tags=["기업 재무"])
app.include_router(briefing_api.router, prefix="/api/briefing", tags=["브리핑"])
app.include_router(dividend_api.router, prefix="/api/dividends", tags=["배당"])


@app.get("/health")
async def health_check():
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok", "db": "ok"}
    except Exception:
        logger.exception("Health check failed: DB unreachable")
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "db": "unreachable"},
        )
