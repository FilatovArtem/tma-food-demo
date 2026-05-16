import pytest


@pytest.mark.asyncio
async def test_valid_signature_passes(client, valid_headers):
    res = await client.get("/api/categories", headers=valid_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)
    assert len(res.json()) >= 1


@pytest.mark.asyncio
async def test_invalid_signature_returns_401(client, make_init_data_fn):
    raw = make_init_data_fn(tamper_hash=True)
    res = await client.get("/api/categories", headers={"Authorization": f"tma {raw}"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_expired_auth_date_returns_401(client, make_init_data_fn):
    raw = make_init_data_fn(auth_date_offset=-7200)
    res = await client.get("/api/categories", headers={"Authorization": f"tma {raw}"})
    assert res.status_code == 401
    assert "expired" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_missing_hash_returns_401(client, make_init_data_fn):
    raw = make_init_data_fn(omit_hash=True)
    res = await client.get("/api/categories", headers={"Authorization": f"tma {raw}"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_missing_authorization_header_returns_401(client):
    res = await client.get("/api/categories")
    assert res.status_code in (401, 422)


@pytest.mark.asyncio
async def test_wrong_scheme_returns_401(client):
    res = await client.get("/api/categories", headers={"Authorization": "Bearer abc"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_url_encoded_user_json_parsed(client, valid_headers):
    res = await client.get("/api/dishes", headers=valid_headers)
    assert res.status_code == 200
