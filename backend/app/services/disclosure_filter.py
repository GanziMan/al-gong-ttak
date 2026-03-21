"""관심 종목 공시 필터링"""
from datetime import datetime, timedelta

from app.services.dart_client import DartClient
from app.services.watchlist import load_watchlist


async def get_watchlist_disclosures(
    dart_client: DartClient,
    days: int = 1,
) -> list[dict]:
    """관심 종목의 최근 공시만 필터링하여 반환"""
    watchlist = load_watchlist()
    if not watchlist:
        return []

    today = datetime.now().strftime("%Y%m%d")
    start = (datetime.now() - timedelta(days=days)).strftime("%Y%m%d")

    results = []
    for stock in watchlist:
        data = await dart_client.get_disclosure_list(
            corp_code=stock["corp_code"],
            bgn_de=start,
            end_de=today,
            page_count=100,
        )
        if data.get("status") == "000":
            for item in data.get("list", []):
                item["_watchlist_name"] = stock["corp_name"]
                results.append(item)

    # 최신순 정렬
    results.sort(key=lambda x: x.get("rcept_dt", ""), reverse=True)
    return results
