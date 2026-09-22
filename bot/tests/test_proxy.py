import pytest

from app.bot import _resolve_proxy

PROXY_ENV_VARS = ("HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy")


@pytest.fixture(autouse=True)
def _clear_proxy_env(monkeypatch: pytest.MonkeyPatch):
    for key in PROXY_ENV_VARS:
        monkeypatch.delenv(key, raising=False)


def test_returns_none_when_nothing_set() -> None:
    assert _resolve_proxy() is None


def test_reads_https_proxy(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("HTTPS_PROXY", "http://proxy:10808")
    assert _resolve_proxy() == "http://proxy:10808"


def test_https_proxy_takes_precedence_over_http_proxy(monkeypatch: pytest.MonkeyPatch) -> None:
    # aiogram talks to api.telegram.org over HTTPS, so a lower-priority
    # HTTP_PROXY must not silently override HTTPS_PROXY.
    monkeypatch.setenv("HTTPS_PROXY", "http://proxy-a:10808")
    monkeypatch.setenv("HTTP_PROXY", "http://proxy-b:10808")
    assert _resolve_proxy() == "http://proxy-a:10808"

    monkeypatch.delenv("HTTPS_PROXY")
    assert _resolve_proxy() == "http://proxy-b:10808"
