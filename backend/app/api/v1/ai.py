"""
ResolveAI AI Classification & Priority API
"""
import os
import json
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Ticket, AIClassification, AIPriority, KnowledgeBase
from app.core.config import is_ai_available, get_fallback_mode
import openai
from app.schemas.ai import TicketClassification, TicketPriority

# --- Models ---
class SuggestedResponse(BaseModel):
    response: str
    confidence: float
    sources: List[dict] = []
    requires_approval: bool = True

class ResponseApproval(BaseModel):
    approved: bool
    agent_comments: Optional[str] = None


# --- AI Client ---
client = None
if is_ai_available():
    try:
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    except Exception:
        client = None

# --- Classification Rules ---
CLASSIFICATION_RULES = {
    "billing": {"category": "billing", "urgency": "high", "sentiment": "negative", "department": "billing", "suggested_action": "Review payment gateway and contact customer", "confidence": 0.9},
    "technical": {"category": "technical", "urgency": "medium", "sentiment": "negative", "department": "technical support", "suggested_action": "Check system logs and reproduce the issue", "confidence": 0.85},
    "payment": {"category": "billing", "urgency": "critical", "sentiment": "negative", "department": "billing", "suggested_action": "Escalate to payment gateway technical team immediately", "confidence": 0.95},
    "account": {"category": "account", "urgency": "medium", "sentiment": "negative", "department": "account management", "suggested_action": "Verify account status and reset credentials if needed", "confidence": 0.88},
    "default": {"category": "general", "urgency": "low", "sentiment": "neutral", "department": "general support", "suggested_action": "Review ticket and provide standard response", "confidence": 0.8}
}

PRIORITY_RULES = {
    "critical": {"priority_level": "Critical", "score": 95, "rationale": "Critical business impact with urgent customer sentiment and escalation indicators"},
    "high": {"priority_level": "High", "score": 80, "rationale": "High impact issue affecting multiple customers or high-value customer"},
    "medium": {"priority_level": "Medium", "score": 60, "rationale": "Moderate impact issue with standard customer urgency"},
    "low": {"priority_level": "Low", "score": 35, "rationale": "Low impact issue with minimal customer urgency"},
}


# --- LLM Classification ---
def classify_with_llm(ticket_title: str, ticket_description: str) -> dict:
    if not client:
        raise RuntimeError("No OpenAI client configured")
    prompt = """You are an AI customer support analyst. Analyze the following customer support ticket and return a JSON response with exactly these fields:

- category: One of "billing", "technical", "account", "general"
- urgency: One of "low", "medium", "high", "critical" 
- sentiment: One of "positive", "negative", "neutral"
- department: The department that should handle this (e.g., "billing", "technical support", "sales", "account management")
- suggested_action: A concise suggested next action (1-2 sentences)
- confidence: A float between 0.0 and 1.0 representing your confidence in this classification

Ticket title: {title}
Ticket description: {description}

Return ONLY valid JSON with these fields, no prose or explanation."""
    try:
        response = client.chat.completions.create(
            model=os.getenv("AI_MODEL", "gpt-4o-mini"),
            messages=[{"role": "user", "content": prompt.format(title=ticket_title, description=ticket_description)}],
            temperature=float(os.getenv("AI_TEMPERATURE", "0.0")),
            max_tokens=500,
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:]) if len(lines) > 1 else ""
            if content.endswith("```"):
                content = content[:-3]
        result = json.loads(content)
        required = ["category", "urgency", "sentiment", "department", "suggested_action", "confidence"]
        for field in required:
            if field not in result:
                raise ValueError(f"Missing field: {field}")
        if result["confidence"] < 0 or result["confidence"] > 1:
            raise ValueError("Confidence must be between 0 and 1")
        if result["category"] not in ["billing", "technical", "account", "general"]:
            raise ValueError("Invalid category")
        if result["urgency"] not in ["low", "medium", "high", "critical"]:
            raise ValueError("Invalid urgency")
        if result["sentiment"] not in ["positive", "negative", "neutral"]:
            raise ValueError("Invalid sentiment")
        return result
    except Exception as e:
        raise RuntimeError(f"LLM classification failed: {str(e)}")


def classify_with_rules(text_lower: str) -> dict:
    if any(kw in text_lower for kw in ["payment", "charge", "failed", "refund", "invoice", "billing"]):
        result = CLASSIFICATION_RULES["payment"]
    elif any(kw in text_lower for kw in ["technical", "crash", "error", "bug", "not working"]):
        result = CLASSIFICATION_RULES["technical"]
    elif any(kw in text_lower for kw in ["account", "login", "password", "credential", "access denied"]):
        result = CLASSIFICATION_RULES["account"]
    elif any(kw in text_lower for kw in ["general", "question", "info", "help"]):
        result = CLASSIFICATION_RULES["default"]
    else:
        result = CLASSIFICATION_RULES["default"]
    return result


