import json
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Category, Dish

SEED_PATH = Path(__file__).parent.parent.parent / "data" / "seed.json"


async def load_seed_if_empty(session: AsyncSession) -> None:
    count = await session.scalar(select(func.count()).select_from(Dish))
    if count and count > 0:
        return

    with SEED_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)

    for c in data.get("categories", []):
        session.add(
            Category(
                id=c["id"],
                name=c["name"],
                slug=c["slug"],
                order=c.get("order", 0),
            )
        )
    await session.flush()

    for d in data.get("dishes", []):
        session.add(
            Dish(
                id=d["id"],
                category_id=d["category_id"],
                name=d["name"],
                description=d["description"],
                composition=d.get("composition"),
                calories=d.get("calories"),
                price=d["price"],
                photo_url=d["photo_url"],
                is_available=d.get("is_available", True),
            )
        )

    await session.commit()
