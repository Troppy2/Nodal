from slowapi import Limiter
from slowapi.util import get_remote_address

# Per-IP limits for unauthenticated endpoints that create things.
limiter = Limiter(key_func=get_remote_address)
