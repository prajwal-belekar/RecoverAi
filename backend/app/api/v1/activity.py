"""
ResolveAI Activity & Timeline API Router
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta
from ...database import get_db
from ...models import Ticket, TicketUpdate, AIClassification, User

router = APIRouter(prefix="/activity", tags=["activity"])

@router.get("/recent", response_model=List[dict])
def get_recent_activity(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get recent activity across all tickets"""
    activities = []
    
    # Recent ticket updates
    recent_updates = db.query(TicketUpdate).order_by(TicketUpdate.created_at.desc()).limit(limit).all()
    for update in recent_updates:
        user = db.query(User).filter(User.id == update.user_id).first()
        activities.append({
            "id": f"update_{update.id}",
            "type": "message",
            "user_name": user.name if user else "Unknown",
            "message": update.message,
            "timestamp": str(update.created_at)
        })
    
    # Recent AI classifications
    recent_classifications = db.query(AIClassification).order_by(AIClassification.created_at.desc()).limit(limit).all()
    for cls in recent_classifications:
        ticket = db.query(Ticket).filter(Ticket.id == cls.ticket_id).first()
        activities.append({
            "id": f"classification_{cls.id}",
            "type": "classification",
            "user_name": "AI System",
            "message": f"Classified ticket as {cls.category} ({cls.urgency})",
            "timestamp": str(cls.created_at)
        })
    
    # Sort by timestamp and limit
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    return activities[:limit]

@router.get("/ticket/{ticket_id}", response_model=List[dict])
def get_ticket_activity(
    ticket_id: int,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get activity timeline for a specific ticket"""
    activities = []
    
    # Ticket updates
    updates = db.query(TicketUpdate).filter(TicketUpdate.ticket_id == ticket_id).order_by(TicketUpdate.created_at).all()
    for update in updates:
        user = db.query(User).filter(User.id == update.user_id).first()
        activities.append({
            "ticketId": str(update.id),
            "type": "message",
            "user_name": user.name if user else "Unknown",
            "message": update.message,
            "timestamp": str(update.created_at)
        })
    
    # AI classification
    classification = db.query(AIClassification).filter(AIClassification.ticket_id == ticket_id).first()
    if classification:
        activities.append({
            "ticketId": f"classification_{classification.id}",
            "type": "classification",
            "user_name": "AI System",
            "message": f"Classified as {classification.category} ({classification.urgency}, {classification.sentiment})",
            "timestamp": str(classification.created_at)
        })
    
    # Sort by timestamp
    activities.sort(key=lambda x: x["timestamp"])
    return activities[:limit]