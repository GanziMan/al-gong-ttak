from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.services.corp_code_loader import load_cached_corps, download_corp_codes
from app.routers import corp_search_api, watchlist_api, disclosure_api, dashboard_api, settings_api


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 앱 시작 시 캐시 파일이 없으면 DART에서 다운로드
    if not load_cached_corps() and settings.dart_api_key:
        await download_corp_codes(settings.dart_api_key)
    yield


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


@app.get("/health")
async def health_check():
    return {"status": "ok"}
