from functools import lru_cache

import httpx

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_telegram_client() -> httpx.AsyncClient:
    settings = get_settings()
    return httpx.AsyncClient(
        base_url=f"https://api.telegram.org/bot{settings.bot_token}",
        timeout=10.0,
    )
