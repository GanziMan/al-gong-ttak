"""설정 API"""
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.settings import load_settings, save_settings

router = APIRouter()


class UpdateSettingsRequest(BaseModel):
    telegram_enabled: bool | None = None
    telegram_chat_id: str | None = None
    min_importance_score: int | None = None
    alert_categories: list[str] | None = None
    disclosure_days: int | None = None


@router.get("")
async def get_settings():
    return load_settings()


@router.put("")
async def update_settings(req: UpdateSettingsRequest):
    current = load_settings()
    updates = req.model_dump(exclude_none=True)
    current.update(updates)
    save_settings(current)
    return current
