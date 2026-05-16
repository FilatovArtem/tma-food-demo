import asyncio
import logging

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.init_data import TgUser
from app.db.models import Dish, Order, OrderItem
from app.schemas.order import OrderCreate
from app.services.notify import notify_owner_safe

log = logging.getLogger(__name__)


async def create_order(
    session: AsyncSession,
    payload: OrderCreate,
    tg_user: TgUser,
) -> Order:
    ids = [item.dish_id for item in payload.items]
    res = await session.execute(select(Dish).where(Dish.id.in_(ids)))
    by_id = {dish.id: dish for dish in res.scalars().all()}

    for item in payload.items:
        dish = by_id.get(item.dish_id)
        if dish is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"unknown dish_id: {item.dish_id}",
            )
        if not dish.is_available:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"dish not available: {item.dish_id}",
            )

    items: list[OrderItem] = []
    total = 0
    for item in payload.items:
        dish = by_id[item.dish_id]
        items.append(
            OrderItem(
                dish_id=dish.id,
                dish_name=dish.name,
                unit_price=dish.price,
                qty=item.qty,
            )
        )
        total += dish.price * item.qty

    order = Order(
        tg_user_id=tg_user.id,
        customer_name=payload.name,
        phone=payload.phone,
        comment=payload.comment,
        total=total,
        status="new",
        items=items,
    )
    session.add(order)
    await session.commit()
    await session.refresh(order, attribute_names=["items"])

    try:
        asyncio.create_task(notify_owner_safe(order))
    except RuntimeError:
        log.warning("notify.no_running_loop", extra={"order_id": order.id})

    log.info("order.created", extra={"order_id": order.id, "total": total, "tg_user_id": tg_user.id})
    return order


async def get_order(session: AsyncSession, order_id: int, tg_user_id: int) -> Order:
    res = await session.execute(
        select(Order).where(Order.id == order_id, Order.tg_user_id == tg_user_id)
    )
    order = res.scalar_one_or_none()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "order not found")
    return order
