import pytest


@pytest.mark.asyncio
async def test_health_no_auth_required(client):
    res = await client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["db"] == "ok"
