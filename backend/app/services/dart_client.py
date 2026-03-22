from __future__ import annotations

import io
import logging
import re
import zipfile
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

DART_BASE_URL = "https://opendart.fss.or.kr/api"
DEFAULT_TIMEOUT = 30
DOCUMENT_TIMEOUT = 60  # 본문 다운로드는 더 오래 걸릴 수 있음
MAX_CONTENT_LENGTH = 3000  # AI에 전달할 최대 글자 수


class DartClient:
    _shared_client: httpx.AsyncClient | None = None

    def __init__(self, api_key: str):
        self.api_key = api_key

    @classmethod
    async def _get_client(cls) -> httpx.AsyncClient:
        if cls._shared_client is None or cls._shared_client.is_closed:
            cls._shared_client = httpx.AsyncClient(timeout=DEFAULT_TIMEOUT)
        return cls._shared_client

    @classmethod
    async def close(cls) -> None:
        if cls._shared_client and not cls._shared_client.is_closed:
            await cls._shared_client.aclose()
            cls._shared_client = None

    async def get_disclosure_list(
        self,
        corp_code: Optional[str] = None,
        bgn_de: Optional[str] = None,
        end_de: Optional[str] = None,
        page_no: int = 1,
        page_count: int = 20,
    ) -> dict:
        """공시 목록 조회"""
        params = {
            "crtfc_key": self.api_key,
            "page_no": page_no,
            "page_count": page_count,
        }
        if corp_code:
            params["corp_code"] = corp_code
        if bgn_de:
            params["bgn_de"] = bgn_de
        if end_de:
            params["end_de"] = end_de

        client = await self._get_client()
        resp = await client.get(f"{DART_BASE_URL}/list.json", params=params)
        resp.raise_for_status()
        return resp.json()

    async def get_all_disclosures(
        self,
        bgn_de: str | None = None,
        end_de: str | None = None,
        page_count: int = 100,
    ) -> list[dict]:
        """전체 공시 목록 조회 (corp_code 없이)"""
        from datetime import datetime, timedelta

        if not bgn_de:
            bgn_de = (datetime.now() - timedelta(days=1)).strftime("%Y%m%d")
        if not end_de:
            end_de = datetime.now().strftime("%Y%m%d")

        params = {
            "crtfc_key": self.api_key,
            "bgn_de": bgn_de,
            "end_de": end_de,
            "page_count": page_count,
        }
        client = await self._get_client()
        resp = await client.get(f"{DART_BASE_URL}/list.json", params=params)
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") != "000":
            return []
        return data.get("list", [])

    async def get_document_text(self, rcept_no: str) -> str:
        """공시 본문을 가져와 텍스트로 반환 (ZIP → XML → 텍스트)"""
        params = {
            "crtfc_key": self.api_key,
            "rcept_no": rcept_no,
        }
        client = await self._get_client()
        try:
            resp = await client.get(
                f"{DART_BASE_URL}/document.xml",
                params=params,
                timeout=DOCUMENT_TIMEOUT,
            )
            resp.raise_for_status()
        except Exception:
            logger.warning("Failed to download document for %s", rcept_no)
            return ""

        # ZIP이 아니면 빈 문자열 (에러 응답은 JSON)
        content_type = resp.headers.get("content-type", "")
        if "zip" not in content_type and "octet" not in content_type:
            logger.warning("Document response is not ZIP for %s: %s", rcept_no, content_type)
            return ""

        try:
            zf = zipfile.ZipFile(io.BytesIO(resp.content))
            texts: list[str] = []
            for name in zf.namelist():
                if not name.endswith(".xml"):
                    continue
                raw = zf.read(name)
                text = self._extract_text_from_xml(raw)
                if text:
                    texts.append(text)
            full_text = "\n".join(texts)
        except Exception:
            logger.warning("Failed to parse document ZIP for %s", rcept_no)
            return ""

        # 핵심 부분만 추출 (너무 길면 잘라냄)
        return self._truncate_smart(full_text, MAX_CONTENT_LENGTH)

    @staticmethod
    def _extract_text_from_xml(raw: bytes) -> str:
        """XML에서 태그를 제거하고 텍스트만 추출"""
        try:
            # DART XML은 인코딩이 다양 — 먼저 UTF-8 시도, 실패 시 EUC-KR
            for enc in ("utf-8", "euc-kr", "cp949"):
                try:
                    text = raw.decode(enc)
                    break
                except (UnicodeDecodeError, ValueError):
                    continue
            else:
                return ""

            # XML 태그 제거
            text = re.sub(r"<[^>]+>", " ", text)
            # 연속 공백/줄바꿈 정리
            text = re.sub(r"\s+", " ", text).strip()
            return text
        except Exception:
            return ""

    @staticmethod
    def _truncate_smart(text: str, max_len: int) -> str:
        """텍스트를 max_len 이하로 잘라내되, 핵심 키워드 주변 우선"""
        if len(text) <= max_len:
            return text

        # 핵심 키워드가 있는 위치를 찾아서 그 주변을 우선 포함
        keywords = [
            "결정", "결의", "금액", "주식수", "취득", "처분", "발행", "증자",
            "감자", "합병", "분할", "계약", "수주", "매출", "영업이익", "손실",
            "배당", "소송", "과징금", "벌금", "상장폐지", "감사의견",
        ]

        # 키워드가 있는 첫 위치 찾기
        best_start = 0
        for kw in keywords:
            idx = text.find(kw)
            if idx != -1:
                best_start = max(0, idx - 200)
                break

        # 앞부분 500자 + 키워드 주변 텍스트
        head = text[:500]
        middle = text[best_start:best_start + max_len - 500] if best_start > 500 else ""
        result = head
        if middle:
            result += "\n...\n" + middle

        return result[:max_len]

    async def get_company_info(self, corp_code: str) -> dict:
        """기업 개황 조회"""
        params = {
            "crtfc_key": self.api_key,
            "corp_code": corp_code,
        }
        client = await self._get_client()
        resp = await client.get(f"{DART_BASE_URL}/company.json", params=params)
        resp.raise_for_status()
        return resp.json()
