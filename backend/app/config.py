from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()  # Google SDK 등이 필요로 하는 환경변수를 os.environ에 로드


class Settings(BaseSettings):
    dart_api_key: str = ""
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    database_url: str = "postgresql+asyncpg://localhost/al_zal_ttak"

    # Supabase Auth
    supabase_url: str = ""  # e.g. https://xxxx.supabase.co

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
