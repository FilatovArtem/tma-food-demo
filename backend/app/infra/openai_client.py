from functools import lru_cache

from openai import AsyncOpenAI

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_openai_client() -> AsyncOpenAI:
    settings = get_settings()
    return AsyncOpenAI(api_key=settings.openai_api_key, timeout=8.0)
