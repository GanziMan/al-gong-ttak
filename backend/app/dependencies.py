"""FastAPI 의존성 (인증) — 유저 정보를 메모리 캐시"""
import time
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select

from app.database import async_session
from app.models.user import User
from app.services.auth import decode_supabase_jwt, get_or_create_user_from_supabase

logger = logging.getLogger(__name__)
_bearer = HTTPBearer(auto_error=False)

# supabase_uid -> (User, timestamp)
_user_cache: dict[str, tuple[User, float]] = {}
_USER_CACHE_TTL = 300  # 5분


async def get_current_user(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> User:
    if not cred:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_supabase_jwt(cred.credentials)
        supabase_uid = payload["sub"]
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    # 메모리 캐시 확인
    now = time.time()
    cached = _user_cache.get(supabase_uid)
    if cached:
        user, ts = cached
        if now - ts < _USER_CACHE_TTL:
            return user

    # 캐시 미스 → DB 조회
    t0 = time.time()
    async with async_session() as session:
        result = await session.execute(
            select(User).where(User.supabase_uid == supabase_uid)
        )
        user = result.scalar_one_or_none()

    if not user:
        # 첫 로그인: user_metadata에서 카카오 정보 추출 후 유저 생성/링크
        user_meta = payload.get("user_metadata", {})
        kakao_id = str(user_meta.get("provider_id", ""))
        nickname = user_meta.get("name", user_meta.get("full_name", ""))
        profile_image = user_meta.get("avatar_url", "")
        user = await get_or_create_user_from_supabase(
            supabase_uid=supabase_uid,
            kakao_id=kakao_id,
            nickname=nickname,
            profile_image=profile_image,
        )

    elapsed = (time.time() - t0) * 1000
    logger.info("get_current_user DB took %.0fms (cache miss)", elapsed)

    _user_cache[supabase_uid] = (user, now)
    return user
