from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    name: str
    workspace_id: Optional[int] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class WorkspaceCreate(BaseModel):
    name: str
    subdomain: str
    description: Optional[str] = None

class WorkspaceResponse(BaseModel):
    id: int
    name: str
    subdomain: str
    description: Optional[str] = None