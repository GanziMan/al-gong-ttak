"""Step 1 테스트: 종목 검색 → 관심 종목 등록 → 공시 필터링"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

from app.services.corp_code_loader import download_corp_codes, search_corps, load_cached_corps
from app.services.watchlist import add_stock, load_watchlist
from app.services.dart_client import DartClient
from app.services.disclosure_filter import get_watchlist_disclosures

DART_API_KEY = os.getenv("DART_API_KEY")


async def main():
    # 1. 기업코드 다운로드 (최초 1회)
    corps = load_cached_corps()
    if not corps:
        print("기업코드 목록 다운로드 중...")
        corps = await download_corp_codes(DART_API_KEY)
        print(f"총 {len(corps)}개 상장사 로드 완료\n")
    else:
        print(f"캐시된 기업코드 {len(corps)}개 로드\n")

    # 2. 종목 검색 테스트
    keywords = ["삼성전자", "카카오", "네이버"]
    for kw in keywords:
        results = search_corps(kw, corps)
        print(f'"{kw}" 검색 결과:')
        for r in results[:3]:
            print(f"  {r['corp_name']} ({r['stock_code']}) - corp_code: {r['corp_code']}")
        print()

    # 3. 관심 종목 등록
    test_stocks = search_corps("삼성전자", corps)
    if test_stocks:
        s = test_stocks[0]
        add_stock(s["corp_code"], s["corp_name"], s["stock_code"])
        print(f"관심 종목 등록: {s['corp_name']}")

    test_stocks = search_corps("카카오", corps)
    for s in test_stocks:
        if s["corp_name"] == "카카오":
            add_stock(s["corp_code"], s["corp_name"], s["stock_code"])
            print(f"관심 종목 등록: {s['corp_name']}")
            break

    print(f"\n현재 관심 종목: {[w['corp_name'] for w in load_watchlist()]}\n")

    # 4. 관심 종목 공시 필터링
    print("관심 종목 최근 7일 공시 조회 중...\n")
    client = DartClient(DART_API_KEY)
    disclosures = await get_watchlist_disclosures(client, days=7)

    if disclosures:
        print(f"총 {len(disclosures)}건의 공시 발견:\n")
        for d in disclosures[:10]:
            print(f"  [{d['rcept_dt']}] {d['corp_name']} - {d['report_nm']}")
    else:
        print("최근 7일간 관심 종목 공시가 없습니다.")


if __name__ == "__main__":
    asyncio.run(main())
