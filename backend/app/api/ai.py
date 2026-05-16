from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_tg_user
from app.db.engine import get_db
from app.schemas.ai import AIRecommendIn, AIRecommendOut
from app.services.ai import recommend

router = APIRouter()


@router.post(
    "/ai/recommend",
    response_model=AIRecommendOut,
    dependencies=[Depends(require_tg_user)],
)
async def post_recommend(
    payload: AIRecommendIn,
    db: AsyncSession = Depends(get_db),
) -> AIRecommendOut:
    return await recommend(db, payload.query)
