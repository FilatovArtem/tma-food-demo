import pytest

from app.config import get_settings
from app.handlers.start import on_start


class FakeUser:
    def __init__(self, first_name: str | None = None) -> None:
        self.first_name = first_name


class FakeMessage:
    """Duck-typed stand-in for aiogram's Message — on_start only touches
    .from_user and .answer(), so a real Message/Bot pair would be pure setup."""

    def __init__(self, first_name: str | None = "Аня", has_user: bool = True) -> None:
        self.from_user = FakeUser(first_name) if has_user else None
        self.answer_calls: list[tuple[str, object]] = []

    async def answer(self, text: str, reply_markup=None) -> None:
        self.answer_calls.append((text, reply_markup))


@pytest.fixture(autouse=True)
def _settings_env(monkeypatch: pytest.MonkeyPatch):
    # get_settings() is lru_cache'd — every test needs its own env + a clear,
    # otherwise it reads a stale Settings instance from a previous test.
    monkeypatch.setenv("BOT_TOKEN", "123456:TEST-TOKEN")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


async def test_webapp_configured_sends_open_menu_button(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("WEBAPP_URL", "https://example.test")
    get_settings.cache_clear()

    message = FakeMessage(first_name="Аня")
    await on_start(message)

    assert len(message.answer_calls) == 1
    text, keyboard = message.answer_calls[0]
    assert "Аня" in text
    button = keyboard.inline_keyboard[0][0]
    assert button.web_app.url == "https://example.test"


async def test_webapp_missing_warns_admin_without_keyboard(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("WEBAPP_URL", "")
    get_settings.cache_clear()

    message = FakeMessage(first_name="Аня")
    await on_start(message)

    assert len(message.answer_calls) == 1
    text, keyboard = message.answer_calls[0]
    assert "webapp_url" in text.lower()
    assert keyboard is None


async def test_missing_first_name_falls_back_to_generic_greeting(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("WEBAPP_URL", "https://example.test")
    get_settings.cache_clear()

    message = FakeMessage(first_name=None)
    await on_start(message)

    text, _ = message.answer_calls[0]
    assert "друг" in text


async def test_no_from_user_falls_back_to_generic_greeting(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("WEBAPP_URL", "https://example.test")
    get_settings.cache_clear()

    message = FakeMessage(has_user=False)
    await on_start(message)

    text, _ = message.answer_calls[0]
    assert "друг" in text
