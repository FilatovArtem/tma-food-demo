from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_tg_user
from app.auth.init_data import TgUser
from app.db.engine import get_db
from app.schemas.order import OrderCreate, OrderOut
from app.services.order import create_order, get_order

router = APIRouter()


@router.post("/orders", response_model=OrderOut)
async def post_order(
    payload: OrderCreate,
    tg_user: TgUser = Depends(require_tg_user),
    db: AsyncSession = Depends(get_db),
) -> OrderOut:
    order = await create_order(db, payload, tg_user)
    return OrderOut.model_validate(order)


@router.get("/orders/{order_id}", response_model=OrderOut)
async def fetch_order(
    order_id: int,
    tg_user: TgUser = Depends(require_tg_user),
    db: AsyncSession = Depends(get_db),
) -> OrderOut:
    order = await get_order(db, order_id, tg_user.id)
    return OrderOut.model_validate(order)
