"""
ResolveAI Main Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.v1 import router as api_v1_router
from .database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ResolveAI API",
    description="AI-Powered Customer Support & Issue Resolution Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
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