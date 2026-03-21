"""전체 파이프라인: 관심 종목 공시 수집 → AI 분석 → 텔레그램 알림"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

from app.services.dart_client import DartClient
from app.services.disclosure_filter import get_watchlist_disclosures
from app.services.watchlist import load_watchlist
from app.agents.runner import analyze_disclosure
from bot.telegram_bot import send_alert, format_disclosure_alert

DART_API_KEY = os.getenv("DART_API_KEY")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")


async def main():
    watchlist = load_watchlist()
    if not watchlist:
        print("관심 종목이 없습니다.")
        return

    print(f"관심 종목: {[w['corp_name'] for w in watchlist]}")
    print("공시 수집 중...\n")

    # 1. 공시 수집
    client = DartClient(DART_API_KEY)
    disclosures = await get_watchlist_disclosures(client, days=3)

    if not disclosures:
        print("최근 공시가 없습니다.")
        return

    print(f"총 {len(disclosures)}건 발견. AI 분석 시작...\n")

    # 2. AI 분석 + 3. 텔레그램 전송
    sent_count = 0
    for d in disclosures:
        corp_name = d["corp_name"]
        title = d["report_nm"].strip()
        rcept_dt = d["rcept_dt"]

        content = f"공시 제목: {title}\n접수일자: {rcept_dt}"

        print(f"[분석중] {corp_name} - {title}")
        result = await analyze_disclosure(corp_name, title, content)

        category = result.get("category", "분석실패")
        importance = result.get("importance_score", 0)
        summary = result.get("summary", "")
        action_item = result.get("action_item", "")

        print(f"  → {category} (중요도: {importance})")

        # 중요도 30 이상만 텔레그램 전송 (노이즈 필터링)
        if importance >= 30:
            message = format_disclosure_alert(
                corp_name, title, category, importance, summary, action_item
            )
            await send_alert(BOT_TOKEN, CHAT_ID, message)
            sent_count += 1
            print(f"  → 텔레그램 전송 완료!")

    print(f"\n완료! 총 {len(disclosures)}건 분석, {sent_count}건 알림 전송")


if __name__ == "__main__":
    asyncio.run(main())
