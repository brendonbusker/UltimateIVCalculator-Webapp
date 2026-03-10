import os
import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict, List

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router

_LOCAL_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
_LOCAL_HOSTS = ["localhost", "127.0.0.1"]
_RATE_LIMIT_BUCKETS: Dict[str, Deque[float]] = defaultdict(deque)
_RATE_LIMIT_LOCK = threading.Lock()


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _csv_env(name: str, default: List[str]) -> List[str]:
    value = os.getenv(name)
    if not value:
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
IS_PRODUCTION = APP_ENV == "production"
ALLOWED_ORIGINS = _csv_env("ALLOWED_ORIGINS", [] if IS_PRODUCTION else _LOCAL_ORIGINS)
ALLOWED_HOSTS = _csv_env("ALLOWED_HOSTS", _LOCAL_HOSTS if not IS_PRODUCTION else ["localhost"])
ENABLE_RATE_LIMIT = _bool_env("ENABLE_RATE_LIMIT", IS_PRODUCTION)
DISABLE_API_DOCS = _bool_env("DISABLE_API_DOCS", IS_PRODUCTION)
RATE_LIMIT_WINDOW_SECONDS = max(1, int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60")))
RATE_LIMIT_MAX_REQUESTS = max(1, int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "120")))
MAX_REQUEST_BODY_BYTES = max(1024, int(os.getenv("MAX_REQUEST_BODY_BYTES", "32768")))

app = FastAPI(
    title="Ultimate IV Calculator API",
    version="0.4.0",
    docs_url=None if DISABLE_API_DOCS else "/docs",
    redoc_url=None if DISABLE_API_DOCS else "/redoc",
    openapi_url=None if DISABLE_API_DOCS else "/openapi.json",
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=ALLOWED_HOSTS,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def enforce_security(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH"}:
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_REQUEST_BODY_BYTES:
            return JSONResponse(status_code=413, content={"detail": "Request body too large."})

    if ENABLE_RATE_LIMIT and request.url.path.startswith("/api") and request.url.path != "/api/health":
        client_host = request.client.host if request.client else "unknown"
        now = time.time()
        retry_after = RATE_LIMIT_WINDOW_SECONDS

        with _RATE_LIMIT_LOCK:
            bucket = _RATE_LIMIT_BUCKETS[client_host]
            while bucket and now - bucket[0] >= RATE_LIMIT_WINDOW_SECONDS:
                bucket.popleft()

            if len(bucket) >= RATE_LIMIT_MAX_REQUESTS:
                retry_after = max(1, int(RATE_LIMIT_WINDOW_SECONDS - (now - bucket[0])))
                response = JSONResponse(status_code=429, content={"detail": "Rate limit exceeded. Try again later."})
                response.headers["Retry-After"] = str(retry_after)
                return response

            bucket.append(now)

    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault("Cross-Origin-Resource-Policy", "same-site")
    response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
    if request.url.path.startswith("/api"):
        response.headers.setdefault("Cache-Control", "no-store")
    return response


app.include_router(router, prefix="/api")
