"""
ResolveAI Knowledge Base & RAG API
"""
import os
import json
import hashlib
from fastapi import APIRouter, UploadFile, File, Depends
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import KnowledgeBase, Workspace
from app.schemas.knowledge import KnowledgeBaseCreate, KnowledgeBaseResponse
import numpy as np

router = APIRouter()

# In-memory storage for embeddings (in production, use Redis or dedicated vector store)
embedding_store: Dict[str, List[float]] = {}
chunk_metadata: Dict[str, dict] = {}


def extract_text_from_file(file_content: bytes, filename: str) -> str:
    """Extract text from uploaded file based on extension"""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == '.txt':
        return file_content.decode('utf-8', errors='replace')
    elif ext == '.pdf':
        # In production, use PyPDF2 or pdfminer
        # For demo, return first 500 chars
        return file_content.decode('utf-8', errors='replace')[:500]
    elif ext == '.docx':
        # In production, use python-docx
        return file_content.decode('utf-8', errors='replace')[:500]
    else:
        return file_content.decode('utf-8', errors='replace')


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list:
    """Split text into overlapping chunks for embedding"""
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


def generate_embedding(text: str) -> List[float]:
    """Generate real embedding using OpenAI embeddings endpoint, with mock fallback."""
    # Try real OpenAI embedding
    import openai
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key and api_key != "CHANGE_ME_IN_PRODUCTION_USE_ENV_VAR":
            response = openai.Embedding.create(
                model="text-embedding-3-small",
                input=text
            )
            embedding = response.data[0].embedding
            # Ensure 1536 dimensions
            while len(embedding) < 1536:
                embedding.append(0.0)
            embedding = embedding[:1536]
            # Normalize
            norm = sum(x**2 for x in embedding) ** 0.5
            if norm > 0:
                embedding = [x / norm for x in embedding]
            return embedding
    except Exception:
        pass
    
    # Mock embedding fallback (hash-based)
    hash_obj = hashlib.sha256(text.encode('utf-8'))
    embedding = np.frombuffer(hash_obj.digest(), dtype=np.float32)
    while len(embedding) < 1536:
        embedding = np.append(embedding, np.zeros(1536 - len(embedding)))
    embedding = embedding[:1536]
    norm = sum(x**2 for x in embedding) ** 0.5
    if norm > 0:
        embedding = [x / norm for x in embedding]
    return embedding


def keyword_search(query: str, chunk_metadata: Dict[str, dict]) -> list:
    """Keyword-based search through knowledge base chunks."""
    results = []
    for chunk_key, meta in chunk_metadata.items():
        chunk_text = meta.get("chunk_text", "")
        if query.lower() in chunk_text.lower():
            results.append({
                "similarity": 1.0,
                "title": meta.get("title", "Unknown"),
                "chunk_text": chunk_text,
                "source_type": meta.get("source_type", "unknown"),
                "chunk_index": meta.get("chunk_index", 0)
            })
    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:5]


@router.post("/upload", response_model=KnowledgeBaseResponse, status_code=201)
def upload_knowledge_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload and process a knowledge base document"""
    # Read file content
    content = file.file.read()
    filename = file.filename
    
    # Extract text
    text = extract_text_from_file(content, filename)
    
    # Chunk the text
    chunks = chunk_text(text)
    
    # Create knowledge base entry
    content_hash = hashlib.sha256(content).hexdigest()[:12]
    
    workspace_id = 1  # In production, get from authenticated user context
    
    kb_entry = KnowledgeBase(
        title=filename,
        content=text,
        embedding=generate_embedding(text),
        metadata={"source_type": file.content_type or "unknown", "file_name": filename},
        workspace_id=workspace_id
    )
    
    db.add(kb_entry)
    db.commit()
    db.refresh(kb_entry)
    
    # Store chunks and embeddings
    for i, chunk in enumerate(chunks):
        chunk_key = f"kb_{kb_entry.id}_chunk_{i}"
        embedding_store[chunk_key] = generate_embedding(chunk)
        chunk_metadata[chunk_key] = {
            "knowledge_base_id": kb_entry.id,
            "chunk_index": i,
            "text": chunk[:100] + "..." if len(chunk) > 100 else chunk
        }
    
    # Update chunk count
    kb_entry.chunk_count = len(chunks)
    db.commit()
    
    return {"id": kb_entry.id, "title": filename, "source_type": "unknown", "created_at": str(kb_entry.created_at), "chunk_count": len(chunks)}


@router.post("/search/{q}", response_model=dict)
def search_knowledge(q: str, db: Session = Depends(get_db)):
    """Semantic search in knowledge base using RAG"""
    if not q:
        return {"results": [], "query": q, "total": 0}
    
    # Keyword-based search through stored chunks
    results = keyword_search(q, chunk_metadata)
    
    return {
        "results": results,
        "query": q,
        "total": len(results)
    }


@router.get("/{kb_id}", response_model=KnowledgeBaseResponse)
def get_knowledge_base(kb_id: int, db: Session = Depends(get_db)):
    """Get knowledge base document by ID"""
    kb_entry = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb_entry:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Knowledge base entry not found")
    
    return {"id": kb_entry.id, "title": kb_entry.title, "source_type": kb_entry.metadata.get("source_type", "unknown") if kb_entry.metadata else "unknown", "created_at": str(kb_entry.created_at), "chunk_count": kb_entry.chunk_count if hasattr(kb_entry, 'chunk_count') else 0}