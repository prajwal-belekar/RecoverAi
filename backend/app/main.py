"""
ResolveAI Main Application Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .api.v1 import router as api_v1_router
from .database import engine, Base
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os

Base.metadata.create_all(bind=engine)

# Rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute", "1000/hour"]
)
app = FastAPI(
    title="ResolveAI API",
    description="AI-Powered Customer Support & Issue Resolution Platform",
    version="1.0.0"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS origins from environment variable, comma-separated
cors_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001")
allow_origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {
        "service": "ResolveAI API",
        "status": "operational",
        "documentation": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ResolveAI API"}