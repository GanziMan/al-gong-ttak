"""DART API 연동 테스트"""
import httpx
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

DART_API_KEY = os.getenv("DART_API_KEY")
DART_BASE_URL = "https://opendart.fss.or.kr/api"


def test_disclosure_list():
    """최근 공시 목록 조회 테스트"""
    from datetime import datetime, timedelta

    today = datetime.now().strftime("%Y%m%d")
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y%m%d")

    params = {
        "crtfc_key": DART_API_KEY,
        "bgn_de": week_ago,
        "end_de": today,
        "page_no": 1,
        "page_count": 5,
    }
    resp = httpx.get(f"{DART_BASE_URL}/list.json", params=params)
    data = resp.json()

    if data.get("status") == "000":
        print("DART API 연동 성공!")
        print(f"총 {data.get('total_count', 0)}건의 공시")
        print()
        for item in data.get("list", []):
            print(f"  [{item['rcept_dt']}] {item['corp_name']} - {item['report_nm']}")
    else:
        print(f"API 오류: {data.get('status')} - {data.get('message')}")


if __name__ == "__main__":
    if not DART_API_KEY:
        print("DART_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.")
    else:
        print(f"API Key: {DART_API_KEY[:8]}...{DART_API_KEY[-4:]}")
        test_disclosure_list()
