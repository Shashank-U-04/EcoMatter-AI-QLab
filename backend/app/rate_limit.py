"""Per-IP fixed-window rate limiting — dependency-free, single-process.

Good enough for the current deployment shape (one uvicorn process); a
multi-process deployment would move this state to Redis. Auth endpoints get a
strict budget, everything else a generous one that UI polling never reaches.
"""
import threading
import time

from fastapi import Request, status
from fastapi.responses import JSONResponse

from . import config

AUTH_PREFIX = "/auth/"
WINDOW_SECONDS = 60


class FixedWindowLimiter:
    """Counts requests per (key, current minute); thread-safe."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._window_start = 0
        self._counts: dict[str, int] = {}

    def allow(self, key: str, limit: int) -> bool:
        now = int(time.monotonic())
        window = now - (now % WINDOW_SECONDS)
        with self._lock:
            if window != self._window_start:
                self._window_start = window
                self._counts = {}
            count = self._counts.get(key, 0) + 1
            self._counts[key] = count
            return count <= limit


limiter = FixedWindowLimiter()


async def rate_limit_middleware(request: Request, call_next):
    if not config.RATE_LIMIT_ENABLED:
        return await call_next(request)
    client_ip = request.client.host if request.client else "unknown"
    is_auth = request.url.path.startswith(AUTH_PREFIX)
    limit = (
        config.RATE_LIMIT_AUTH_PER_MINUTE if is_auth else config.RATE_LIMIT_GENERAL_PER_MINUTE
    )
    bucket = "auth" if is_auth else "general"
    if not limiter.allow(f"{client_ip}:{bucket}", limit):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Too many requests — try again in a minute."},
        )
    return await call_next(request)
