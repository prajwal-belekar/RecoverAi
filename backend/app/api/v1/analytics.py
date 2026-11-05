"""
ResolveAI Analytics API Router
Provides business analytics using actual database records.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.analytics import (
    get_totals, get_category_distribution, get_sentiment_distribution, 
    get_priority_distribution, get_recurring_issues, get_average_response_time, 
    get_average_resolution_time, get_sentiment_trend,
    get_ai_assisted_stats, get_resolution_trends, get_ai_performance, get_ai_trends
)

router = APIRouter()

@router.get("/totals")
def analytics_totals(db: Session = Depends(get_db)):
    """Get total ticket counts."""
    return get_totals(db)

@router.get("/categories")
def analytics_categories(db: Session = Depends(get_db)):
    """Get ticket distribution by category."""
    return get_category_distribution(db)

@router.get("/sentiment")
def analytics_sentiment(db: Session = Depends(get_db)):
    """Get sentiment distribution."""
    return get_sentiment_distribution(db)

@router.get("/priorities")
def analytics_priorities(db: Session = Depends(get_db)):
    """Get priority distribution."""
    return get_priority_distribution(db)

@router.get("/recurring")
def analytics_recurring(db: Session = Depends(get_db), limit: int = 5):
    """Identify recurring customer issues."""
    return get_recurring_issues(db, limit)

@router.get("/response-time")
def analytics_response_time(db: Session = Depends(get_db)):
    """Get average response time in hours."""
    return {"average_hours": get_average_response_time(db)}

@router.get("/resolution-time")
def analytics_resolution_time(db: Session = Depends(get_db)):
    """Get average resolution time in hours."""
    return {"average_hours": get_average_resolution_time(db)}

@router.get("/sentiment-trend")
def analytics_sentiment_trend(db: Session = Depends(get_db), days: int = 30):
    """Get sentiment trend over time."""
    return get_sentiment_trend(db, days)

@router.get("/ai-assisted")
def analytics_ai_assisted(db: Session = Depends(get_db)):
    """Get AI-assisted ticket statistics."""
    return get_ai_assisted_stats(db)

@router.get("/resolution-trends")
def analytics_resolution_trends(db: Session = Depends(get_db), days: int = 30):
    """Get ticket resolution trends over time."""
    return get_resolution_trends(db, days)

@router.get("/ai-performance")
def analytics_ai_performance(db: Session = Depends(get_db)):
    """Get AI performance metrics."""
    return get_ai_performance(db)

@router.get("/ai-trends")
def analytics_ai_trends(db: Session = Depends(get_db), days: int = 30):
    """Get AI activity trends over time."""
    return get_ai_trends(db, days)