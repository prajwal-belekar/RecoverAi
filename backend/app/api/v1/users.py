"""
ResolveAI User Profile & Settings API Router
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from ...database import get_db
from ...models import User
from ...core.auth import get_current_user, verify_password, get_password_hash

router = APIRouter()

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    name: str
    role: str
    is_active: bool
    workspace_id: Optional[int] = None

    class Config:
        from_attributes = True

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile"""
    return current_user

@router.patch("/me", response_model=UserResponse)
def update_profile(profile_data: ProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update current user's profile (name, email)"""
    if profile_data.name is not None:
        current_user.name = profile_data.name
    if profile_data.email is not None:
        existing = db.query(User).filter(User.email == profile_data.email).first()
        if existing and existing.id != current_user.id:
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = profile_data.email
    db.commit()
    db.refresh(current_user)
    return current_user

@router.patch("/me/password", response_model=dict)
def update_password(password_data: PasswordUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update current user's password"""
    if not verify_password(password_data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    return {"detail": "Password updated successfully"}