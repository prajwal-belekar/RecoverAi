"""
ResolveAI Database Models
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"
    id = Column(Integer, primary_key=True, index=True)
    knowledge_base_id = Column(Integer, ForeignKey("knowledge_base.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=False)
    token_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    knowledge_base = relationship("KnowledgeBase", back_populates="chunks")

class AIResponse(Base):
    __tablename__ = "ai_responses"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    generated_response = Column(Text, nullable=False)
    edited_response = Column(Text, nullable=True)
    final_response = Column(Text, nullable=True)
    status = Column(String(20), default="generated", nullable=False, index=True)
    citations = Column(JSON, nullable=True)
    confidence = Column(Float, nullable=True)
    has_sufficient_context = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    sent_at = Column(DateTime, nullable=True)

    ticket = relationship("Ticket", back_populates="ai_responses")
    user = relationship("User", foreign_keys=[user_id])
    approver = relationship("User", foreign_keys=[approved_by])

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(50), default="agent")
    is_active = Column(Boolean, default=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    workspace = relationship("Workspace", back_populates="users", foreign_keys=[workspace_id])

class Workspace(Base):
    __tablename__ = "workspaces"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    subdomain = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id", use_alter=True, name="fk_workspace_owner"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    owner = relationship("User", foreign_keys=[owner_id])
    users = relationship("User", back_populates="workspace", foreign_keys="User.workspace_id")
    tickets = relationship("Ticket", back_populates="workspace")
    knowledge_base = relationship("KnowledgeBase", back_populates="workspace")

class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="Open")
    priority = Column(String(50), default="Medium")
    category = Column(String(100), nullable=True)
    sentiment = Column(String(50), nullable=True)
    department = Column(String(100), nullable=True)
    customer_name = Column(String(200), nullable=True)
    customer_email = Column(String(255), nullable=True)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    workspace = relationship("Workspace", back_populates="tickets")
    classifications = relationship("AIClassification", back_populates="ticket", cascade="all, delete-orphan")
    priorities = relationship("AIPriority", back_populates="ticket", cascade="all, delete-orphan")
    ai_responses = relationship("AIResponse", back_populates="ticket", cascade="all, delete-orphan")

class AIClassification(Base):
    __tablename__ = "ai_classifications"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    category = Column(String(100), nullable=False)
    urgency = Column(String(50), nullable=False)
    sentiment = Column(String(50), nullable=False)
    department = Column(String(100), nullable=False)
    suggested_action = Column(Text, nullable=False)
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    ticket = relationship("Ticket", back_populates="classifications")

class AIPriority(Base):
    __tablename__ = "ai_priorities"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    priority_level = Column(String(50), nullable=False)
    score = Column(Float, nullable=False)
    rationale = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    ticket = relationship("Ticket", back_populates="priorities")

class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=True)
    doc_metadata = Column(JSON, nullable=True, default={})
    source_type = Column(String(50), nullable=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False)
    chunk_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    workspace = relationship("Workspace", back_populates="knowledge_base")
    chunks = relationship("KnowledgeChunk", back_populates="knowledge_base", cascade="all, delete-orphan")

class TicketUpdate(Base):
    __tablename__ = "ticket_updates"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class APIKey(Base):
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider = Column(String(50), nullable=False)
    key_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))