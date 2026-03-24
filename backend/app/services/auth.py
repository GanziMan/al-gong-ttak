"""Supabase Auth 인증 서비스"""
from __future__ import annotations

from datetime import datetime

import jwt
from jwt import PyJWKClient
from sqlalchemy import select

from app.config import settings
from app.database import async_session
from app.models.user import User

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


def decode_supabase_jwt(token: str) -> dict:
    """Supabase JWT 디코딩 (JWKS 공개키, aud=authenticated)"""
    signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256", "RS256"],
        audience="authenticated",
    )


async def get_or_create_user_from_supabase(
    supabase_uid: str,
    kakao_id: str,
    nickname: str,
    profile_image: str,
) -> User:
    """supabase_uid로 유저 조회, 없으면 kakao_id로 기존 유저 링크, 없으면 신규 생성"""
    async with async_session() as session:
        # 1) supabase_uid로 조회
        result = await session.execute(
            select(User).where(User.supabase_uid == supabase_uid)
        )
        user = result.scalar_one_or_none()

        if user:
            user.nickname = nickname
            user.profile_image = profile_image
            user.last_login = datetime.utcnow()
            await session.commit()
            await session.refresh(user)
            return user

        # 2) kakao_id로 기존 유저 검색 → supabase_uid 연결
        if kakao_id:
            result = await session.execute(
                select(User).where(User.kakao_id == kakao_id)
            )
            user = result.scalar_one_or_none()
            if user:
                user.supabase_uid = supabase_uid
                user.nickname = nickname
                user.profile_image = profile_image
                user.last_login = datetime.utcnow()
                await session.commit()
                await session.refresh(user)
                return user

        # 3) 새 유저 생성
        user = User(
            kakao_id=kakao_id or supabase_uid,
            supabase_uid=supabase_uid,
            nickname=nickname,
            profile_image=profile_image,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user
