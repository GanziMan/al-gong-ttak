"""DART 기업코드 목록 다운로드 및 검색 (DB 기반)"""
from __future__ import annotations

import io
import logging
import time
import zipfile
import xml.etree.ElementTree as ET
from typing import List, Dict

import httpx
from sqlalchemy import select, func, delete

from app.database import async_session
from app.models.corp_code import CorpCode

logger = logging.getLogger(__name__)

DART_BASE_URL = "https://opendart.fss.or.kr/api"

BATCH_SIZE = 500

# 인메모리 캐시 — 서버 시작 시 로드, 검색 시 DB 접근 불필요
_corps_cache: List[Dict] = []
_corps_by_name: Dict[str, Dict] = {}
_prefix_buckets: Dict[str, List[Dict]] = {}
_search_cache: Dict[str, tuple[List[Dict], float]] = {}
_SEARCH_CACHE_TTL = 60  # seconds


def _rebuild_corp_maps() -> None:
    _corps_by_name.clear()
    _prefix_buckets.clear()
    _search_cache.clear()
    for corp in _corps_cache:
        name = corp.get("corp_name", "")
        if name:
            _corps_by_name[name] = corp
            key = name.lower().strip()
            if key:
                _prefix_buckets.setdefault(key[:1], []).append(corp)
                if len(key) >= 2:
                    _prefix_buckets.setdefault(key[:2], []).append(corp)


def get_corp_by_name(corp_name: str) -> Dict | None:
    if not corp_name:
        return None
    return _corps_by_name.get(corp_name)


async def download_corp_codes(api_key: str) -> List[Dict]:
    """DART에서 기업코드 목록 다운로드 → DB 저장 (batch insert)"""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{DART_BASE_URL}/corpCode.xml",
            params={"crtfc_key": api_key},
            timeout=60,
        )

    zf = zipfile.ZipFile(io.BytesIO(resp.content))
    xml_name = zf.namelist()[0]
    xml_content = zf.read(xml_name).decode("utf-8")

    root = ET.fromstring(xml_content)
    corps = []
    for item in root.findall("list"):
        corp_code = item.findtext("corp_code", "")
        corp_name = item.findtext("corp_name", "")
        stock_code = item.findtext("stock_code", "").strip()
        if stock_code:
            corps.append({
                "corp_code": corp_code,
                "corp_name": corp_name,
                "stock_code": stock_code,
            })

    logger.info("Parsed %d corps from DART XML, inserting to DB...", len(corps))

    # 기존 데이터 삭제 후 batch insert (pgbouncer 호환)
    async with async_session() as session:
        await session.execute(delete(CorpCode))
        for i in range(0, len(corps), BATCH_SIZE):
            batch = corps[i:i + BATCH_SIZE]
            session.add_all([CorpCode(**c) for c in batch])
            await session.flush()
        await session.commit()

    logger.info("Successfully inserted %d corp codes to DB", len(corps))

    _corps_cache.clear()
    _corps_cache.extend(corps)
    _rebuild_corp_maps()
    logger.info("In-memory corps cache updated: %d items", len(corps))

    return corps


async def load_cached_corps() -> List[Dict]:
    """DB에서 기업코드 목록 로드 → 인메모리 캐시에 저장"""
    async with async_session() as session:
        result = await session.execute(select(CorpCode))
        rows = result.scalars().all()
        corps = [{"corp_code": r.corp_code, "corp_name": r.corp_name, "stock_code": r.stock_code} for r in rows]

    if corps:
        _corps_cache.clear()
        _corps_cache.extend(corps)
        _rebuild_corp_maps()
        logger.info("In-memory corps cache loaded: %d items", len(corps))

    return corps


async def search_corps(keyword: str) -> List[Dict]:
    """기업명/종목코드 검색 (인메모리, DB 접근 없음)"""
    if not _corps_cache:
        await load_cached_corps()

    normalized = " ".join(keyword.strip().lower().split())
    if not normalized:
        return []

    now = time.time()
    cached = _search_cache.get(normalized)
    if cached and now - cached[1] < _SEARCH_CACHE_TTL:
        return cached[0]

    # 예외적으로 버킷 인덱스가 비어있으면 즉시 재구축 (초기화/핫리로드 안전장치)
    if _corps_cache and not _prefix_buckets:
        _rebuild_corp_maps()

    tokens = [t for t in normalized.split(" ") if t]
    if not tokens:
        return []

    # prefix 버킷으로 후보군 축소
    candidate_map: Dict[str, Dict] = {}
    for t in tokens:
        bucket_key = t[:2] if len(t) >= 2 else t[:1]
        for corp in _prefix_buckets.get(bucket_key, []):
            candidate_map[corp["corp_code"]] = corp

    candidates = list(candidate_map.values()) if candidate_map else _corps_cache

    # 다중 키워드 입력(예: "현대자동차 한국콜마")도 결과가 나오도록 토큰 OR 매칭
    scored: list[tuple[int, Dict]] = []
    for c in candidates:
        name_lower = c["corp_name"].lower()
        stock_code = c.get("stock_code", "").lower()
        score = 0

        # 전체 질의가 기업명에 정확히 들어가면 최우선
        if name_lower.startswith(normalized):
            score += 120
        elif normalized in name_lower:
            score += 90

        matched_any = False
        for t in tokens:
            if name_lower.startswith(t):
                score += 35
                matched_any = True
            elif t in name_lower:
                score += 20
                matched_any = True
            elif stock_code and t in stock_code:
                score += 25
                matched_any = True

        if matched_any:
            # 너무 짧은 이름 보정
            score += max(0, 10 - min(len(name_lower), 10))
            scored.append((score, c))

    # 버킷 축소로 누락될 수 있는 경우 full-scan 폴백
    if len(scored) < 5 and candidates is not _corps_cache:
        seen = {c["corp_code"] for _, c in scored}
        for c in _corps_cache:
            if c["corp_code"] in seen:
                continue
            name_lower = c["corp_name"].lower()
            stock_code = c.get("stock_code", "").lower()
            score = 0
            if name_lower.startswith(normalized):
                score += 120
            elif normalized in name_lower:
                score += 90

            matched_any = False
            for t in tokens:
                if name_lower.startswith(t):
                    score += 35
                    matched_any = True
                elif t in name_lower:
                    score += 20
                    matched_any = True
                elif stock_code and t in stock_code:
                    score += 25
                    matched_any = True

            if matched_any:
                score += max(0, 10 - min(len(name_lower), 10))
                scored.append((score, c))

    scored.sort(key=lambda x: (-x[0], x[1]["corp_name"]))
    results = [c for _, c in scored[:20]]
    # 빈 결과는 캐시하지 않아 초기 일시 오류/데이터 지연 시 회복을 막지 않도록 함
    if results:
        _search_cache[normalized] = (results, now)
    else:
        _search_cache.pop(normalized, None)
    return results
