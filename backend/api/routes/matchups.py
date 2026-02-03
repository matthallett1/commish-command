"""Matchup API routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from pydantic import BaseModel

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from models.database import get_db
from models.league import Season, Team
from models.matchup import Matchup

router = APIRouter()


class MatchupResponse(BaseModel):
    id: int
    week: int
    team1_name: str
    team1_manager: str
    team1_score: float
    team2_name: str
    team2_manager: str
    team2_score: float
    winner_name: Optional[str]
    is_playoff: bool
    is_championship: bool
    point_differential: float
    
    class Config:
        from_attributes = True


@router.get("/season/{year}")
async def get_season_matchups(
    year: int,
    week: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get matchups for a season, optionally filtered by week."""
    season = db.query(Season).filter(Season.year == year).first()
    
    if not season:
        raise HTTPException(status_code=404, detail=f"Season {year} not found")
    
    query = db.query(Matchup).filter(Matchup.season_id == season.id)
    
    if week:
        query = query.filter(Matchup.week == week)
    
    matchups = query.order_by(Matchup.week, Matchup.id).all()
    
    result = []
    for m in matchups:
        winner = m.winner
        result.append(MatchupResponse(
            id=m.id,
            week=m.week,
            team1_name=m.team1.name if m.team1 else "Unknown",
            team1_manager=m.team1.member.name if m.team1 and m.team1.member else "Unknown",
            team1_score=m.team1_score,
            team2_name=m.team2.name if m.team2 else "Unknown",
            team2_manager=m.team2.member.name if m.team2 and m.team2.member else "Unknown",
            team2_score=m.team2_score,
            winner_name=winner.member.name if winner and winner.member else None,
            is_playoff=m.is_playoff,
            is_championship=m.is_championship,
            point_differential=m.point_differential or abs(m.team1_score - m.team2_score),
        ))
    
    return {
        "season": year,
        "week": week,
        "matchups": result
    }


@router.get("/week/{year}/{week}")
async def get_week_matchups(year: int, week: int, db: Session = Depends(get_db)):
    """Get all matchups for a specific week."""
    return await get_season_matchups(year, week, db)


@router.get("/playoffs/{year}")
async def get_playoff_matchups(year: int, db: Session = Depends(get_db)):
    """Get playoff matchups for a season."""
    season = db.query(Season).filter(Season.year == year).first()
    
    if not season:
        raise HTTPException(status_code=404, detail=f"Season {year} not found")
    
    matchups = db.query(Matchup).filter(
        Matchup.season_id == season.id,
        Matchup.is_playoff == True
    ).order_by(Matchup.week, Matchup.id).all()
    
    # Group by week/round
    rounds = {}
    for m in matchups:
        week = m.week
        if week not in rounds:
            rounds[week] = []
        
        rounds[week].append({
            "team1_name": m.team1.name if m.team1 else "Unknown",
            "team1_manager": m.team1.member.name if m.team1 and m.team1.member else "Unknown",
            "team1_score": m.team1_score,
            "team2_name": m.team2.name if m.team2 else "Unknown",
            "team2_manager": m.team2.member.name if m.team2 and m.team2.member else "Unknown",
            "team2_score": m.team2_score,
            "winner_manager": m.winner.member.name if m.winner and m.winner.member else None,
            "is_championship": m.is_championship,
        })
    
    return {
        "season": year,
        "playoff_rounds": rounds
    }


@router.get("/close-games")
async def get_close_games(
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db)
):
    """Get the closest games in league history."""
    matchups = db.query(Matchup).filter(
        Matchup.team1_score > 0,
        Matchup.team2_score > 0
    ).all()
    
    # Calculate and sort by point differential
    games = []
    for m in matchups:
        diff = abs(m.team1_score - m.team2_score)
        games.append({
            "season": m.season.year if m.season else None,
            "week": m.week,
            "team1_name": m.team1.name if m.team1 else "Unknown",
            "team1_manager": m.team1.member.name if m.team1 and m.team1.member else "Unknown",
            "team1_score": m.team1_score,
            "team2_name": m.team2.name if m.team2 else "Unknown",
            "team2_manager": m.team2.member.name if m.team2 and m.team2.member else "Unknown",
            "team2_score": m.team2_score,
            "point_differential": round(diff, 2),
            "is_playoff": m.is_playoff,
        })
    
    games.sort(key=lambda x: x["point_differential"])
    
    return {
        "title": "Closest Games in League History",
        "games": games[:limit]
    }


