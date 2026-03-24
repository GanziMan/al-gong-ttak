"""인증 API — Supabase Auth 기반"""
from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "nickname": user.nickname,
        "profile_image": user.profile_image,
    }
