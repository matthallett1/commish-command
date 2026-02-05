"""Configuration settings for the Top Pot Dashboard backend."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent

# Use /app/data in Docker, otherwise use local data directory
if os.path.exists("/app/data"):
    DATA_DIR = Path("/app/data")
else:
    DATA_DIR = BASE_DIR / "data"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Yahoo API
    yahoo_client_id: str = Field(default="", alias="YAHOO_CLIENT_ID")
    yahoo_client_secret: str = Field(default="", alias="YAHOO_CLIENT_SECRET")
    
    # Database - use absolute path to avoid issues with working directory
    database_url: str = Field(
        default=f"sqlite:///{str(DATA_DIR)}/top_pot.db",
        alias="DATABASE_URL"
    )
    
    # API
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")
    debug: bool = Field(default=False, alias="DEBUG")
    
    # CORS - comma-separated list of allowed origins
    allowed_origins: str = Field(
        default="http://localhost:3000",
        alias="ALLOWED_ORIGINS"
    )
    
    # Yahoo OAuth token file location
    yahoo_token_file: Path = Field(default=BACKEND_DIR / "oauth2.json")
    
    # AI - Anthropic
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    
    class Config:
        env_file = BACKEND_DIR / ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    @property
    def yahoo_credentials_configured(self) -> bool:
        """Check if Yahoo credentials are configured."""
        return bool(self.yahoo_client_id and self.yahoo_client_secret)
    
    @property
    def anthropic_configured(self) -> bool:
        """Check if Anthropic API key is configured."""
        return bool(self.anthropic_api_key)
    
    @property
    def cors_origins(self) -> list[str]:
        """Parse comma-separated ALLOWED_ORIGINS into a list."""
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


# Global settings instance
settings = Settings()

# Ensure data directory exists
DATA_DIR.mkdir(parents=True, exist_ok=True)
