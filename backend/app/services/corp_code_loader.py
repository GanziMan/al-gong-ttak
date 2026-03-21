"""DART 기업코드 목록 다운로드 및 검색"""
from __future__ import annotations

import io
import os
import json
import zipfile
from pathlib import Path
from typing import List, Dict, Optional

import httpx

DART_BASE_URL = "https://opendart.fss.or.kr/api"
CACHE_PATH = Path(__file__).resolve().parent.parent.parent.parent / "data" / "corp_codes.json"


async def download_corp_codes(api_key: str) -> List[Dict]:
    """DART에서 기업코드 목록 다운로드 (ZIP → XML 파싱)"""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{DART_BASE_URL}/corpCode.xml",
            params={"crtfc_key": api_key},
            timeout=30,
        )

    zf = zipfile.ZipFile(io.BytesIO(resp.content))
    xml_name = zf.namelist()[0]
    xml_content = zf.read(xml_name).decode("utf-8")

    import xml.etree.ElementTree as ET

    root = ET.fromstring(xml_content)
    corps = []
    for item in root.findall("list"):
        corp_code = item.findtext("corp_code", "")
        corp_name = item.findtext("corp_name", "")
        stock_code = item.findtext("stock_code", "").strip()
        if stock_code:  # 상장사만
            corps.append({
                "corp_code": corp_code,
                "corp_name": corp_name,
                "stock_code": stock_code,
            })

    # 캐시 저장
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(corps, f, ensure_ascii=False, indent=2)

    return corps


def load_cached_corps() -> List[Dict]:
    """캐시된 기업코드 목록 로드"""
    if not CACHE_PATH.exists():
        return []
    with open(CACHE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def search_corps(keyword: str, corps: Optional[List[Dict]] = None) -> List[Dict]:
    """기업명으로 검색"""
    if corps is None:
        corps = load_cached_corps()
    return [c for c in corps if keyword.lower() in c["corp_name"].lower()]
