"""
ResolveAI Tickets API Router
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from sqlalchemy.orm import Session
from ...database import get_db
from ...models import Ticket
from ...schemas.ticket import TicketCreate, TicketUpdate, TicketResponse

router = APIRouter()

@router.post("/", response_model=TicketResponse, status_code=201)
def create_ticket(ticket_data: TicketCreate, db: Session = Depends(get_db)):
    db_ticket = Ticket(**ticket_data.model_dump())
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

@router.get("/", response_model=list[TicketResponse])
def list_tickets(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db)
):
    query = db.query(Ticket)
    
    if status:
        query = query.filter(Ticket.status == status)
    if priority:
        query = query.filter(Ticket.priority == priority)
    if category:
        query = query.filter(Ticket.category == category)
    if search:
        query = query.filter(
            (Ticket.title.ilike(f"%{search}%")) | (Ticket.description.ilike(f"%{search}%"))
        )
    
    if sort_order == "desc":
        query = query.order_by(getattr(Ticket, sort_by).desc())
    else:
        query = query.order_by(getattr(Ticket, sort_by).asc())
    
    return query.offset(offset).limit(limit).all()

@router.get("/pending-approvals", response_model=list[dict])
def get_pending_approvals(db: Session = Depends(get_db)):
    """Get tickets with AI responses pending human approval"""
    from ...models import AIClassification

    # Find tickets that have AI classifications but no corresponding approval
    # (We use the presence of AIClassification as a proxy for pending approval)
    results = (
        db.query(Ticket, AIClassification.confidence)
        .join(AIClassification, AIClassification.ticket_id == Ticket.id)
        .order_by(AIClassification.created_at.desc())
        .limit(20)
        .all()
    )

    return [
        {
            "id": ticket.id,
            "ticket_id": ticket.id,
            "ticket_title": ticket.title,
            "ticket_status": ticket.status,
            "ticket_priority": ticket.priority,
            "ai_confidence": round(confidence, 2) if confidence else 0.9,
            "created_at": str(ticket.created_at),
        }
        for ticket, confidence in results
    ]

@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return db_ticket

@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket(ticket_id: int, ticket_data: TicketUpdate, db: Session = Depends(get_db)):
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    for field, value in ticket_data.model_dump(exclude_unset=True).items():
        setattr(db_ticket, field, value)
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

@router.delete("/{ticket_id}", status_code=204)
def delete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    db.delete(db_ticket)
    db.commit()
    return None