"""FastAPI 의존성 (인증) — 유저 정보를 메모리 캐시"""
import time
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.database import async_session
from app.models.user import User
from app.services.auth import decode_jwt

logger = logging.getLogger(__name__)
_bearer = HTTPBearer(auto_error=False)

# user_id -> (User, timestamp)
_user_cache: dict[int, tuple[User, float]] = {}
_USER_CACHE_TTL = 300  # 5분


async def get_current_user(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> User:
    if not cred:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_jwt(cred.credentials)
        user_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    # 메모리 캐시 확인
    now = time.time()
    cached = _user_cache.get(user_id)
    if cached:
        user, ts = cached
        if now - ts < _USER_CACHE_TTL:
            return user

    # 캐시 미스 → DB 조회
    t0 = time.time()
    async with async_session() as session:
        user = await session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    elapsed = (time.time() - t0) * 1000
    logger.info("get_current_user DB took %.0fms (cache miss)", elapsed)

    # 캐시에 저장 (detached 상태로)
    _user_cache[user_id] = (user, now)
    return user
