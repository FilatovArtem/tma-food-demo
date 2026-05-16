from functools import lru_cache

import httpx
from openai import AsyncOpenAI

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_openai_client() -> AsyncOpenAI:
    settings = get_settings()
    # trust_env=True picks up HTTP_PROXY / HTTPS_PROXY from container env
    # (needed for RU deployments routing through Xray on the host).
    http_client = httpx.AsyncClient(timeout=8.0, trust_env=True)
    return AsyncOpenAI(
        api_key=settings.openai_api_key,
        timeout=8.0,
        http_client=http_client,
    )
