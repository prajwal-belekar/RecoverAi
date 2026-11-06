"""
ResolveAI Business Analytics Service
Uses actual database records - no hardcoded/fake statistics.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date, and_, or_
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from app.models import Ticket, AIClassification, AIPriority, AIResponse


def get_totals(db: Session) -> Dict[str, int]:
    """Get total ticket counts."""
    total = db.query(func.count(Ticket.id)).scalar() or 0
    open_tickets = db.query(func.count(Ticket.id)).filter(Ticket.status == "Open").scalar() or 0
    resolved = db.query(func.count(Ticket.id)).filter(Ticket.status == "Resolved").scalar() or 0
    critical = db.query(func.count(Ticket.id)).filter(Ticket.priority == "Critical").scalar() or 0

    return {
        "total": total,
        "open": open_tickets,
        "resolved": resolved,
        "critical": critical
    }


def get_category_distribution(db: Session) -> List[Dict[str, Any]]:
    """Get ticket distribution by category."""
    rows = db.query(
        Ticket.category,
        func.count(Ticket.id).label("count")
    ).filter(
        Ticket.category.isnot(None)
    ).group_by(
        Ticket.category
    ).order_by(
        func.count(Ticket.id).desc()
    ).all()

    return [{"category": row.category or "Uncategorized", "count": row.count} for row in rows]


def get_sentiment_distribution(db: Session) -> List[Dict[str, Any]]:
    """Get sentiment distribution from AI classifications."""
    rows = db.query(
        AIClassification.sentiment,
        func.count(AIClassification.id).label("count")
    ).group_by(
        AIClassification.sentiment
    ).all()

    return [{"sentiment": row.sentiment or "unknown", "count": row.count} for row in rows]


def get_priority_distribution(db: Session) -> List[Dict[str, Any]]:
    """Get priority distribution from AI priorities."""
    rows = db.query(
        AIPriority.priority_level,
        func.avg(AIPriority.score).label("avg_score"),
        func.count(AIPriority.id).label("count")
    ).group_by(
        AIPriority.priority_level
    ).all()

    return [
        {
            "priority": row.priority_level,
            "avg_score": round(row.avg_score, 1) if row.avg_score else 0,
            "count": row.count
        } for row in rows
    ]


def get_recurring_issues(db: Session, limit: int = 5) -> List[Dict[str, Any]]:
    """Identify recurring customer issues and patterns."""
    rows = db.query(
        AIClassification.category,
        AIClassification.urgency,
        AIClassification.sentiment,
        func.count(AIClassification.id).label("freq")
    ).group_by(
        AIClassification.category,
        AIClassification.urgency,
        AIClassification.sentiment
    ).order_by(
        func.count(AIClassification.id).desc()
    ).limit(limit).all()

    issues = []
    for row in rows:
        issues.append({
            "issue": f"{row.category} ({row.urgency}, {row.sentiment})",
            "frequency": row.freq,
            "type": "observed_pattern"
        })
    return issues


def get_average_response_time(db: Session) -> Optional[float]:
    """Calculate average response time in hours."""
    result = db.query(
        func.avg(
            (func.julianday(Ticket.updated_at) - func.julianday(Ticket.created_at)) * 24
        )
    ).filter(
        and_(
            Ticket.agent_id.isnot(None),
            Ticket.status == "Resolved"
        )
    ).scalar()

    return round(result, 2) if result else None


def get_average_resolution_time(db: Session) -> Optional[float]:
    """Calculate average resolution time in hours."""
    result = db.query(
        func.avg(
            (func.julianday(Ticket.updated_at) - func.julianday(Ticket.created_at)) * 24
        )
    ).filter(
        Ticket.status == "Resolved"
    ).scalar()

    return round(result, 2) if result else None


def get_sentiment_trend(db: Session, days: int = 30) -> List[Dict[str, Any]]:
    """Get sentiment trend over time (simplified - daily data)."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    rows = db.query(
        cast(AIClassification.created_at, Date).label("date"),
        AIClassification.sentiment,
        func.count(AIClassification.id).label("cnt")
    ).filter(
        AIClassification.created_at >= cutoff
    ).group_by(
        cast(AIClassification.created_at, Date),
        AIClassification.sentiment
    ).order_by(
        cast(AIClassification.created_at, Date)
    ).all()

    trend = {}
    for row in rows:
        date = str(row.date)
        if date not in trend:
            trend[date] = {"positive": 0, "negative": 0, "neutral": 0}
        trend[date][row.sentiment] = row.cnt

    result = []
    for date in sorted(trend.keys()):
        result.append({
            "date": date,
            "positive": trend[date].get("positive", 0),
            "negative": trend[date].get("negative", 0),
            "neutral": trend[date].get("neutral", 0)
        })
    return result


def get_ai_assisted_stats(db: Session) -> Dict[str, Any]:
    """Get AI-assisted ticket statistics."""
    total = db.query(func.count(Ticket.id)).scalar() or 0
    ai_classified = db.query(func.count(AIClassification.id)).scalar() or 0

    return {
        "ai_assisted_count": ai_classified,
        "total_tickets": total,
        "percentage": round((ai_classified / total * 100) if total > 0 else 0, 1)
    }


