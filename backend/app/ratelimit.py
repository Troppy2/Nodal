"""Per-user rate limits (docs/BACKEND.md "Rate limiting"). A FastAPI dependency over `limits`, the
library slowapi is built on, keyed by the verified user id rather than the client IP."""

from fastapi import Depends, HTTPException
from limits import parse
from limits.storage import MemoryStorage
from limits.strategies import MovingWindowRateLimiter

from .deps import get_current_user

limiter = MovingWindowRateLimiter(MemoryStorage())


def rate_limit(rule: str, scope: str):
    """`Depends(rate_limit("10/minute", "comments"))` in place of `Depends(get_current_user)`."""
    item = parse(rule)

    def dep(user: dict = Depends(get_current_user)) -> dict:
        if not limiter.hit(item, scope, user["id"]):
            raise HTTPException(429, f"Slow down: at most {rule.replace('/', ' per ')}. Try again shortly.")
        return user

    return dep
