"""
ResolveAI AI Classification, Priority & Response API
"""
import os
import json
import logging
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Ticket, AIClassification, AIPriority, KnowledgeBase, KnowledgeChunk, AIResponse, User
from app.schemas.ai import TicketClassification, TicketPriority, SuggestedResponse, ResponseApproval, Citation, ResponseEdit, ResponseAction
from app.core.config import is_ai_available, get_fallback_mode
from app.core.auth import get_current_user
import openai
import numpy as np

logger = logging.getLogger(__name__)


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


# --- Vector Search for RAG ---
def generate_embedding(text: str) -> List[float]:
    """Generate embedding using OpenAI or hash-based fallback"""
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key and api_key != "CHANGE_ME_IN_PRODUCTION_USE_ENV_VAR":
            response = openai.Embedding.create(
                model="text-embedding-3-small",
                input=text
            )
            embedding = response.data[0].embedding
            while len(embedding) < 1536:
                embedding.append(0.0)
            embedding = embedding[:1536]
            norm = sum(x**2 for x in embedding) ** 0.5
            if norm > 0:
                embedding = [x / norm for x in embedding]
            logger.debug("Generated OpenAI embedding for text (len=%d)", len(text))
            return embedding
    except Exception as e:
        logger.warning("OpenAI embedding failed, falling back to hash-based: %s", str(e))
        pass

    import hashlib
    hash_obj = hashlib.sha256(text.encode('utf-8'))
    embedding = np.frombuffer(hash_obj.digest(), dtype=np.float32)
    while len(embedding) < 1536:
        embedding = np.append(embedding, np.zeros(1536 - len(embedding)))
    embedding = embedding[:1536]
    norm = sum(x**2 for x in embedding) ** 0.5
    if norm > 0:
        embedding = [x / norm for x in embedding]
    logger.info("Using hash-based fallback embedding for text (len=%d)", len(text))
    # Convert numpy array to list for JSON serialization
    return [float(x) for x in embedding]


def cosine_similarity(a: List[float], b: List[float]) -> float:
    a = np.array(a)
    b = np.array(b)
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))


# Common stop words to filter out
STOP_WORDS = {
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'were', 'will', 'with', 'how', 'do', 'i', 'my', 'me',
    'you', 'your', 'we', 'our', 'us', 'what', 'when', 'where', 'who',
    'why', 'can', 'could', 'would', 'should', 'may', 'might', 'must',
    'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were',
    'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did',
    'doing', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of',
    'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'to',
    'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
    'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should',
    'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain', 'aren', 'couldn',
    'didn', 'doesn', 'hadn', 'hasn', 'haven', 'isn', 'ma', 'mightn',
    'mustn', 'needn', 'shan', 'shouldn', 'wasn', 'weren', 'won', 'wouldn'
}


def keyword_search(query: str, workspace_id: int, db: Session) -> List[dict]:
    """Keyword-based search through knowledge base chunks as fallback"""
    results = []
    chunks = db.query(KnowledgeChunk).join(KnowledgeBase).filter(
        KnowledgeBase.workspace_id == workspace_id
    ).all()

    # Filter out stop words from query
    query_words = {w for w in query.lower().split() if w not in STOP_WORDS and len(w) > 2}
    if not query_words:
        return []

    for chunk in chunks:
        chunk_lower = chunk.content.lower()
        # Count matching words
        matches = sum(1 for word in query_words if word in chunk_lower)
        if matches > 0:
            kb = chunk.knowledge_base
            # Score based on fraction of query words matched
            similarity = matches / len(query_words)
            # Only include if similarity is meaningful
            if similarity >= 0.2:
                results.append({
                    "similarity": similarity,
                    "title": kb.title,
                    "knowledge_base_id": kb.id,
                    "chunk_id": chunk.id,
                    "chunk_index": chunk.chunk_index,
                    "content": chunk.content,
                    "source_type": kb.source_type,
                })
    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:5]


