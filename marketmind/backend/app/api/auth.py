from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.config import Settings, get_settings
from app.core.auth import create_token

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    settings: Settings = Depends(get_settings),
) -> TokenResponse:
    if body.email != settings.admin_email or body.password != settings.admin_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = create_token(
        user_id=uuid4(),
        email=body.email,
        secret=settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
        expire_hours=settings.jwt_expire_hours,
    )
    return TokenResponse(access_token=token)


@router.post("/register")
async def register() -> dict:
    return {"detail": "Single-user system. Use /auth/login with admin credentials."}


@router.post("/refresh")
async def refresh() -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Use /auth/login to get a new token")


@router.post("/logout")
async def logout() -> dict:
    return {"detail": "Token invalidation is client-side. Discard the token."}
