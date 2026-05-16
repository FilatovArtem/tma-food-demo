import logging
import os

from aiogram import Bot, Dispatcher
from aiogram.client.session.aiohttp import AiohttpSession

from app.config import get_settings
from app.handlers.start import router as start_router

log = logging.getLogger(__name__)


def _resolve_proxy() -> str | None:
    # aiogram does NOT read HTTP_PROXY automatically. Wire explicitly.
    for key in ("HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"):
        value = os.environ.get(key)
        if value:
            return value
    return None


def build_bot() -> Bot:
    settings = get_settings()
    proxy = _resolve_proxy()
    if proxy:
        log.info("bot.using_proxy", extra={"proxy": proxy})
        session = AiohttpSession(proxy=proxy)
        return Bot(token=settings.bot_token, session=session)
    return Bot(token=settings.bot_token)


def build_dispatcher() -> Dispatcher:
    dp = Dispatcher()
    dp.include_router(start_router)
    return dp


async def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    bot = build_bot()
    dp = build_dispatcher()
    log.info("bot.start_polling")
    try:
        await dp.start_polling(bot)
    finally:
        await bot.session.close()
        log.info("bot.session_closed")
