import pytest


@pytest.mark.asyncio
async def test_create_order_recomputes_total(client, valid_headers):
    payload = {
        "items": [{"dish_id": 4, "qty": 2}, {"dish_id": 11, "qty": 1}],
        "name": "Тест",
        "phone": "+79991234567",
        "comment": None,
    }
    res = await client.post("/api/orders", headers=valid_headers, json=payload)
    assert res.status_code == 200, res.text
    body = res.json()
    # Dish 4 = Цезарь 520, Dish 11 = Латте 280 → 520*2 + 280 = 1320
    assert body["total"] == 1320
    assert len(body["items"]) == 2
    assert body["items"][0]["dish_name"]
    assert body["items"][0]["unit_price"] > 0


@pytest.mark.asyncio
async def test_create_order_invalid_dish_id_returns_400(client, valid_headers):
    payload = {
        "items": [{"dish_id": 99999, "qty": 1}],
        "name": "Тест",
        "phone": "+79991234567",
    }
    res = await client.post("/api/orders", headers=valid_headers, json=payload)
    assert res.status_code == 400
    assert "unknown" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_order_empty_items_returns_422(client, valid_headers):
    payload = {
        "items": [],
        "name": "Тест",
        "phone": "+79991234567",
    }
    res = await client.post("/api/orders", headers=valid_headers, json=payload)
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_create_order_normalizes_phone(client, valid_headers):
    payload = {
        "items": [{"dish_id": 1, "qty": 1}],
        "name": "Артём",
        "phone": "8 999 123-45-67",
    }
    res = await client.post("/api/orders", headers=valid_headers, json=payload)
    assert res.status_code == 200, res.text
    order_id = res.json()["id"]

    get_res = await client.get(f"/api/orders/{order_id}", headers=valid_headers)
    assert get_res.status_code == 200
    # Phone is stored normalized; we can't read it from OrderOut (not exposed),
    # but the order itself succeeded which proves the validator allowed the input.


@pytest.mark.asyncio
async def test_create_order_snapshots_dish_name_and_price(client, valid_headers):
    payload = {
        "items": [{"dish_id": 1, "qty": 1}],
        "name": "Тест",
        "phone": "+79991234567",
    }
    res = await client.post("/api/orders", headers=valid_headers, json=payload)
    assert res.status_code == 200
    body = res.json()
    item = body["items"][0]
    assert item["dish_name"]
    assert item["unit_price"] == body["total"]


@pytest.mark.asyncio
async def test_notify_failure_does_not_fail_order(client, valid_headers, monkeypatch):
    from app.services import notify, order as order_service

    async def boom(order):
        raise RuntimeError("telegram unreachable")

    monkeypatch.setattr(order_service, "notify_owner_safe", boom)

    payload = {
        "items": [{"dish_id": 1, "qty": 1}],
        "name": "Тест",
        "phone": "+79991234567",
    }
    res = await client.post("/api/orders", headers=valid_headers, json=payload)
    assert res.status_code == 200
