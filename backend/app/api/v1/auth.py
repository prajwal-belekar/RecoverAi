"""
ResolveAI Authentication API Router
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ... import auth as auth_utils
from ...database import get_db
from ...models import User, Workspace
from ...schemas.auth import UserCreate, LoginSchema, UserResponse, Token, WorkspaceCreate, WorkspaceResponse

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth_utils.get_password_hash(user_data.password)
    db_user = User(email=user_data.email, name=user_data.name, password_hash=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
def login(user_data: LoginSchema, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_data.email).first()
    if not db_user or not auth_utils.verify_password(user_data.password, db_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    access_token = auth_utils.create_access_token(data={"sub": user_data.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/workspaces", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(workspace_data: WorkspaceCreate, db: Session = Depends(get_db)):
    db_workspace = Workspace(
        name=workspace_data.name,
        subdomain=workspace_data.subdomain,
        description=workspace_data.description,
        owner_id=1
    )
    db.add(db_workspace)
    db.commit()
    db.refresh(db_workspace)
    return db_workspace