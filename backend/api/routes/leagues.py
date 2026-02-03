"""League and Season API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from models.database import get_db
from models.league import League, Season, Team

router = APIRouter()


# Pydantic models for API responses
class TeamResponse(BaseModel):
    id: int
    name: str
    member_name: str
    wins: int
    losses: int
    ties: int
    points_for: float
    points_against: float
    final_rank: Optional[int]
    is_champion: bool
    playoff_seed: Optional[int]
    
    class Config:
        from_attributes = True


class SeasonResponse(BaseModel):
    id: int
    year: int
    num_teams: int
    champion_name: Optional[str]
    champion_member: Optional[str]
    
    class Config:
        from_attributes = True


class SeasonDetailResponse(BaseModel):
    id: int
    year: int
    num_teams: int
    regular_season_weeks: int
    playoff_weeks: int
    teams: List[TeamResponse]
    
    class Config:
        from_attributes = True


class LeagueResponse(BaseModel):
    id: int
    name: str
    total_seasons: int
    seasons: List[SeasonResponse]
    
    class Config:
        from_attributes = True


@router.get("", response_model=LeagueResponse)
async def get_league(db: Session = Depends(get_db)):
    """Get the main league with all seasons."""
    league = db.query(League).first()
    
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    
    seasons = db.query(Season).filter(Season.league_id == league.id).order_by(Season.year.desc()).all()
    
    season_responses = []
    for season in seasons:
        champion = db.query(Team).filter(
            Team.season_id == season.id,
            Team.is_champion == True
        ).first()
        
        season_responses.append(SeasonResponse(
            id=season.id,
            year=season.year,
            num_teams=season.num_teams,
            champion_name=champion.name if champion else None,
            champion_member=champion.member.name if champion and champion.member else None,
        ))
    
    return LeagueResponse(
        id=league.id,
        name=league.name,
        total_seasons=len(seasons),
        seasons=season_responses,
    )


@router.get("/seasons", response_model=List[SeasonResponse])
async def get_seasons(db: Session = Depends(get_db)):
    """Get all seasons."""
    seasons = db.query(Season).order_by(Season.year.desc()).all()
    
    responses = []
    for season in seasons:
        champion = db.query(Team).filter(
            Team.season_id == season.id,
            Team.is_champion == True
        ).first()
        
        responses.append(SeasonResponse(
            id=season.id,
            year=season.year,
            num_teams=season.num_teams,
            champion_name=champion.name if champion else None,
            champion_member=champion.member.name if champion and champion.member else None,
        ))
    
    return responses


@router.get("/seasons/{year}", response_model=SeasonDetailResponse)
async def get_season(year: int, db: Session = Depends(get_db)):
    """Get a specific season with standings."""
    season = db.query(Season).filter(Season.year == year).first()
    
    if not season:
        raise HTTPException(status_code=404, detail=f"Season {year} not found")
    
    teams = db.query(Team).filter(Team.season_id == season.id).order_by(Team.final_rank).all()
    
    team_responses = [
        TeamResponse(
            id=team.id,
            name=team.name,
            member_name=team.member.name if team.member else "Unknown",
            wins=team.wins,
            losses=team.losses,
            ties=team.ties,
            points_for=team.points_for,
            points_against=team.points_against,
            final_rank=team.final_rank,
            is_champion=team.is_champion,
            playoff_seed=team.playoff_seed,
        )
        for team in teams
    ]
    
    return SeasonDetailResponse(
        id=season.id,
        year=season.year,
        num_teams=season.num_teams,
        regular_season_weeks=season.regular_season_weeks,
        playoff_weeks=season.playoff_weeks,
        teams=team_responses,
    )


@router.get("/standings/{year}")
async def get_standings(year: int, db: Session = Depends(get_db)):
    """Get standings for a specific season."""
    season = db.query(Season).filter(Season.year == year).first()
    
    if not season:
        raise HTTPException(status_code=404, detail=f"Season {year} not found")
    
    teams = db.query(Team).filter(Team.season_id == season.id).order_by(Team.final_rank).all()
    
    return {
        "season": year,
        "standings": [
            {
                "rank": team.final_rank or idx + 1,
                "team_name": team.name,
                "manager": team.member.name if team.member else "Unknown",
                "record": f"{team.wins}-{team.losses}" + (f"-{team.ties}" if team.ties else ""),
                "points_for": round(team.points_for, 2),
                "points_against": round(team.points_against, 2),
                "is_champion": team.is_champion,
                "made_playoffs": team.made_playoffs,
            }
            for idx, team in enumerate(teams)
        ]
    }


@router.get("/champions")
async def get_champions(db: Session = Depends(get_db)):
    """Get all league champions by year."""
    champions = db.query(Team).filter(Team.is_champion == True).all()
    
    # Group by member
    member_championships = {}
    yearly_champions = []
    
    for champion in champions:
        member_name = champion.member.name if champion.member else "Unknown"
        
        yearly_champions.append({
            "year": champion.season.year if champion.season else None,
            "team_name": champion.name,
            "manager": member_name,
            "record": f"{champion.wins}-{champion.losses}",
            "points_for": round(champion.points_for, 2),
        })
        
        member_championships[member_name] = member_championships.get(member_name, 0) + 1
    
    # Sort by year
    yearly_champions.sort(key=lambda x: x["year"] or 0, reverse=True)
    
    # Sort by championships
    championship_leaders = sorted(
        member_championships.items(),
        key=lambda x: x[1],
        reverse=True
    )
    
    return {
        "yearly_champions": yearly_champions,
        "championship_leaders": [
            {"member": name, "championships": count}
            for name, count in championship_leaders
        ]
    }
