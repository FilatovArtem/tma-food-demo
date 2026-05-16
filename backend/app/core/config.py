from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )

    bot_token: str = ""
    admin_chat_id: int | None = None
    webapp_url: str = ""

    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    database_url: str = "sqlite+aiosqlite:///./data/app.db"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    cors_origins_raw: str = Field(default="", alias="CORS_ORIGINS")

    init_data_max_age: int = 3600
    log_level: str = "INFO"

    @property
    def cors_origins(self) -> list[str]:
        if not self.cors_origins_raw:
            return []
        return [item.strip() for item in self.cors_origins_raw.split(",") if item.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
