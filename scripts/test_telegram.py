"""Step 3 테스트: 텔레그램 봇 연동"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

import httpx

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
BASE_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"


async def get_bot_info():
    """봇 정보 확인"""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{BASE_URL}/getMe")
        data = resp.json()
        if data["ok"]:
            bot = data["result"]
            print(f"봇 이름: {bot['first_name']}")
            print(f"봇 username: @{bot['username']}")
            return True
        else:
            print(f"봇 연결 실패: {data}")
            return False


async def get_chat_id():
    """최근 메시지에서 chat_id 가져오기"""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{BASE_URL}/getUpdates")
        data = resp.json()
        if data["ok"] and data["result"]:
            chat_id = data["result"][-1]["message"]["chat"]["id"]
            chat_name = data["result"][-1]["message"]["chat"].get("first_name", "")
            print(f"\nchat_id: {chat_id} ({chat_name})")
            return chat_id
        else:
            print("\n아직 메시지가 없습니다.")
            print("텔레그램에서 봇에게 아무 메시지(예: /start)를 보낸 후 다시 실행하세요.")
            return None


async def send_test_message(chat_id):
    """테스트 메시지 전송"""
    message = """🔔 *알잘딱 공시봇* 테스트

🟢 *삼성전자* 공시 알림

📌 *기업가치제고계획(자율공시)*
분류: 호재 | 중요도: 80/100

📝 요약:
삼성전자가 기업가치 제고 계획을 자율 공시하며, 회사의 가치 상승을 위한 전략적 노력을 예고했습니다.

💡 결론: 주주환원 정책 변화를 면밀히 관찰하세요"""

    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{BASE_URL}/sendMessage", json={
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "Markdown",
        })
        data = resp.json()
        if data["ok"]:
            print("\n텔레그램 메시지 전송 성공! 앱에서 확인하세요.")
        else:
            print(f"\n전송 실패: {data}")


async def main():
    print("=== 텔레그램 봇 연동 테스트 ===\n")

    ok = await get_bot_info()
    if not ok:
        return

    chat_id = await get_chat_id()
    if chat_id:
        await send_test_message(chat_id)


if __name__ == "__main__":
    asyncio.run(main())
