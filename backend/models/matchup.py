"""Matchup and Standing models."""

from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base


class Matchup(Base):
    """
    A single matchup between two teams in a given week.
    """
    __tablename__ = "matchups"
    
    id = Column(Integer, primary_key=True, index=True)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    week = Column(Integer, nullable=False)
    
    # Teams
    team1_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    team2_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    
    # Scores
    team1_score = Column(Float, default=0)
    team2_score = Column(Float, default=0)
    
    # Winner
    winner_id = Column(Integer, ForeignKey("teams.id"), nullable=True)  # Null if tie
    
    # Matchup type
    is_playoff = Column(Boolean, default=False)
    is_championship = Column(Boolean, default=False)
    is_consolation = Column(Boolean, default=False)
    playoff_round = Column(String, nullable=True)  # 'quarterfinal', 'semifinal', 'final'
    
    # Calculated fields
    point_differential = Column(Float, default=0)  # Absolute difference
    is_close_game = Column(Boolean, default=False)  # Within 10 points
    is_blowout = Column(Boolean, default=False)  # 50+ point difference
    
    # Relationships
    season = relationship("Season", back_populates="matchups")
    team1 = relationship("Team", foreign_keys=[team1_id], back_populates="home_matchups")
    team2 = relationship("Team", foreign_keys=[team2_id], back_populates="away_matchups")
    winner = relationship("Team", foreign_keys=[winner_id])
    
    __table_args__ = (
        UniqueConstraint('season_id', 'week', 'team1_id', 'team2_id', name='uix_matchup'),
    )
    
    def __repr__(self):
        return f"<Matchup Week {self.week}: {self.team1_score:.1f} vs {self.team2_score:.1f}>"
    
    def calculate_fields(self):
        """Calculate derived fields."""
        self.point_differential = abs(self.team1_score - self.team2_score)
        self.is_close_game = self.point_differential < 10
        self.is_blowout = self.point_differential >= 50
        
        if self.team1_score > self.team2_score:
            self.winner_id = self.team1_id
        elif self.team2_score > self.team1_score:
            self.winner_id = self.team2_id
        else:
            self.winner_id = None  # Tie


class Standing(Base):
    """
    A team's standing at a point in time (usually end of season).
    """
    __tablename__ = "standings"
    
    id = Column(Integer, primary_key=True, index=True)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    week = Column(Integer, nullable=True)  # Null = final standings
    
    # Ranking
    rank = Column(Integer, nullable=False)
    
    # Record at this point
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    ties = Column(Integer, default=0)
    
    # Points at this point
    points_for = Column(Float, default=0)
    points_against = Column(Float, default=0)
    
    # Streak info
    streak_type = Column(String, nullable=True)  # 'W' or 'L'
    streak_length = Column(Integer, default=0)
    
    # Playoff status
    clinched_playoff = Column(Boolean, default=False)
    clinched_bye = Column(Boolean, default=False)
    eliminated = Column(Boolean, default=False)
    
    # Relationships
    season = relationship("Season", back_populates="standings")
    team = relationship("Team", back_populates="standings")
    
    __table_args__ = (
        UniqueConstraint('season_id', 'team_id', 'week', name='uix_standing'),
    )
    
    def __repr__(self):
        week_str = f"Week {self.week}" if self.week else "Final"
        return f"<Standing #{self.rank} {week_str}>"
    
    @property
    def record(self) -> str:
        """Return W-L-T record string."""
        if self.ties:
            return f"{self.wins}-{self.losses}-{self.ties}"
        return f"{self.wins}-{self.losses}"
    
    @property
    def win_percentage(self) -> float:
        """Calculate win percentage."""
        total = self.wins + self.losses + self.ties
        if total == 0:
            return 0.0
        return (self.wins + (self.ties * 0.5)) / total
