"""
API routes
"""
from fastapi import APIRouter
from app.api.routes.auth import router as auth_router
from .graphs import router as graphs_router

# Create main API router
router = APIRouter()

# Include route modules
router.include_router(graphs_router, prefix="/graphs", tags=["graphs"])

# Basic API info endpoints
@router.get("/")
async def api_root():
    return {"message": "Cascade API v1", "endpoints": ["/health", "/docs", "/graphs"]}

@router.get("/status")
async def api_status():
    return {"status": "operational", "version": "1.0.0"}

__all__ = ["auth_router", "router"]
