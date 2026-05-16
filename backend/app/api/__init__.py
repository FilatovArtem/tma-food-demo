from fastapi import APIRouter

from app.api import ai, catalog, health, orders

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router, tags=["health"])
api_router.include_router(catalog.router, tags=["catalog"])
api_router.include_router(orders.router, tags=["orders"])
api_router.include_router(ai.router, tags=["ai"])
