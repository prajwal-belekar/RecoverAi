from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

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


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of results to return")
    min_similarity: float = Field(default=0.3, ge=0.0, le=1.0, description="Minimum cosine similarity threshold")

class KnowledgeChunkResult(BaseModel):
    similarity: float
    title: str
    knowledge_base_id: int
    chunk_id: int
    chunk_index: int
    content: str
    source_type: str

class KnowledgeSearchResponse(BaseModel):
    results: List[KnowledgeChunkResult]
    query: str
    total: int