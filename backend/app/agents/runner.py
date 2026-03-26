"""ADK Runner - 에이전트 실행 헬퍼"""
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app.agents.categorizer import categorizer_agent, DisclosureAnalysis

session_service = InMemorySessionService()

runner = Runner(
    app_name="al_zal_ttak",
    agent=categorizer_agent,
    session_service=session_service,
)


async def analyze_disclosure(corp_name: str, title: str, content: str) -> dict:
    """공시를 AI로 분석"""
    session = await session_service.create_session(
        state={},
        app_name="al_zal_ttak",
        user_id="system",
    )

    message = f"""[종목명] {corp_name}
[공시 제목] {title}
[공시 내용]
{content}"""

    user_content = types.Content(
        role="user",
        parts=[types.Part(text=message)],
    )

    response_text = ""
    async for event in runner.run_async(
        session_id=session.id,
        user_id=session.user_id,
        new_message=user_content,
    ):
        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    response_text += part.text

    # output_schema 사용 시 session state에서 결과 가져오기
    updated_session = await session_service.get_session(
        app_name="al_zal_ttak",
        user_id="system",
        session_id=session.id,
    )

    result = updated_session.state.get("analysis_result")
    if result:
        return result

    # fallback: 텍스트 응답 반환
    return {
        "category": "단순정보",
        "importance_score": 0,
        "summary": response_text[:200] if response_text else "공시 핵심 정보 추출이 지연되었습니다. 기본 공시 정보만 제공합니다.",
        "action_item": "공시 원문에서 금액·비율·확정 여부를 먼저 확인한 뒤 판단하세요.",
        "raw_response": response_text,
    }
