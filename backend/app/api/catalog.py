from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_tg_user
from app.db.engine import get_db
from app.db.models import Category, Dish
from app.schemas.category import CategoryOut
from app.schemas.dish import DishOut

router = APIRouter()


@router.get(
    "/categories",
    response_model=list[CategoryOut],
    dependencies=[Depends(require_tg_user)],
)
async def list_categories(db: AsyncSession = Depends(get_db)) -> list[Category]:
    res = await db.execute(select(Category).order_by(Category.order))
    return list(res.scalars().all())


@router.get(
    "/dishes",
    response_model=list[DishOut],
    dependencies=[Depends(require_tg_user)],
)
async def list_dishes(
    category_id: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[Dish]:
    stmt = select(Dish).where(Dish.is_available.is_(True))
    if category_id is not None:
        stmt = stmt.where(Dish.category_id == category_id)
    stmt = stmt.order_by(Dish.id)
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.get(
    "/dishes/{dish_id}",
    response_model=DishOut,
    dependencies=[Depends(require_tg_user)],
)
async def get_dish(dish_id: int, db: AsyncSession = Depends(get_db)) -> Dish:
    res = await db.execute(select(Dish).where(Dish.id == dish_id))
    dish = res.scalar_one_or_none()
    if dish is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "dish not found")
    return dish
