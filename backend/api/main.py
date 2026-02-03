"""
FastAPI Main Application

Top Pot Fantasy Football Dashboard API
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from api.routes import leagues, members, matchups, records
from models.database import init_db

# Create FastAPI app
app = FastAPI(
    title="Commish Command API",
    description="Your league. Your rules. Your regime. API for fantasy football commissioner dashboards.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS middleware for frontend
# Allow all origins since this is a read-only public dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(leagues.router, prefix="/api/leagues", tags=["Leagues"])
app.include_router(members.router, prefix="/api/members", tags=["Members"])
app.include_router(matchups.router, prefix="/api/matchups", tags=["Matchups"])
app.include_router(records.router, prefix="/api/records", tags=["Records"])


@app.on_event("startup")
async def startup_event():
    """Initialize database."""
    init_db()
    # Import is now done manually or via a separate endpoint
    # to avoid startup issues
    try:
        from data_import import check_and_import
        check_and_import()
    except Exception as e:
        print(f"Import failed (non-fatal): {e}")


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