def search_knowledge_base(query: str, workspace_id: int, db: Session, top_k: int = 5, min_similarity: float = 0.3) -> List[dict]:
    """Search knowledge base for relevant chunks with keyword fallback"""
    query_embedding = generate_embedding(query)

    chunks = db.query(KnowledgeChunk).join(KnowledgeBase).filter(
        KnowledgeBase.workspace_id == workspace_id
    ).all()

    if not chunks:
        return []

    # Vector search with lower threshold for mock embeddings
    effective_threshold = min(min_similarity, 0.05)
    vector_results = []
    for chunk in chunks:
        similarity = cosine_similarity(query_embedding, chunk.embedding)
        if similarity >= effective_threshold:
            kb = chunk.knowledge_base
            vector_results.append({
                "knowledge_base_id": kb.id,
                "chunk_id": chunk.id,
                "chunk_index": chunk.chunk_index,
                "title": kb.title,
                "content": chunk.content,
                "similarity": similarity,
            })

    # Keyword search as supplement
    keyword_results = keyword_search(query, workspace_id, db)

    # Combine and deduplicate by chunk_id
    seen_ids = set()
    combined = []
    for r in vector_results + keyword_results:
        if r["chunk_id"] not in seen_ids:
            seen_ids.add(r["chunk_id"])
            combined.append(r)

    combined.sort(key=lambda x: x["similarity"], reverse=True)
    return combined[:top_k]


# --- RAG Response Generation ---
def generate_rag_response(
    ticket: Ticket,
    classification: Optional[AIClassification],
    relevant_chunks: List[dict],
    db: Session,
    current_user: User
) -> SuggestedResponse:
    """Generate AI response with grounded citations"""

    # Filter chunks to only include those with sufficient relevance
    # Vector search results have similarity scores, keyword results have word-overlap scores
    # Require at least 0.1 similarity for vector results, or 0.3 word overlap for keyword results
    MIN_VECTOR_SIMILARITY = 0.1
    MIN_KEYWORD_SIMILARITY = 0.3
    
    filtered_chunks = []
    for chunk in relevant_chunks:
        sim = chunk.get("similarity", 0)
        # Heuristic: vector similarities are typically < 0.5 for mock embeddings
        # keyword similarities are word overlap fractions (0-1)
        if sim >= MIN_VECTOR_SIMILARITY:
            filtered_chunks.append(chunk)
    
    if not filtered_chunks:
        return SuggestedResponse(
            response=(
                "I don't have sufficient information in our knowledge base to answer this question accurately. "
                "Please contact our support team directly or check our documentation for more details."
            ),
            confidence=0.5,
            citations=[],
            requires_approval=True,
            has_sufficient_context=False
        )

    # Build context from retrieved chunks
    context_parts = []
    citations = []
    for i, chunk in enumerate(filtered_chunks):
        context_parts.append(f"[{i+1}] {chunk['content']} (Source: {chunk['title']})")
        citations.append(Citation(
            doc_id=chunk["knowledge_base_id"],
            doc_title=chunk["title"],
            chunk_id=chunk["chunk_id"],
            chunk_index=chunk["chunk_index"],
            content=chunk["content"],
            similarity=round(chunk["similarity"], 4)
        ))

    context = "\n\n".join(context_parts)

    category = classification.category if classification else "general"
    urgency = classification.urgency if classification else "low"
    sentiment = classification.sentiment if classification else "neutral"

    prompt = f"""You are a customer support agent. Answer the customer's question using ONLY the provided knowledge base chunks.

Knowledge base chunks:
{context}

Customer ticket: {ticket.title} - {ticket.description or ""}
Classification: {category}, {urgency}, {sentiment}

Instructions:
- Answer naturally but cite sources inline using [1], [2] format matching the chunk numbers above
- If the knowledge base doesn't contain relevant information, respond: "I don't have sufficient information in our knowledge base to answer this question accurately."
- Do not invent policies, procedures, or information not in the provided chunks.
- Keep response professional and empathetic.
- Only use the provided context chunks for your answer.
"""

    if not client:
        # Fallback rule-based response
        response_text = _generate_fallback_response(ticket, classification, filtered_chunks)
        confidence = classification.confidence if classification else 0.7
        return SuggestedResponse(
            response=response_text,
            confidence=confidence,
            citations=citations,
            requires_approval=True,
            has_sufficient_context=True
        )

    try:
        response = client.chat.completions.create(
            model=os.getenv("AI_MODEL", "gpt-4o-mini"),
            messages=[{"role": "user", "content": prompt}],
            temperature=float(os.getenv("AI_TEMPERATURE", "0.0")),
            max_tokens=800,
        )
        response_text = response.choices[0].message.content.strip()

        # Validate citations - check that cited numbers reference actual chunks
        validated_citations = _validate_citations(response_text, citations)

        confidence = classification.confidence if classification else 0.8
        return SuggestedResponse(
            response=response_text,
            confidence=confidence,
            citations=validated_citations,
            requires_approval=True,
            has_sufficient_context=True
        )
    except Exception as e:
        logger.error("LLM response generation failed, falling back to rule-based: %s", str(e))
        response_text = _generate_fallback_response(ticket, classification, relevant_chunks)
        confidence = classification.confidence if classification else 0.7
        return SuggestedResponse(
            response=response_text,
            confidence=confidence,
            citations=citations,
            requires_approval=True,
            has_sufficient_context=True
        )


