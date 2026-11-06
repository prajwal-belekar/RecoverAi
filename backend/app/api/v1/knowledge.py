"""
ResolveAI Knowledge Base & RAG API
"""
import os
import json
import hashlib
from typing import List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from sqlalchemy.orm import Session
import numpy as np

from app.database import get_db
from app.models import KnowledgeBase, KnowledgeChunk, Workspace, User
from app.schemas.knowledge import KnowledgeBaseCreate, KnowledgeBaseResponse, KnowledgeSearchRequest, KnowledgeSearchResponse, KnowledgeChunkResult
from app.core.auth import get_current_user

router = APIRouter()


def extract_text_from_file(file_content: bytes, filename: str) -> str:
    """Extract text from uploaded file based on extension"""
    ext = os.path.splitext(filename)[1].lower()

    if ext == '.txt':
        return file_content.decode('utf-8', errors='replace')
    elif ext == '.pdf':
        try:
            import PyPDF2
            from io import BytesIO
            pdf_file = BytesIO(file_content)
            reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return text
        except Exception:
            return file_content.decode('utf-8', errors='replace')[:500]
    elif ext == '.docx':
        try:
            import docx
            from io import BytesIO
            doc_file = BytesIO(file_content)
            doc = docx.Document(doc_file)
            text = "\n".join([para.text for para in doc.paragraphs])
            return text
        except Exception:
            return file_content.decode('utf-8', errors='replace')[:500]
    else:
        return file_content.decode('utf-8', errors='replace')


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list:
    """Split text into overlapping chunks for embedding"""
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks


def generate_embedding(text: str) -> List[float]:
    """Generate real embedding using OpenAI embeddings endpoint, with mock fallback."""
    import openai
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
            return embedding
    except Exception:
        pass

    hash_obj = hashlib.sha256(text.encode('utf-8'))
    embedding = np.frombuffer(hash_obj.digest(), dtype=np.float32)
    while len(embedding) < 1536:
        embedding = np.append(embedding, np.zeros(1536 - len(embedding)))
    embedding = embedding[:1536]
    norm = sum(x**2 for x in embedding) ** 0.5
    if norm > 0:
        embedding = [x / norm for x in embedding]
    # Convert numpy array to list for JSON serialization
    return [float(x) for x in embedding]


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Compute cosine similarity between two vectors"""
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


def keyword_search(query: str, workspace_id: int, db: Session) -> List[Dict[str, Any]]:
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


@router.get("/", response_model=List[KnowledgeBaseResponse])
def list_knowledge_base(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all knowledge base documents for the user's workspace"""
    if not current_user.workspace_id:
        return []

    kb_entries = db.query(KnowledgeBase).filter(
        KnowledgeBase.workspace_id == current_user.workspace_id
    ).all()

    return [
        {
            "id": kb.id,
            "title": kb.title,
            "source_type": kb.source_type or "unknown",
            "created_at": str(kb.created_at),
            "chunk_count": kb.chunk_count if hasattr(kb, 'chunk_count') else 0
        }
        for kb in kb_entries
    ]


