from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import settings

bearer = HTTPBearer(auto_error=False)


@lru_cache
def _jwks() -> jwt.PyJWKClient:
    return jwt.PyJWKClient(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json", cache_keys=True)


def _verify(token: str) -> dict:
    """Supabase signs user tokens with an asymmetric key (ES256/RS256, published as JWKS);
    older projects use the HS256 JWT secret. Accept either, always with audience "authenticated".
    HS256 is refused when no secret is configured, so a guessable default can never sign tokens."""
    alg = jwt.get_unverified_header(token).get("alg")
    if alg == "HS256" and settings.supabase_jwt_secret:
        key = settings.supabase_jwt_secret
    elif alg in ("ES256", "RS256"):
        key = _jwks().get_signing_key_from_jwt(token).key
    else:
        raise jwt.InvalidAlgorithmError(alg)
    return jwt.decode(token, key, algorithms=[alg], audience="authenticated")


def _user(creds: HTTPAuthorizationCredentials | None) -> dict | None:
    if creds is None:
        return None
    try:
        payload = _verify(creds.credentials)
    except (jwt.PyJWTError, jwt.PyJWKClientError):
        raise HTTPException(401, "Invalid token")
    return {"id": payload["sub"], "jwt": creds.credentials}


def get_current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict:
    user = _user(creds)
    if user is None:
        raise HTTPException(401, "Missing bearer token")
    return user


def get_optional_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict | None:
    """For public endpoints that personalize when a viewer is signed in (viewer_starred, fits)."""
    return _user(creds)
