from pydantic import BaseModel, Field
from typing import Optional, List

class TicketClassification(BaseModel):
    category: str
    urgency: str
    sentiment: str
    department: str
    suggested_action: str
    confidence: float

class TicketPriority(BaseModel):
    priority_level: str
    score: float
    rationale: str


class Citation(BaseModel):
    doc_id: int
    doc_title: str
    chunk_id: int
    chunk_index: int
    content: str
    similarity: float


class SuggestedResponse(BaseModel):
    response: str
    confidence: float
    citations: List[Citation] = []
    requires_approval: bool = True
    has_sufficient_context: bool = True
    response_id: Optional[int] = None


class ResponseApproval(BaseModel):
    approved: bool
    agent_comments: Optional[str] = None


class ResponseEdit(BaseModel):
    edited_response: str


class ResponseAction(BaseModel):
    action: str
    agent_comments: Optional[str] = None