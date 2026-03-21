from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    dart_api_key: str = ""
    llm_api_key: str = ""
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    database_url: str = "sqlite+aiosqlite:///./al_zal_ttak.db"

    model_config = {"env_file": ".env"}


settings = Settings()
