from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, Header, Request
from fastapi import HTTPException, status

from app.config import Settings, get_settings
from app.core.auth import AuthError, decode_token
from app.services.llm_service import LLMService
from app.services.retrieval_service import RetrievalService


@dataclass
class CurrentUser:
    user_id: UUID
    email: str


async def get_current_user(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    """
    Extract and validate the Bearer token from the Authorization header.
    Used as a FastAPI dependency on every protected route.

    Raises HTTP 401 if the header is absent, malformed, or the JWT is invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
        )

    token = authorization.removeprefix("Bearer ").strip()

    try:
        payload = decode_token(token, settings.jwt_secret, settings.jwt_algorithm)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    try:
        return CurrentUser(user_id=UUID(payload["user_id"]), email=payload["email"])
    except (KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token payload is invalid"
        )


def get_llm(request: Request) -> LLMService:
    return request.app.state.llm


def get_retrieval(request: Request) -> RetrievalService:
    return request.app.state.retrieval
