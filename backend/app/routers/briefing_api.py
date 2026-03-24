"""오늘의 AI 브리핑 API"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select

from app.database import async_session
from app.models.user import User
from app.services.briefing import generate_daily_briefing
from app.services.auth import decode_supabase_jwt

router = APIRouter()

_bearer = HTTPBearer(auto_error=False)


@router.get("/daily")
async def daily_briefing(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
):
    """선택적 인증: 토큰 있으면 관심종목 필터, 없으면 전체"""
    user_id = None
    if cred:
        try:
            payload = decode_supabase_jwt(cred.credentials)
            supabase_uid = payload["sub"]
            async with async_session() as session:
                result = await session.execute(
                    select(User.id).where(User.supabase_uid == supabase_uid)
                )
                user_id = result.scalar_one_or_none()
        except Exception:
            pass
    briefing = await generate_daily_briefing(user_id=user_id)
    return briefing
