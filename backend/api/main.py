"""
FastAPI Main Application

Commish Command API
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create FastAPI app first - minimal
app = FastAPI(
    title="Commish Command API",
    description="Your league. Your rules. Your regime.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
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
    from api.routes import leagues, members, matchups, records
    app.include_router(leagues.router, prefix="/api/leagues", tags=["Leagues"])
    app.include_router(members.router, prefix="/api/members", tags=["Members"])
    app.include_router(matchups.router, prefix="/api/matchups", tags=["Matchups"])
    app.include_router(records.router, prefix="/api/records", tags=["Records"])


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
        }
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    from config import settings
    
    uvicorn.run(
        "api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )
