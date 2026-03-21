"""AI 분석 결과 캐싱 (rcept_no 기준, JSON 파일)"""
import json
from pathlib import Path

CACHE_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "analysis_cache"


def _cache_path(rcept_no: str) -> Path:
    return CACHE_DIR / f"{rcept_no}.json"


def get_cached_analysis(rcept_no: str) -> dict | None:
    path = _cache_path(rcept_no)
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_analysis(rcept_no: str, analysis: dict):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with open(_cache_path(rcept_no), "w", encoding="utf-8") as f:
        json.dump(analysis, f, ensure_ascii=False, indent=2)


def list_cached() -> list[str]:
    if not CACHE_DIR.exists():
        return []
    return [p.stem for p in CACHE_DIR.glob("*.json")]
