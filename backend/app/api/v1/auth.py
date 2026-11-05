"""
ResolveAI Authentication API Router
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ...core import auth as auth_utils
from ...database import get_db
from ...models import User, Workspace
from ...core.auth import get_current_user
from ...schemas.auth import UserCreate, LoginSchema, UserResponse, Token, WorkspaceCreate, WorkspaceResponse

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = auth_utils.get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=hashed_password,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # If workspace details provided, create a workspace and assign the user as owner
    if user_data.workspace_name and user_data.workspace_subdomain:
        subdomain_exists = (
            db.query(Workspace)
            .filter(Workspace.subdomain == user_data.workspace_subdomain)
            .first()
        )
        if subdomain_exists:
            db.delete(db_user)
            db.commit()
            raise HTTPException(
                status_code=400,
                detail="Workspace subdomain already taken. Please choose another.",
            )

        workspace = Workspace(
            name=user_data.workspace_name,
            subdomain=user_data.workspace_subdomain,
            description=None,
            owner_id=db_user.id,
        )
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
        db_user.workspace_id = workspace.id
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
def create_workspace(
    workspace_data: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subdomain_exists = (
        db.query(Workspace)
        .filter(Workspace.subdomain == workspace_data.subdomain)
        .first()
    )
    if subdomain_exists:
        raise HTTPException(status_code=400, detail="Workspace subdomain already taken")

    db_workspace = Workspace(
        name=workspace_data.name,
        subdomain=workspace_data.subdomain,
        description=workspace_data.description,
        owner_id=current_user.id,
    )
    db.add(db_workspace)
    db.commit()
    db.refresh(db_workspace)

    # Assign the user to this workspace if they don't already have one
    if not current_user.workspace_id:
        current_user.workspace_id = db_workspace.id
        db.commit()
        db.refresh(current_user)

    return db_workspace