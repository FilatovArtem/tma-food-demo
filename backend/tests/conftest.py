import hashlib
import hmac
import json
import time
from typing import AsyncIterator
from urllib.parse import urlencode

import httpx
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

TEST_BOT_TOKEN = "1234567890:TEST_token_for_unit_tests_only"


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("BOT_TOKEN", TEST_BOT_TOKEN)
    monkeypatch.setenv("ADMIN_CHAT_ID", "999999")
    monkeypatch.setenv("WEBAPP_URL", "https://example.test")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-4o-mini")
    monkeypatch.setenv("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
    monkeypatch.setenv("INIT_DATA_MAX_AGE", "3600")
    monkeypatch.setenv("CORS_ORIGINS", "https://example.test")

    from app.core.config import get_settings

    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest_asyncio.fixture
async def engine_sm():
    from app.db.models import Base
    from app.db.seed import load_seed_if_empty

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    sm = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with sm() as session:
        await load_seed_if_empty(session)
    yield engine, sm
    await engine.dispose()


@pytest_asyncio.fixture
async def client(engine_sm, monkeypatch) -> AsyncIterator[httpx.AsyncClient]:
    from app.db.engine import get_db
    from app.main import create_app
    from app.services import notify

    async def _noop_notify(order):
        return None

    monkeypatch.setattr(notify, "notify_owner_safe", _noop_notify)

    engine, sm = engine_sm
    app = create_app()

    async def _get_db() -> AsyncIterator[AsyncSession]:
        async with sm() as session:
            yield session

    app.dependency_overrides[get_db] = _get_db

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


def make_init_data(
    token: str = TEST_BOT_TOKEN,
    user_id: int = 12345,
    auth_date_offset: int = 0,
    first_name: str = "Artem",
    username: str = "artem",
    tamper_hash: bool = False,
    omit_hash: bool = False,
    omit_user: bool = False,
) -> str:
    user = json.dumps(
        {"id": user_id, "first_name": first_name, "username": username},
        ensure_ascii=False,
    )
    auth_date = int(time.time()) + auth_date_offset
    pairs: dict[str, str] = {
        "auth_date": str(auth_date),
        "query_id": "AAH_test_query_id",
    }
    if not omit_user:
        pairs["user"] = user

    data_check_string = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    h = hmac.new(secret, data_check_string.encode(), hashlib.sha256).hexdigest()

    if tamper_hash:
        h = "0" * len(h)

    out = dict(pairs)
    if not omit_hash:
        out["hash"] = h
    return urlencode(out)


@pytest.fixture
def valid_headers() -> dict[str, str]:
    return {"Authorization": "tma " + make_init_data()}


@pytest.fixture
def make_init_data_fn():
    return make_init_data
