from pydantic import BaseModel
from typing import Optional

class TicketCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    agent_id: Optional[int] = None

class TicketResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    priority: str
    category: Optional[str]
    customer_name: Optional[str]
    customer_email: Optional[str]
    agent_id: Optional[int] = None

    class Config:
        from_attributes = True