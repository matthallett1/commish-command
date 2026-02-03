"""Draft and Transaction models."""

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base


class DraftPick(Base):
    """
    A single draft pick in a season's draft.
    """
    __tablename__ = "draft_picks"
    
    id = Column(Integer, primary_key=True, index=True)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    
    # Pick info
    round = Column(Integer, nullable=False)
    pick_number = Column(Integer, nullable=False)  # Overall pick number
    pick_in_round = Column(Integer, nullable=True)  # Pick within the round
    
    # Player info
    player_id = Column(String, nullable=True)  # Yahoo player ID
    player_name = Column(String, nullable=False)
    player_position = Column(String, nullable=True)  # QB, RB, WR, TE, K, DEF
    player_team = Column(String, nullable=True)  # NFL team
    
    # Value analysis (optional, filled in post-season)
    adp = Column(Float, nullable=True)  # Average Draft Position
    value_over_adp = Column(Float, nullable=True)  # Pick - ADP (negative = reached)
    season_points = Column(Float, nullable=True)  # Total points scored
    season_rank = Column(Integer, nullable=True)  # Position rank for season
    grade = Column(String, nullable=True)  # A+, A, B, C, D, F
    
    # Relationships
    season = relationship("Season", back_populates="draft_picks")
    team = relationship("Team", back_populates="draft_picks")
    
    def __repr__(self):
        return f"<DraftPick #{self.pick_number}: {self.player_name}>"
    
    def calculate_grade(self):
        """Calculate draft pick grade based on value over ADP."""
        if self.value_over_adp is None or self.season_rank is None:
            self.grade = None
            return
        
        # Simple grading based on position rank vs pick position
        expected_rank = self.pick_number
        actual_rank = self.season_rank
        
        diff = expected_rank - actual_rank  # Positive = outperformed
        
        if diff >= 50:
            self.grade = "A+"
        elif diff >= 30:
            self.grade = "A"
        elif diff >= 10:
            self.grade = "B"
        elif diff >= -10:
            self.grade = "C"
        elif diff >= -30:
            self.grade = "D"
        else:
            self.grade = "F"


class Transaction(Base):
    """
    A waiver claim, free agent add, drop, or trade.
    """
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    
    # Transaction info
    type = Column(String, nullable=False)  # 'add', 'drop', 'trade', 'waiver'
    timestamp = Column(DateTime, default=datetime.utcnow)
    week = Column(Integer, nullable=True)
    
    # Player info
    player_id = Column(String, nullable=True)
    player_name = Column(String, nullable=False)
    player_position = Column(String, nullable=True)
    
    # For trades
    trade_partner_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    trade_details = Column(Text, nullable=True)  # JSON of full trade
    
    # For waivers
    waiver_priority = Column(Integer, nullable=True)
    faab_bid = Column(Float, nullable=True)  # If using FAAB
    
    # Outcome tracking
    games_played = Column(Integer, default=0)  # Games played for this team
    points_scored = Column(Float, default=0)  # Points scored for this team
    
    def __repr__(self):
        return f"<Transaction {self.type}: {self.player_name}>"
