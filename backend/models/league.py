"""League, Season, Team, and Member models."""

from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base


class Member(Base):
    """
    A league member (person) who can manage teams across multiple seasons.
    This allows tracking the same person across different team names/seasons.
    """
    __tablename__ = "members"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  # Canonical name
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)  # For iMessage matching
    yahoo_id = Column(String, nullable=True)  # Yahoo manager ID
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    teams = relationship("Team", back_populates="member")
    
    # Computed stats (denormalized for performance)
    total_championships = Column(Integer, default=0)
    total_seasons = Column(Integer, default=0)
    total_wins = Column(Integer, default=0)
    total_losses = Column(Integer, default=0)
    total_points_for = Column(Float, default=0)
    
    def __repr__(self):
        return f"<Member {self.name}>"


class League(Base):
    """
    The overall league entity (Top Pot Fantasy Football League).
    A league has multiple seasons.
    """
    __tablename__ = "leagues"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    yahoo_league_key = Column(String, nullable=True)  # Yahoo's league identifier
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    seasons = relationship("Season", back_populates="league")
    
    def __repr__(self):
        return f"<League {self.name}>"


class Season(Base):
    """
    A single season of the league.
    """
    __tablename__ = "seasons"
    
    id = Column(Integer, primary_key=True, index=True)
    league_id = Column(Integer, ForeignKey("leagues.id"), nullable=False)
    year = Column(Integer, nullable=False)
    yahoo_league_id = Column(String, nullable=True)  # Full Yahoo league ID (e.g., "390.l.123456")
    
    # Season configuration
    num_teams = Column(Integer, default=12)
    num_playoff_teams = Column(Integer, default=6)
    regular_season_weeks = Column(Integer, default=14)
    playoff_weeks = Column(Integer, default=3)
    
    # Important dates
    draft_date = Column(DateTime, nullable=True)
    season_start = Column(DateTime, nullable=True)
    season_end = Column(DateTime, nullable=True)
    
    # Champion
    champion_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    
    # Relationships
    league = relationship("League", back_populates="seasons")
    teams = relationship("Team", back_populates="season", foreign_keys="Team.season_id")
    matchups = relationship("Matchup", back_populates="season")
    standings = relationship("Standing", back_populates="season")
    draft_picks = relationship("DraftPick", back_populates="season")
    transactions = relationship("Transaction", back_populates="season")
    
    __table_args__ = (
        UniqueConstraint('league_id', 'year', name='uix_league_year'),
    )
    
    def __repr__(self):
        return f"<Season {self.year}>"


class Team(Base):
    """
    A team in a specific season, managed by a member.
    """
    __tablename__ = "teams"
    
    id = Column(Integer, primary_key=True, index=True)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False)
    
    # Team info
    name = Column(String, nullable=False)  # Team name can vary by season
    yahoo_team_key = Column(String, nullable=True)  # Yahoo's team identifier
    logo_url = Column(String, nullable=True)
    
    # Regular season record
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    ties = Column(Integer, default=0)
    points_for = Column(Float, default=0)
    points_against = Column(Float, default=0)
    
    # Playoff info
    playoff_seed = Column(Integer, nullable=True)
    made_playoffs = Column(Boolean, default=False)
    final_rank = Column(Integer, nullable=True)  # Final standing in season
    is_champion = Column(Boolean, default=False)
    
    # Relationships
    season = relationship("Season", back_populates="teams", foreign_keys=[season_id])
    member = relationship("Member", back_populates="teams")
    home_matchups = relationship("Matchup", foreign_keys="Matchup.team1_id", back_populates="team1")
    away_matchups = relationship("Matchup", foreign_keys="Matchup.team2_id", back_populates="team2")
    standings = relationship("Standing", back_populates="team")
    draft_picks = relationship("DraftPick", back_populates="team")
    transactions = relationship("Transaction", back_populates="team", foreign_keys="Transaction.team_id")
    
    __table_args__ = (
        UniqueConstraint('season_id', 'yahoo_team_key', name='uix_season_yahoo_team'),
    )
    
    def __repr__(self):
        return f"<Team {self.name} ({self.season.year if self.season else 'N/A'})>"
    
    @property
    def record(self) -> str:
        """Return W-L-T record string."""
        if self.ties:
            return f"{self.wins}-{self.losses}-{self.ties}"
        return f"{self.wins}-{self.losses}"
