"""관심 종목 관리 (JSON 파일 기반, 추후 DB 전환)"""
import json
from pathlib import Path

WATCHLIST_PATH = Path(__file__).resolve().parent.parent.parent.parent / "data" / "watchlist.json"


def load_watchlist() -> list[dict]:
    """관심 종목 목록 로드"""
    if not WATCHLIST_PATH.exists():
        return []
    with open(WATCHLIST_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_watchlist(watchlist: list[dict]):
    """관심 종목 목록 저장"""
    WATCHLIST_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(WATCHLIST_PATH, "w", encoding="utf-8") as f:
        json.dump(watchlist, f, ensure_ascii=False, indent=2)


def add_stock(corp_code: str, corp_name: str, stock_code: str) -> list[dict]:
    """관심 종목 추가"""
    watchlist = load_watchlist()
    if any(w["corp_code"] == corp_code for w in watchlist):
        return watchlist  # 이미 존재
    watchlist.append({
        "corp_code": corp_code,
        "corp_name": corp_name,
        "stock_code": stock_code,
    })
    save_watchlist(watchlist)
    return watchlist


def remove_stock(corp_code: str) -> list[dict]:
    """관심 종목 제거"""
    watchlist = load_watchlist()
    watchlist = [w for w in watchlist if w["corp_code"] != corp_code]
    save_watchlist(watchlist)
    return watchlist