# --- Router ---
router = APIRouter()

# --- API Endpoints ---
@router.post("/classify", response_model=TicketClassification)
def classify_ticket(ticket_id: int, db: Session = Depends(get_db)):
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Ticket not found")
    text_lower = (db_ticket.title + " " + (db_ticket.description or "")).lower()
    if not get_fallback_mode():
        try:
            ai_result = classify_with_llm(db_ticket.title, db_ticket.description)
            classification = AIClassification(
                ticket_id=ticket_id,
                category=ai_result["category"],
                urgency=ai_result["urgency"],
                sentiment=ai_result["sentiment"],
                department=ai_result["department"],
                suggested_action=ai_result["suggested_action"],
                confidence=ai_result["confidence"]
            )
            db.add(classification)
            db.commit()
            return ai_result
        except Exception as e:
            print(f"AI classification failed, falling back to rules: {str(e)}")
    result = classify_with_rules(text_lower)
    classification = AIClassification(
        ticket_id=ticket_id,
        category=result["category"],
        urgency=result["urgency"],
        sentiment=result["sentiment"],
        department=result["department"],
        suggested_action=result["suggested_action"],
        confidence=result["confidence"]
    )
    db.add(classification)
    db.commit()
    return result


@router.post("/priority/{ticket_id}", response_model=TicketPriority)
def prioritize_ticket(ticket_id: int, db: Session = Depends(get_db)):
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Ticket not found")
    classification = db.query(AIClassification).filter(
        AIClassification.ticket_id == ticket_id
    ).first()
    urgency = classification.urgency if classification else "medium"
    text_lower = (db_ticket.title + " " + (db_ticket.description or "")).lower()
    if not get_fallback_mode() and classification and client:
        try:
            priority_prompt = """Based on the following ticket classification, assign a priority level and score:

Classification: category={category}, urgency={urgency}, sentiment={sentiment}
Ticket title: {title}
Ticket description: {description}

Return JSON with:
- priority_level: One of "Low", "Medium", "High", "Critical"
- score: Numerical score 0-100
- rationale: Human-readable explanation (1 sentence)

Return ONLY valid JSON with these fields."""
            priority_prompt_formatted = priority_prompt.format(
                category=classification.category,
                urgency=classification.urgency,
                sentiment=classification.sentiment,
                title=db_ticket.title,
                description=db_ticket.description or ""
            )
            response = client.chat.completions.create(
                model=os.getenv("AI_MODEL", "gpt-4o-mini"),
                messages=[{"role": "user", "content": priority_prompt_formatted}],
                temperature=float(os.getenv("AI_TEMPERATURE", "0.0")),
                max_tokens=300,
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join(lines[1:]) if len(lines) > 1 else ""
                if content.endswith("```"):
                    content = content[:-3]
            priority_result = json.loads(content)
            if "priority_level" not in priority_result or "score" not in priority_result or "rationale" not in priority_result:
                raise ValueError("Missing priority fields")
            if priority_result["priority_level"] not in ["Low", "Medium", "High", "Critical"]:
                raise ValueError("Invalid priority level")
            if not (0 <= priority_result["score"] <= 100):
                raise ValueError("Score must be 0-100")
            existing = db.query(AIPriority).filter(AIPriority.ticket_id == ticket_id).first()
            if existing:
                existing.priority_level = priority_result["priority_level"]
                existing.score = priority_result["score"]
                existing.rationale = priority_result["rationale"]
            else:
                priority_entry = AIPriority(
                    ticket_id=ticket_id,
                    priority_level=priority_result["priority_level"],
                    score=priority_result["score"],
                    rationale=priority_result["rationale"]
                )
                db.add(priority_entry)
            db.commit()
            return {"priority_level": priority_result["priority_level"], "score": priority_result["score"], "rationale": priority_result["rationale"]}
        except Exception as e:
            print(f"AI priority failed, using rule-based: {str(e)}")
    if urgency == "critical":
        priority_level = "Critical"; score = 95; rationale = "Critical business impact with urgent customer sentiment and escalation indicators. Automated detection of payment/technical failures takes precedence."
    elif urgency == "high":
        priority_level = "High"; score = 80; rationale = "High impact issue requiring immediate attention. Customer sentiment indicates significant dissatisfaction."
    elif urgency == "medium":
        priority_level = "Medium"; score = 60; rationale = "Moderate impact issue with standard customer urgency. Requires investigation within SLA timeframe."
    else:
        priority_level = "Low"; score = 35; rationale = "Low impact issue with minimal customer urgency. Can be addressed in routine backlog processing."
    existing = db.query(AIPriority).filter(AIPriority.ticket_id == ticket_id).first()
    if existing:
        existing.priority_level = priority_level; existing.score = score; existing.rationale = rationale
    else:
        priority_entry = AIPriority(ticket_id=ticket_id, priority_level=priority_level, score=score, rationale=rationale)
        db.add(priority_entry)
    db.commit()
    return {"priority_level": priority_level, "score": score, "rationale": rationale}


@router.post("/respond/{ticket_id}", response_model=SuggestedResponse)
def get_suggested_response(ticket_id: int, db: Session = Depends(get_db)):
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Ticket not found")
    classification = db.query(AIClassification).filter(
        AIClassification.ticket_id == ticket_id
    ).first()
    from app.api.v1.knowledge import extract_text_from_file, chunk_text, generate_embedding
    import numpy as np
    query = f"{db_ticket.title} {db_ticket.description or ''}"
    sources = []
    knowledge_available = False
    kb_entries = db.query(KnowledgeBase).filter(
        KnowledgeBase.workspace_id == db_ticket.workspace_id
    ).limit(5).all()
    if kb_entries:
        knowledge_available = True
        query_words = set(query.lower().split())
        for kb_entry in kb_entries:
            kb_text = extract_text_from_file(kb_entry.content.encode() if isinstance(kb_entry.content, str) else kb_entry.content, kb_entry.title) if isinstance(kb_entry.content, bytes) else \
                    (kb_entry.content[:500] if kb_entry.content else "")
            kb_words = set(kb_text.lower().split())
            common = query_words & kb_words
            if common:
                similarity = len(common) / max(len(query_words), len(kb_words), 1)
                if similarity > 0.2:
                    sources.append({
                        "title": kb_entry.title,
                        "snippet": kb_text[:200] + ("..." if len(kb_text) > 200 else ""),
                        "source": "Knowledge Base",
                        "relevance": float(similarity)
                    })
    if classification:
        category = classification.category
        urgency = classification.urgency
        sentiment = classification.sentiment
        sources_text = ""
        if sources:
            for src in sources[:3]:
                sources_text += f"\n**From {src['title']}:** {src['snippet']}"
        if category == "billing" and urgency == "critical":
            response = "Hi there,\n\nThank you for reaching out regarding this critical billing issue. I understand your payment attempt failed, and I sincerely apologize for the inconvenience.\n\nI've reviewed your account and can see the payment issue is related to our payment gateway's recent update. Our engineering team is actively working on a fix.\n\n**Immediate actions you can take:**\n1. Try completing your transaction again in 10-15 minutes\n2. Use an alternative payment method if available\n3. Contact your bank to ensure there are no holds on your card\n\nI'll follow up with you within the next 2 hours with an update on the gateway fix.\n\nBest regards,\nCustomer Support Team"
        elif category == "technical" and urgency == "high":
            response = "Hi there,\n\nThank you for reporting this technical issue. I understand the application is experiencing problems, and I apologize for the disruption.\n\nI've escalated this to our technical team for immediate investigation. They are:\n1. Reviewing recent error logs\n2. Reproducing the issue in a test environment\n3. Working on a hotfix deployment\n\n**While you wait, you can try:**\n1. Clearing your browser cache and cookies\n2. Using a different browser or device\n3. Checking our status page for updates\n\nI'll provide an update within 4 hours on the investigation progress.\n\nBest regards,\nCustomer Support Team"
        else:
            response = "Hi there,\n\nThank you for your ticket regarding {category}. I've reviewed your issue and here's how we can help:\n\n**Issue Summary:** {title}\n**Category:** {category}\n**Urgency:** {urgency}\n**Sentiment:** {sentiment}\n\nOur team is reviewing your case and will respond within our standard SLA timeframe. If you have any additional information or updates, please reply to this message.\n\nBest regards,\nCustomer Support Team".format(category=category, title=db_ticket.title)
    else:
        response = "Hi there,\n\nThank you for contacting us about: {title}\n\nOur support team is reviewing your case and will respond within 24 hours. In the meantime, you may find helpful resources in our knowledge base.\n\nBest regards,\nCustomer Support Team".format(title=db_ticket.title)
    base_confidence = classification.confidence if classification else 0.8
    kb_bonus = 0.1 if knowledge_available and sources else 0.0
    confidence = min(round(base_confidence + kb_bonus, 2), 1.0)
    return SuggestedResponse(
        response=response,
        confidence=confidence,
        sources=sources[:3],
        requires_approval=True
    )


@router.post("/response/complete", response_model=dict)
def approve_response(approval: ResponseApproval, db: Session = Depends(get_db)):
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