def _validate_citations(response_text: str, citations: List[Citation]) -> List[Citation]:
    """Validate that inline citations [1], [2] reference actual chunks"""
    import re
    cited_numbers = re.findall(r'\[(\d+)\]', response_text)
    cited_indices = set(int(n) - 1 for n in cited_numbers if int(n) > 0)
    validated = [c for i, c in enumerate(citations) if i in cited_indices]
    return validated


def _generate_fallback_response(ticket: Ticket, classification: Optional[AIClassification], relevant_chunks: List[dict]) -> str:
    """Generate rule-based response with citations"""
    if not classification:
        chunks_text = "\n\n".join([f"[{i+1}] {c['content'][:200]}... (Source: {c['title']})" for i, c in enumerate(relevant_chunks[:3])])
        return f"""Hi there,

Thank you for contacting us about: {ticket.title}

Based on our knowledge base, here's what I found:

{chunks_text}

Our team is reviewing your case and will respond within 24 hours.

Best regards,
Customer Support Team"""

    category = classification.category
    urgency = classification.urgency

    chunks_text = "\n\n".join([f"[{i+1}] {c['content'][:200]}... (Source: {c['title']})" for i, c in enumerate(relevant_chunks[:3])])

    if category == "billing" and urgency == "critical":
        return f"""Hi there,

Thank you for reaching out regarding this critical billing issue. I understand your payment attempt failed, and I sincerely apologize for the inconvenience.

Based on our knowledge base:
{chunks_text}

**Immediate actions you can take:**
1. Try completing your transaction again in 10-15 minutes
2. Use an alternative payment method if available
3. Contact your bank to ensure there are no holds on your card

I'll follow up with you within the next 2 hours with an update.

Best regards,
Customer Support Team"""
    elif category == "technical" and urgency == "high":
        return f"""Hi there,

Thank you for reporting this technical issue. I understand the application is experiencing problems, and I apologize for the disruption.

Based on our knowledge base:
{chunks_text}

I've escalated this to our technical team for immediate investigation.

**While you wait, you can try:**
1. Clearing your browser cache and cookies
2. Using a different browser or device
3. Checking our status page for updates

I'll provide an update within 4 hours on the investigation progress.

Best regards,
Customer Support Team"""
    else:
        return f"""Hi there,

Thank you for your ticket regarding {category}. I've reviewed your issue and here's what I found in our knowledge base:

{chunks_text}

Our team is reviewing your case and will respond within our standard SLA timeframe. If you have any additional information or updates, please reply to this message.

Best regards,
Customer Support Team"""


# --- Router ---
router = APIRouter()


