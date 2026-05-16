import logging

from aiogram import Bot, Dispatcher

from app.config import get_settings
from app.handlers.start import router as start_router

log = logging.getLogger(__name__)


def build_bot() -> Bot:
    settings = get_settings()
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
