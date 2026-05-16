import logging

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)

from app.config import get_settings

log = logging.getLogger(__name__)
router = Router(name=__name__)


@router.message(CommandStart())
async def on_start(message: Message) -> None:
    settings = get_settings()
    user = message.from_user
    name = user.first_name if user and user.first_name else "друг"

    if not settings.webapp_url:
        await message.answer(
            "⚠️ Mini App ещё не настроен. Администратор: задайте WEBAPP_URL в .env"
        )
        log.warning("start.webapp_url_missing")
        return

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🍽 Открыть меню",
                    web_app=WebAppInfo(url=settings.webapp_url),
                )
            ]
        ]
    )

    await message.answer(
        f"Привет, {name}! 👋\n\n"
        "Я бот демо-ресторана FoodOrder. Открой меню — посмотри блюда, "
        "попробуй AI-подбор и оформи заказ.",
        reply_markup=keyboard,
    )
