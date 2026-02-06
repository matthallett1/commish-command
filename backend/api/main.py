"""
FastAPI Main Application

Commish Command API
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from config import settings


# Hide API docs in production
_docs_url = "/api/docs" if settings.debug else None
_redoc_url = "/api/redoc" if settings.debug else None

# Create FastAPI app
app = FastAPI(
    title="Commish Command API",
    description="Your league. Your rules. Your regime.",
    version="1.0.0",
    docs_url=_docs_url,
    redoc_url=_redoc_url,
)


# --- Security headers middleware ---
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if not settings.debug:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# CORS middleware — restrict origins to explicit allow-list
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize database and load routes."""
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    
    from models.database import init_db
    init_db()
    
    # Include routers
    from api.routes import leagues, members, matchups, records, ai, drafts, players
    app.include_router(leagues.router, prefix="/api/leagues", tags=["Leagues"])
    app.include_router(members.router, prefix="/api/members", tags=["Members"])
    app.include_router(matchups.router, prefix="/api/matchups", tags=["Matchups"])
    app.include_router(records.router, prefix="/api/records", tags=["Records"])
    app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
    app.include_router(drafts.router, prefix="/api/drafts", tags=["Drafts"])
    app.include_router(players.router, prefix="/api/players", tags=["Players"])


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Commish Command API",
        "tagline": "Your league. Your rules. Your regime.",
        "version": "1.0.0",
        "docs": "/api/docs",
        "endpoints": {
            "leagues": "/api/leagues",
            "members": "/api/members",
            "matchups": "/api/matchups",
            "records": "/api/records",
            "ai": "/api/ai",
            "drafts": "/api/drafts",
            "players": "/api/players",
        }
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
    )
