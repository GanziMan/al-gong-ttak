"""사용자 설정 관리 (JSON 파일)"""
import json
from pathlib import Path

SETTINGS_PATH = Path(__file__).resolve().parent.parent.parent.parent / "data" / "settings.json"

DEFAULT_SETTINGS = {
    "telegram_enabled": True,
    "telegram_chat_id": "",
    "min_importance_score": 30,
    "categories": ["호재", "악재", "중립", "단순정보"],
    "alert_categories": ["호재", "악재"],
    "disclosure_days": 7,
}


def load_settings() -> dict:
    if not SETTINGS_PATH.exists():
        save_settings(DEFAULT_SETTINGS)
        return DEFAULT_SETTINGS.copy()
    with open(SETTINGS_PATH, "r", encoding="utf-8") as f:
        stored = json.load(f)
    merged = {**DEFAULT_SETTINGS, **stored}
    return merged


def save_settings(settings: dict):
    SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(SETTINGS_PATH, "w", encoding="utf-8") as f:
        json.dump(settings, f, ensure_ascii=False, indent=2)
