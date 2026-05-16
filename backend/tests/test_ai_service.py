import json
from types import SimpleNamespace

import pytest


def _mock_openai_response(payload: dict) -> SimpleNamespace:
    return SimpleNamespace(
        choices=[
            SimpleNamespace(message=SimpleNamespace(content=json.dumps(payload)))
        ]
    )


class _FakeCompletions:
    def __init__(self, payload=None, raise_exc=None):
        self.payload = payload
        self.raise_exc = raise_exc

    async def create(self, **_):
        if self.raise_exc is not None:
            raise self.raise_exc
        return _mock_openai_response(self.payload)


class _FakeChat:
    def __init__(self, completions):
        self.completions = completions


class _FakeOpenAI:
    def __init__(self, payload=None, raise_exc=None):
        self.chat = _FakeChat(_FakeCompletions(payload=payload, raise_exc=raise_exc))


def _patch_openai(monkeypatch, fake):
    from app.services import ai as ai_service

    monkeypatch.setattr(ai_service, "get_openai_client", lambda: fake)


@pytest.mark.asyncio
async def test_ai_returns_recs_when_openai_returns_known_ids(
    client, valid_headers, monkeypatch
):
    _patch_openai(
        monkeypatch,
        _FakeOpenAI(payload={"recommendations": [
            {"dish_id": 4, "reason": "Лёгкий выбор"},
            {"dish_id": 11, "reason": "Бодрит"},
        ]}),
    )
    res = await client.post(
        "/api/ai/recommend",
        headers=valid_headers,
        json={"query": "что-то лёгкое"},
    )
    assert res.status_code == 200
    body = res.json()
    ids = {r["dish_id"] for r in body["recommendations"]}
    assert {4, 11}.issubset(ids)


@pytest.mark.asyncio
async def test_ai_filters_unknown_dish_ids(client, valid_headers, monkeypatch):
    _patch_openai(
        monkeypatch,
        _FakeOpenAI(payload={"recommendations": [
            {"dish_id": 999, "reason": "phantom"},
            {"dish_id": 4, "reason": "real"},
        ]}),
    )
    res = await client.post(
        "/api/ai/recommend",
        headers=valid_headers,
        json={"query": "что угодно"},
    )
    assert res.status_code == 200
    ids = {r["dish_id"] for r in res.json()["recommendations"]}
    assert 999 not in ids
    assert 4 in ids


@pytest.mark.asyncio
async def test_ai_falls_back_on_openai_timeout(client, valid_headers, monkeypatch):
    _patch_openai(
        monkeypatch,
        _FakeOpenAI(raise_exc=TimeoutError("openai timeout")),
    )
    res = await client.post(
        "/api/ai/recommend",
        headers=valid_headers,
        json={"query": "лёгкий салат"},
    )
    assert res.status_code == 200
    assert "recommendations" in res.json()


@pytest.mark.asyncio
async def test_ai_falls_back_on_invalid_json(client, valid_headers, monkeypatch):
    class _Bad:
        chat = _FakeChat(_FakeCompletions(payload={}))

        async def create(self, **_):
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content="not json"))]
            )

    bad = _Bad()
    bad.chat.completions = _FakeCompletions(payload=None)
    bad.chat.completions.create = _Bad.create.__get__(bad)
    from app.services import ai as ai_service
    monkeypatch.setattr(ai_service, "get_openai_client", lambda: bad)

    res = await client.post(
        "/api/ai/recommend",
        headers=valid_headers,
        json={"query": "лёгкий"},
    )
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_ai_query_too_long_returns_422(client, valid_headers):
    res = await client.post(
        "/api/ai/recommend",
        headers=valid_headers,
        json={"query": "x" * 201},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_ai_empty_query_returns_422(client, valid_headers):
    res = await client.post(
        "/api/ai/recommend",
        headers=valid_headers,
        json={"query": ""},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_ai_fallback_substring_matcher(client, valid_headers, monkeypatch):
    _patch_openai(
        monkeypatch,
        _FakeOpenAI(raise_exc=RuntimeError("openai down")),
    )
    res = await client.post(
        "/api/ai/recommend",
        headers=valid_headers,
        json={"query": "латте"},
    )
    assert res.status_code == 200
    body = res.json()
    if body["recommendations"]:
        ids = {r["dish_id"] for r in body["recommendations"]}
        assert 11 in ids  # Латте
