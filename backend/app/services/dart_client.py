from __future__ import annotations

from typing import Optional

import httpx

DART_BASE_URL = "https://opendart.fss.or.kr/api"
DEFAULT_TIMEOUT = 30


class DartClient:
    def __init__(self, api_key: str):
        self.api_key = api_key

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

        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            resp = await client.get(f"{DART_BASE_URL}/list.json", params=params)
            resp.raise_for_status()
            return resp.json()

    async def get_company_info(self, corp_code: str) -> dict:
        """기업 개황 조회"""
        params = {
            "crtfc_key": self.api_key,
            "corp_code": corp_code,
        }
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            resp = await client.get(f"{DART_BASE_URL}/company.json", params=params)
            resp.raise_for_status()
            return resp.json()
