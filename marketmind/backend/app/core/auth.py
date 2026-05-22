from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError


class AuthError(Exception):
    """Raised when a token is missing, expired, or invalid."""


def create_token(user_id: UUID, email: str, secret: str, algorithm: str, expire_hours: int) -> str:
    """
    Encode a JWT with the payload defined in the spec: { user_id, email, exp }.
    user_id is stored as a string because UUID is not JSON-serialisable.
    """
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "user_id": str(user_id),
        "email": email,
        "iat": now,
        "exp": now + timedelta(hours=expire_hours),
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_token(token: str, secret: str, algorithm: str) -> dict[str, Any]:
    """
    Decode and validate a JWT.
    Raises AuthError on expiry or any invalid-token condition.
    Returns the raw payload dict on success.
    """
    try:
        return jwt.decode(token, secret, algorithms=[algorithm])
    except ExpiredSignatureError:
        raise AuthError("Token has expired")
    except InvalidTokenError:
        raise AuthError("Invalid token")
