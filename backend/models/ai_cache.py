"""AI Cache model for storing generated narratives."""

from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from datetime import datetime

from .database import Base


class AICache(Base):
    """
    Cache for AI-generated narratives.
    Stores insights keyed by (block_type + context_hash + tone) so repeat
    visits load instantly without calling the Anthropic API.
    """
    __tablename__ = "ai_cache"

    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String, unique=True, nullable=False, index=True)  # hash of block_type + context + tone
    block_type = Column(String, nullable=False)      # "stats_overview", "season_history", "summary_records", etc.
    tone = Column(String, nullable=False, default="commissioner")  # "commissioner", "trash_talk", "hype_man", etc.
    narrative = Column(Text, nullable=False)
    model = Column(String, nullable=False)
    context_hash = Column(String, nullable=False)    # hash of context data only (for invalidation)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_ai_cache_lookup', 'block_type', 'tone', 'context_hash'),
    )

    def __repr__(self):
        return f"<AICache {self.block_type}:{self.tone}>"
