"""
ResolveAI AI Response Assistant API
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Ticket, AIClassification, AIPriority
from app.schemas.ai import TicketClassification, TicketPriority
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/ai-response")

class SuggestedResponse(BaseModel):
    response: str
    confidence: float
    sources: List[dict] = []
    requires_approval: bool = True

class ResponseApproval(BaseModel):
    approved: bool
    agent_comments: Optional[str] = None


# Mock knowledge base search for RAG
def mock_knowledge_search(query: str, kb_ids: List[int] = None) -> dict:
    """Mock knowledge base search for RAG - in production uses vector similarity"""
    # Return relevant snippets based on keywords
    keywords = [k.lower() for k in query.split()]
    
    mock_db = {
        "payment": [
            {"title": "Payment Troubleshooting Guide", "snippet": "If payment fails, check Stripe logs for declined transactions. Common reasons: insufficient funds, card expired, or gateway timeout.", "source": "Knowledge Base"}
        ],
        "technical": [
            {"title": "Technical Troubleshooting Guide", "snippet": "For application crashes, check error logs, verify system requirements, and restart the application server.", "source": "Knowledge Base"}
        ],
        "account": [
            {"title": "Account Management Guide", "snippet": "For password issues, use the password reset feature. Reset links are valid for 24 hours.", "source": "Knowledge Base"}
        ]
    }
    
    results = []
    for keyword in keywords:
        if keyword in mock_db:
            for item in mock_db[keyword]:
                if item not in results:
                    results.append(item)
    
    if not results:
        results.append({
            "title": "General Support Guide", 
            "snippet": "Please contact support if you cannot resolve your issue using the available resources.", 
            "source": "Knowledge Base"
        })
    
    return {"results": results, "query": query}


@router.post("/{ticket_id}", response_model=SuggestedResponse)
def get_suggested_response(ticket_id: int, db: Session = Depends(get_db)):
    """Get AI-suggested response for a ticket (requires human approval)"""
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Get ticket classification
    classification = db.query(AIClassification).filter(
        AIClassification.ticket_id == ticket_id
    ).first()
    
    # Get knowledge base search results
    query = f"{db_ticket.title} {db_ticket.description or ''}"
    kb_search = mock_knowledge_search(query)
    
    # Generate contextual response based on classification
    if classification:
        category = classification.category
        urgency = classification.urgency
        sentiment = classification.sentiment
        
        # Build response based on category and urgency
        if category == "billing" and urgency == "critical":
            response = f"""Hi there,

Thank you for reaching out regarding this critical billing issue. I understand your payment attempt failed, and I sincerely apologize for the inconvenience.

I've reviewed your account and can see the payment issue is related to our payment gateway's recent update. Our engineering team is actively working on a fix.

**Immediate actions you can take:**
1. Try completing your transaction again in 10-15 minutes
2. Use an alternative payment method if available
3. Contact your bank to ensure there are no holds on your card

I'll follow up with you within the next 2 hours with an update on the gateway fix.

Best regards,
Customer Support Team"""
        elif category == "technical" and urgency == "high":
            response = f"""Hi there,

Thank you for reporting this technical issue. I understand the application is experiencing problems, and I apologize for the disruption.

I've escalated this to our technical team for immediate investigation. They are:
1. Reviewing recent error logs
2. Reproducing the issue in a test environment
3. Working on a hotfix deployment

**While you wait, you can try:**
1. Clearing your browser cache and cookies
2. Using a different browser or device
3. Checking our status page for updates

I'll provide an update within 4 hours on the investigation progress.

Best regards,
Customer Support Team"""
        else:
            response = f"""Hi there,

Thank you for your ticket regarding {category}. I've reviewed your issue and here's how we can help:

**Issue Summary:** {db_ticket.title}
**Category:** {category}
**Urgency:** {urgency}
**Sentiment:** {sentiment}

Our team is reviewing your case and will respond within our standard SLA timeframe. If you have any additional information or updates, please reply to this message.

Best regards,
Customer Support Team"""
    else:
        response = f"""Hi there,

Thank you for contacting us about: {db_ticket.title}

Our support team is reviewing your case and will respond within 24 hours. In the meantime, you may find helpful resources in our knowledge base.

Best regards,
Customer Support Team"""
    
    # Get source documents from knowledge base search
    sources = kb_search.get("results", [])
    
    return SuggestedResponse(
        response=response,
        confidence=classification.confidence if classification else 0.8,
        sources=sources,
        requires_approval=True
    )


@router.post("/complete", response_model=dict)
def approve_response(approval: ResponseApproval):
    """Approve or reject AI-suggested response (human approval workflow)"""
    if approval.approved:
        return {
            "status": "approved",
            "message": "Response approved and ready for customer delivery",
            "requires_human_oversight": False
        }
    else:
        return {
            "status": "rejected", 
            "message": "Response rejected. Agent will compose alternative response.",
            "requires_human_oversight": True
        }