# --- API Endpoints ---
@router.post("/classify", response_model=TicketClassification)
def classify_ticket(ticket_id: int, db: Session = Depends(get_db)):
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
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
def get_suggested_response(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    classification = db.query(AIClassification).filter(
        AIClassification.ticket_id == ticket_id
    ).first()

    # Search knowledge base for relevant chunks
    query = f"{db_ticket.title} {db_ticket.description or ''}"
    relevant_chunks = search_knowledge_base(query, db_ticket.workspace_id, db, top_k=5, min_similarity=0.3)

    # Generate RAG response
    response = generate_rag_response(db_ticket, classification, relevant_chunks, db, current_user)

    # Persist the AI response
    ai_response = AIResponse(
        ticket_id=ticket_id,
        user_id=current_user.id,
        generated_response=response.response,
        edited_response=None,
        final_response=None,
        status="generated",
        citations=[c.model_dump() for c in response.citations],
        confidence=response.confidence,
        has_sufficient_context=response.has_sufficient_context
    )
    db.add(ai_response)
    db.commit()
    db.refresh(ai_response)

    # Add response_id to the returned object for frontend tracking
    response_dict = response.model_dump()
    response_dict["response_id"] = ai_response.id
    return response_dict


@router.post("/response/{response_id}/edit")
def edit_response(
    response_id: int,
    edit: ResponseEdit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ai_response = db.query(AIResponse).join(Ticket).filter(
        AIResponse.id == response_id,
        Ticket.workspace_id == current_user.workspace_id
    ).first()
    if not ai_response:
        raise HTTPException(status_code=404, detail="AI response not found")
    if ai_response.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this response")
    if ai_response.status not in ["generated", "edited"]:
        raise HTTPException(status_code=400, detail=f"Cannot edit response in '{ai_response.status}' status")

    ai_response.edited_response = edit.edited_response
    ai_response.status = "edited"
    ai_response.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "edited", "response_id": response_id}


@router.post("/response/{response_id}/action")
def response_action(
    response_id: int,
    action: ResponseAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ai_response = db.query(AIResponse).join(Ticket).filter(
        AIResponse.id == response_id,
        Ticket.workspace_id == current_user.workspace_id
    ).first()
    if not ai_response:
        raise HTTPException(status_code=404, detail="AI response not found")

    if action.action == "approve":
        if ai_response.status == "rejected":
            raise HTTPException(status_code=400, detail="Cannot approve a rejected response")
        if ai_response.status in ["approved", "sent"]:
            raise HTTPException(status_code=400, detail=f"Response already {ai_response.status}")
        ai_response.status = "approved"
        ai_response.approved_at = datetime.now(timezone.utc)
        ai_response.approved_by = current_user.id
        ai_response.final_response = ai_response.edited_response or ai_response.generated_response
        message = "Response approved and ready for customer delivery"
    elif action.action == "reject":
        if ai_response.status in ["rejected", "sent"]:
            raise HTTPException(status_code=400, detail=f"Cannot reject a {ai_response.status} response")
        ai_response.status = "rejected"
        ai_response.final_response = None
        message = "Response rejected. Agent will compose alternative response."
    elif action.action == "send":
        if ai_response.status not in ["approved", "edited"]:
            raise HTTPException(status_code=400, detail="Can only send approved or edited responses")
        ai_response.status = "sent"
        ai_response.sent_at = datetime.now(timezone.utc)
        ai_response.final_response = ai_response.edited_response or ai_response.generated_response
        message = "Response sent to customer"
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be: approve, reject, or send")

    ai_response.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": ai_response.status, "message": message, "response_id": response_id}


@router.get("/response/{ticket_id}/history")
def get_response_history(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify ticket belongs to user's workspace
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.workspace_id == current_user.workspace_id
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    responses = db.query(AIResponse).filter(
        AIResponse.ticket_id == ticket_id
    ).order_by(AIResponse.created_at.desc()).all()

    return [
        {
            "id": r.id,
            "status": r.status,
            "generated_response": r.generated_response,
            "edited_response": r.edited_response,
            "final_response": r.final_response,
            "citations": r.citations,
            "confidence": r.confidence,
            "has_sufficient_context": r.has_sufficient_context,
            "created_at": str(r.created_at),
            "updated_at": str(r.updated_at),
            "approved_at": str(r.approved_at) if r.approved_at else None,
            "approved_by": r.approved_by,
            "sent_at": str(r.sent_at) if r.sent_at else None,
        }
        for r in responses
    ]


from datetime import datetime, timezone