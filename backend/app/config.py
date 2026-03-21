from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()  # Google SDK 등이 필요로 하는 환경변수를 os.environ에 로드


class Settings(BaseSettings):
    dart_api_key: str = ""
    llm_api_key: str = ""
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    database_url: str = "sqlite+aiosqlite:///./al_zal_ttak.db"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
