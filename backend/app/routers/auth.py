"""Auth endpoints: email/password signup/login and Firebase token exchange."""
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..firebase import verify_firebase_token
from ..models import User
from ..schemas import (
    ChangePasswordRequest,
    FirebaseLoginRequest,
    LoginRequest,
    SignupRequest,
    TokenResponse,
)
from ..security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        org=payload.org,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(
        access_token=create_access_token(user.id), user_id=user.id, name=user.name
    )


@router.post("/firebase", response_model=TokenResponse)
def firebase_login(payload: FirebaseLoginRequest, db: Session = Depends(get_db)):
    """Exchange a verified Firebase ID token for an app session token.

    Creates the user on first login (email/password signup or Google popup);
    the local password hash is set to an unguessable value since Firebase owns
    the credential.
    """
    claims = verify_firebase_token(payload.id_token)
    email = claims["email"].lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        display_name = payload.name or claims.get("name") or email.split("@")[0]
        user = User(
            name=display_name,
            email=email,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            org=payload.org,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return TokenResponse(
        access_token=create_access_token(user.id), user_id=user.id, name=user.name
    )


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect"
        )
    user.password_hash = hash_password(payload.new_password)
    db.commit()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )
    return TokenResponse(
        access_token=create_access_token(user.id), user_id=user.id, name=user.name
    )
