from __future__ import annotations

from typing import Optional

import httpx

DART_BASE_URL = "https://opendart.fss.or.kr/api"
DEFAULT_TIMEOUT = 30


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
