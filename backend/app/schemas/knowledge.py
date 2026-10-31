from pydantic import BaseModel, Field
from typing import Optional

class KnowledgeBaseCreate(BaseModel):
    title: str = Field(..., description="Document title")
    content: str = Field(..., description="Document content/text")
    source_type: str = Field(..., description="Type: faq, policy, guide, etc.")
    metadata: Optional[dict] = Field(default_factory=dict, description="Additional metadata")

class KnowledgeBaseResponse(BaseModel):
    id: int
    title: str
    source_type: str
    created_at: str
    chunk_count: int = 0

    class Config:
        from_attributes = True