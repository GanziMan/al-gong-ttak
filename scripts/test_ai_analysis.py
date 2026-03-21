"""Step 2 테스트: DART 공시 → ADK 에이전트로 AI 분석"""
import asyncio
import os
import sys
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

from app.services.dart_client import DartClient
from app.services.watchlist import load_watchlist
from app.agents.runner import analyze_disclosure

DART_API_KEY = os.getenv("DART_API_KEY")


async def main():
    # 1. 관심 종목의 최근 공시 가져오기
    client = DartClient(DART_API_KEY)
    watchlist = load_watchlist()

    if not watchlist:
        print("관심 종목이 없습니다. test_filter.py를 먼저 실행하세요.")
        return

    stock = watchlist[0]  # 첫 번째 관심 종목
    print(f"분석 대상: {stock['corp_name']} ({stock['stock_code']})\n")

    from datetime import datetime, timedelta
    today = datetime.now().strftime("%Y%m%d")
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y%m%d")

    data = await client.get_disclosure_list(
        corp_code=stock["corp_code"],
        bgn_de=week_ago,
        end_de=today,
        page_count=5,
    )

    if data.get("status") != "000" or not data.get("list"):
        print("최근 공시가 없습니다.")
        return

    # 2. 각 공시를 AI로 분석
    for disclosure in data["list"][:3]:  # 최대 3건만
        title = disclosure["report_nm"]
        corp_name = disclosure["corp_name"]
        rcept_dt = disclosure["rcept_dt"]

        print(f"{'='*60}")
        print(f"[{rcept_dt}] {corp_name} - {title}")
        print(f"{'='*60}")

        # 공시 제목만으로 분석 (본문은 별도 API 필요)
        content = f"공시 제목: {title}\n접수일자: {rcept_dt}\n공시유형: {disclosure.get('pblntf_ty', '미분류')}"

        print("AI 분석 중...\n")
        result = await analyze_disclosure(corp_name, title, content)

        if isinstance(result, dict):
            print(f"  분류: {result.get('category', 'N/A')}")
            print(f"  중요도: {result.get('importance_score', 'N/A')}/100")
            print(f"  요약: {result.get('summary', 'N/A')}")
            print(f"  결론: {result.get('action_item', 'N/A')}")
        else:
            print(f"  결과: {result}")
        print()


if __name__ == "__main__":
    asyncio.run(main())