@router.get("/blowouts")
async def get_blowouts(
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db)
):
    """Get the biggest blowouts in league history."""
    matchups = db.query(Matchup).filter(
        Matchup.team1_score > 0,
        Matchup.team2_score > 0
    ).all()
    
    games = []
    for m in matchups:
        diff = abs(m.team1_score - m.team2_score)
        winner = m.team1 if m.team1_score > m.team2_score else m.team2
        loser = m.team2 if m.team1_score > m.team2_score else m.team1
        winner_score = max(m.team1_score, m.team2_score)
        loser_score = min(m.team1_score, m.team2_score)
        
        games.append({
            "season": m.season.year if m.season else None,
            "week": m.week,
            "winner_name": winner.name if winner else "Unknown",
            "winner_manager": winner.member.name if winner and winner.member else "Unknown",
            "winner_score": winner_score,
            "loser_name": loser.name if loser else "Unknown",
            "loser_manager": loser.member.name if loser and loser.member else "Unknown",
            "loser_score": loser_score,
            "margin": round(diff, 2),
            "is_playoff": m.is_playoff,
        })
    
    games.sort(key=lambda x: -x["margin"])
    
    return {
        "title": "Biggest Blowouts in League History",
        "games": games[:limit]
    }


@router.get("/highest-scores")
async def get_highest_scores(
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db)
):
    """Get the highest individual weekly scores."""
    matchups = db.query(Matchup).all()
    
    scores = []
    for m in matchups:
        # Add team 1
        scores.append({
            "season": m.season.year if m.season else None,
            "week": m.week,
            "team_name": m.team1.name if m.team1 else "Unknown",
            "manager": m.team1.member.name if m.team1 and m.team1.member else "Unknown",
            "score": m.team1_score,
            "won": m.winner_id == m.team1_id if m.winner_id else False,
            "is_playoff": m.is_playoff,
        })
        # Add team 2
        scores.append({
            "season": m.season.year if m.season else None,
            "week": m.week,
            "team_name": m.team2.name if m.team2 else "Unknown",
            "manager": m.team2.member.name if m.team2 and m.team2.member else "Unknown",
            "score": m.team2_score,
            "won": m.winner_id == m.team2_id if m.winner_id else False,
            "is_playoff": m.is_playoff,
        })
    
    scores.sort(key=lambda x: -x["score"])
    
    return {
        "title": "Highest Weekly Scores",
        "scores": scores[:limit]
    }


@router.get("/lowest-scores")
async def get_lowest_scores(
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db)
):
    """Get the lowest individual weekly scores."""
    matchups = db.query(Matchup).filter(
        Matchup.team1_score > 0,
        Matchup.team2_score > 0
    ).all()
    
    scores = []
    for m in matchups:
        scores.append({
            "season": m.season.year if m.season else None,
            "week": m.week,
            "team_name": m.team1.name if m.team1 else "Unknown",
            "manager": m.team1.member.name if m.team1 and m.team1.member else "Unknown",
            "score": m.team1_score,
            "won": m.winner_id == m.team1_id if m.winner_id else False,
        })
        scores.append({
            "season": m.season.year if m.season else None,
            "week": m.week,
            "team_name": m.team2.name if m.team2 else "Unknown",
            "manager": m.team2.member.name if m.team2 and m.team2.member else "Unknown",
            "score": m.team2_score,
            "won": m.winner_id == m.team2_id if m.winner_id else False,
        })
    
    scores.sort(key=lambda x: x["score"])
    
    return {
        "title": "Lowest Weekly Scores",
        "scores": scores[:limit]
    }
