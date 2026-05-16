import logging

from fastapi import APIRouter, Response, status
from sqlalchemy import text

from app.db.engine import AsyncSessionLocal
from app.schemas.health import HealthOut

log = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", response_model=HealthOut)
async def health(response: Response) -> HealthOut:
    db_status = "ok"
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
    except Exception as exc:
        log.warning("health.db_down", extra={"err": str(exc)[:200]})
        db_status = "down"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return HealthOut(status="ok", db=db_status)
