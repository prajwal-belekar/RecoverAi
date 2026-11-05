from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ...database import get_db
from ...models import User
from ...schemas.auth import UserResponse
from ...core.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=list[UserResponse], status_code=200)
def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if not current_user.workspace_id:
        return []
    users = db.query(User).filter(User.workspace_id == current_user.workspace_id).offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=UserResponse, status_code=200)
def get_user(user_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if not current_user.workspace_id:
        raise HTTPException(status_code=404, detail="User not found")
    user = db.query(User).filter(User.id == user_id, User.workspace_id == current_user.workspace_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.patch("/{user_id}", response_model=UserResponse, status_code=200)
def update_user(user_id: int, is_active: bool, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if not current_user.workspace_id:
        raise HTTPException(status_code=404, detail="User not found")
    user = db.query(User).filter(User.id == user_id, User.workspace_id == current_user.workspace_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if not current_user.workspace_id:
        raise HTTPException(status_code=404, detail="User not found")
    user = db.query(User).filter(User.id == user_id, User.workspace_id == current_user.workspace_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return None
