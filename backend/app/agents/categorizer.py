"""공시/뉴스를 호재, 악재, 중립으로 분류하는 AI 에이전트 (Google ADK)"""
from google.adk.agents import LlmAgent
from pydantic import BaseModel, Field


class DisclosureAnalysis(BaseModel):
    """공시 분석 결과"""
    category: str = Field(description="호재, 악재, 중립, 단순정보 중 하나")
    importance_score: int = Field(description="주가 영향도 0~100")
    summary: str = Field(description="3줄 이내 핵심 요약")
    action_item: str = Field(description="투자자를 위한 한 줄 결론")


categorizer_agent = LlmAgent(
    name="disclosure_categorizer",
    model="gemini-2.5-flash",
    description="공시/뉴스 내용을 분석하여 호재/악재를 분류하고 요약하는 에이전트",
    instruction="""당신은 한국 주식시장 전문 AI 분석가입니다.

사용자가 제공하는 공시 또는 뉴스 내용을 분석하여 다음을 판단하세요:

1. **분류(category)**: 호재 / 악재 / 중립 / 단순정보
   - 호재: 매출 증가, 신사업 진출, 배당 확대, 자사주 매입 등
   - 악재: 적자 전환, 유상증자, 대표 횡령, 소송 패소 등
   - 중립: 임원 변동, 정기 주총 결과 등
   - 단순정보: 정기 보고서 제출, 사업보고서 등

2. **중요도 점수(importance_score)**: 0~100
   - 80 이상: 당장 주가에 큰 영향 (유상증자, 대규모 계약 등)
   - 50~79: 중기적 영향 가능성
   - 20~49: 참고 수준
   - 0~19: 형식적/정기적 공시

3. **3줄 요약(summary)**: 공시의 핵심 내용을 간결하게

4. **한 줄 결론(action_item)**: 투자자가 취해야 할 행동 제안

항상 한국어로 응답하세요. 확실하지 않은 추측은 하지 마세요.""",
    output_schema=DisclosureAnalysis,
    output_key="analysis_result",
)
