"""ResolveAI API v1."""

from fastapi import APIRouter

from .ai import router as ai_router
from .analytics import router as analytics_router
from .auth import router as auth_router
from .activity import router as activity_router
from .knowledge import router as knowledge_router
from .team import router as team_router
from .tickets import router as tickets_router
from .users import router as users_router

router = APIRouter()
router.include_router(auth_router, prefix="/auth", tags=["auth"])
router.include_router(tickets_router, prefix="/tickets", tags=["tickets"])
router.include_router(ai_router, prefix="/ai", tags=["ai"])
router.include_router(activity_router, prefix="/activity", tags=["activity"])
router.include_router(knowledge_router, prefix="/knowledge", tags=["knowledge"])
router.include_router(analytics_router, prefix="/analytics", tags=["analytics"])
router.include_router(team_router, prefix="/team", tags=["team"])
router.include_router(users_router, prefix="/users", tags=["users"])
