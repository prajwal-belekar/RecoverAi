"""
ResolveAI API v1
"""
from fastapi import APIRouter
from .auth import router as auth_router
from .tickets import router as tickets_router
from .ai import router as ai_router
from .knowledge import router as knowledge_router
from .response import router as response_router
from .analytics import router as analytics_router

router = APIRouter()
router.include_router(auth_router, prefix="/auth", tags=["auth"])
router.include_router(tickets_router, prefix="/tickets", tags=["tickets"])
router.include_router(ai_router, prefix="/ai", tags=["ai"])
router.include_router(knowledge_router, prefix="/knowledge", tags=["knowledge"])
router.include_router(response_router, prefix="/response", tags=["response"])
router.include_router(analytics_router, prefix="/analytics", tags=["analytics"])