@router.post("/upload", response_model=KnowledgeBaseResponse, status_code=201)
def upload_knowledge_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload and process a knowledge base document"""
    if not current_user.workspace_id:
        raise HTTPException(status_code=400, detail="User must belong to a workspace to upload documents")

    allowed_extensions = {'.txt', '.pdf', '.docx'}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Supported: .txt, .pdf, .docx"
        )

    # File size limit (default 10MB, configurable via env)
    max_file_size = int(os.getenv("MAX_FILE_SIZE_MB", "10")) * 1024 * 1024
    content = file.file.read()

    if not content or len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    if len(content) > max_file_size:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds maximum allowed size of {max_file_size // (1024 * 1024)}MB"
        )

    text = extract_text_from_file(content, file.filename)

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from file")

    chunks = chunk_text(text)

    if not chunks:
        raise HTTPException(status_code=400, detail="Document produced no valid chunks")

    content_hash = hashlib.sha256(content).hexdigest()[:12]

    kb_entry = KnowledgeBase(
        title=file.filename,
        content=text,
        embedding=generate_embedding(text),
        doc_metadata={"source_type": file.content_type or "unknown", "file_name": file.filename, "content_hash": content_hash},
        source_type=ext[1:] if ext else "unknown",
        workspace_id=current_user.workspace_id,
        chunk_count=0
    )

    db.add(kb_entry)
    db.flush()

    embedding_failures = 0
    for i, chunk in enumerate(chunks):
        try:
            chunk_embedding = generate_embedding(chunk)
            kb_chunk = KnowledgeChunk(
                knowledge_base_id=kb_entry.id,
                chunk_index=i,
                content=chunk,
                embedding=chunk_embedding,
                token_count=len(chunk.split())
            )
            db.add(kb_chunk)
        except Exception as e:
            embedding_failures += 1
            continue

    if embedding_failures == len(chunks):
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to generate embeddings for all chunks")

    kb_entry.chunk_count = len(chunks) - embedding_failures
    db.commit()
    db.refresh(kb_entry)

    return {
        "id": kb_entry.id,
        "title": file.filename,
        "source_type": kb_entry.source_type,
        "created_at": str(kb_entry.created_at),
        "chunk_count": kb_entry.chunk_count
    }


@router.delete("/{kb_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge_base(
    kb_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a knowledge base document"""
    if not current_user.workspace_id:
        raise HTTPException(status_code=400, detail="User must belong to a workspace")

    kb_entry = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == kb_id,
        KnowledgeBase.workspace_id == current_user.workspace_id
    ).first()

    if not kb_entry:
        raise HTTPException(status_code=404, detail="Knowledge base entry not found")

    db.delete(kb_entry)
    db.commit()
    return None


@router.post("/search", response_model=KnowledgeSearchResponse)
def search_knowledge(
    request: KnowledgeSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Semantic search in knowledge base using vector similarity with keyword fallback"""
    if not current_user.workspace_id:
        raise HTTPException(status_code=400, detail="User must belong to a workspace")

    query = request.query
    top_k = request.top_k
    min_similarity = request.min_similarity

    if not query or not query.strip():
        return KnowledgeSearchResponse(results=[], query=query, total=0)

    query_embedding = generate_embedding(query)

    chunks = db.query(KnowledgeChunk).join(KnowledgeBase).filter(
        KnowledgeBase.workspace_id == current_user.workspace_id
    ).all()

    if not chunks:
        return KnowledgeSearchResponse(results=[], query=query, total=0)

    # Vector search with lower threshold for mock embeddings
    effective_threshold = min(min_similarity, 0.05)
    vector_results = []
    for chunk in chunks:
        similarity = cosine_similarity(query_embedding, chunk.embedding)
        if similarity >= effective_threshold:
            kb = chunk.knowledge_base
            vector_results.append(KnowledgeChunkResult(
                similarity=round(similarity, 4),
                title=kb.title,
                knowledge_base_id=kb.id,
                chunk_id=chunk.id,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                source_type=kb.source_type or "unknown",
            ))

    # Keyword search as supplement
    keyword_results = keyword_search(query, current_user.workspace_id, db)
    keyword_chunk_results = [
        KnowledgeChunkResult(
            similarity=r["similarity"],
            title=r["title"],
            knowledge_base_id=r["knowledge_base_id"],
            chunk_id=r["chunk_id"],
            chunk_index=r["chunk_index"],
            content=r["content"],
            source_type=r["source_type"],
        )
        for r in keyword_results
    ]

    # Combine and deduplicate by chunk_id
    seen_ids = set()
    combined = []
    for r in vector_results + keyword_chunk_results:
        if r.chunk_id not in seen_ids:
            seen_ids.add(r.chunk_id)
            combined.append(r)

    combined.sort(key=lambda x: x.similarity, reverse=True)
    combined = combined[:top_k]

    return KnowledgeSearchResponse(results=combined, query=query, total=len(combined))


@router.get("/{kb_id}", response_model=KnowledgeBaseResponse)
def get_knowledge_base(
    kb_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get knowledge base document by ID"""
    if not current_user.workspace_id:
        raise HTTPException(status_code=400, detail="User must belong to a workspace")

    kb_entry = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == kb_id,
        KnowledgeBase.workspace_id == current_user.workspace_id
    ).first()

    if not kb_entry:
        raise HTTPException(status_code=404, detail="Knowledge base entry not found")

    return {
        "id": kb_entry.id,
        "title": kb_entry.title,
        "source_type": kb_entry.source_type or "unknown",
        "created_at": str(kb_entry.created_at),
        "chunk_count": kb_entry.chunk_count if hasattr(kb_entry, 'chunk_count') else 0
    }