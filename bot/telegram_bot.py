"""텔레그램 봇 - 실시간 공시/뉴스 알림 전송"""
import httpx


async def send_alert(bot_token: str, chat_id: str, message: str):
    """텔레그램으로 알림 전송 (httpx 사용)"""
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    async with httpx.AsyncClient() as client:
        await client.post(url, json={
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "Markdown",
        })


def format_disclosure_alert(
    corp_name: str,
    title: str,
    category: str,
    importance: int,
    summary: str,
    action_item: str,
) -> str:
    """공시 알림 메시지 포맷"""
    emoji = {"호재": "🟢", "악재": "🔴", "중립": "⚪", "단순정보": "ℹ️"}.get(
        category, "📋"
    )

    return f"""{emoji} *{corp_name}* 공시 알림

📌 *{title}*
분류: {category} | 중요도: {importance}/100

📝 요약:
{summary}

💡 결론: {action_item}""".strip()
