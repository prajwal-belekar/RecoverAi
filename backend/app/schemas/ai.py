from pydantic import BaseModel
from typing import Optional

class TicketClassification(BaseModel):
    category: str  # e.g., "billing", "technical", "account", "general"
    urgency: str   # "low", "medium", "high", "critical"
    sentiment: str  # "positive", "negative", "neutral"
    department: str  # e.g., "billing", "technical support", "sales"
    suggested_action: str
    confidence: float  # 0.0 to 1.0

class TicketPriority(BaseModel):
    priority_level: str  # e.g., "Low", "Medium", "High", "Critical"
    score: float  # Numerical score 0-100
    rationale: str  # Human-readable explanation of priority assignment