from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )

    bot_token: str = Field(..., min_length=1)
    webapp_url: str = ""


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