def get_resolution_trends(db: Session, days: int = 30) -> List[Dict[str, Any]]:
    """Get ticket resolution trends over time."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    rows = db.query(
        func.date(Ticket.created_at).label("date"),
        func.count(Ticket.id).label("created"),
        func.count(Ticket.id).filter(Ticket.status == "Resolved").label("resolved")
    ).filter(
        Ticket.created_at >= cutoff
    ).group_by(
        func.date(Ticket.created_at)
    ).order_by(
        func.date(Ticket.created_at)
    ).all()

    result = []
    for row in rows:
        result.append({
            "date": str(row.date),
            "created": row.created,
            "resolved": row.resolved or 0
        })
    return result


def get_ai_performance(db: Session) -> Dict[str, Any]:
    """Get AI performance metrics from real records."""
    total_tickets = db.query(func.count(Ticket.id)).scalar() or 0
    ai_classified = db.query(func.count(AIClassification.id)).scalar() or 0

    # AI Response metrics from AIResponse table
    ai_responses_total = db.query(func.count(AIResponse.id)).scalar() or 0
    # Count approved + sent as "approved" (sent implies approved)
    ai_responses_approved = db.query(func.count(AIResponse.id)).filter(
        AIResponse.status.in_(["approved", "sent"])
    ).scalar() or 0
    ai_responses_rejected = db.query(func.count(AIResponse.id)).filter(AIResponse.status == "rejected").scalar() or 0
    ai_responses_sent = db.query(func.count(AIResponse.id)).filter(AIResponse.status == "sent").scalar() or 0
    ai_responses_edited = db.query(func.count(AIResponse.id)).filter(AIResponse.status == "edited").scalar() or 0

    avg_confidence = db.query(func.avg(AIClassification.confidence)).scalar() or 0

    human_approval_rate = 0.0
    if ai_responses_total > 0:
        human_approval_rate = round((ai_responses_approved / ai_responses_total) * 100, 1)

    ai_acceptance_rate = 0.0
    if ai_responses_approved > 0:
        ai_acceptance_rate = round((ai_responses_sent / ai_responses_approved) * 100, 1)

    return {
        "aiClassifiedTickets": ai_classified,
        "totalTickets": total_tickets,
        "aiAssistedResponses": ai_responses_total,
        "humanApprovalRate": human_approval_rate,
        "aiResponseAcceptanceRate": ai_acceptance_rate,
        "avgConfidence": round(avg_confidence, 2),
        "responsesApproved": ai_responses_approved,
        "responsesRejected": ai_responses_rejected,
        "responsesSent": ai_responses_sent,
        "responsesEdited": ai_responses_edited,
    }


def get_ai_trends(db: Session, days: int = 30) -> List[Dict[str, Any]]:
    """Get AI activity trends over time from real records."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    # AI Classifications over time
    class_rows = db.query(
        func.date(AIClassification.created_at).label("date"),
        func.count(AIClassification.id).label("classified")
    ).filter(
        AIClassification.created_at >= cutoff
    ).group_by(
        func.date(AIClassification.created_at)
    ).order_by(
        func.date(AIClassification.created_at)
    ).all()

    # AI Responses over time
    resp_rows = db.query(
        func.date(AIResponse.created_at).label("date"),
        func.count(AIResponse.id).label("assisted"),
        func.count(AIResponse.id).filter(AIResponse.status == "approved").label("approved"),
        func.count(AIResponse.id).filter(AIResponse.status == "sent").label("sent"),
        func.count(AIResponse.id).filter(AIResponse.status == "rejected").label("rejected"),
    ).filter(
        AIResponse.created_at >= cutoff
    ).group_by(
        func.date(AIResponse.created_at)
    ).order_by(
        func.date(AIResponse.created_at)
    ).all()

    # Combine into trend data
    trend_map = {}
    for row in class_rows:
        date = str(row.date)
        if date not in trend_map:
            trend_map[date] = {"classified": 0, "assisted": 0, "approved": 0, "sent": 0, "rejected": 0}
        trend_map[date]["classified"] = row.classified

    for row in resp_rows:
        date = str(row.date)
        if date not in trend_map:
            trend_map[date] = {"classified": 0, "assisted": 0, "approved": 0, "sent": 0, "rejected": 0}
        trend_map[date]["assisted"] = row.assisted
        trend_map[date]["approved"] = row.approved or 0
        trend_map[date]["sent"] = row.sent or 0
        trend_map[date]["rejected"] = row.rejected or 0

    result = []
    for date in sorted(trend_map.keys()):
        result.append({
            "date": date,
            "classified": trend_map[date]["classified"],
            "assisted": trend_map[date]["assisted"],
            "approved": trend_map[date]["approved"],
            "sent": trend_map[date]["sent"],
            "rejected": trend_map[date]["rejected"],
        })
    return result