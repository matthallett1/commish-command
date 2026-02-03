"""Member API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from models.database import get_db
from models.league import Member, Team, Season
from models.matchup import Matchup
from models.chat import ChatMessage, ChatStats

router = APIRouter()


class MemberSummary(BaseModel):
    id: int
    name: str
    total_seasons: int
    total_championships: int
    total_wins: int
    total_losses: int
    win_percentage: float
    total_points_for: float
    
    class Config:
        from_attributes = True


class SeasonRecord(BaseModel):
    year: int
    team_name: str
    record: str
    points_for: float
    final_rank: int
    is_champion: bool


class MemberProfile(BaseModel):
    id: int
    name: str
    total_seasons: int
    total_championships: int
    total_wins: int
    total_losses: int
    win_percentage: float
    total_points_for: float
    avg_points_per_season: float
    best_finish: int
    worst_finish: int
    seasons: List[SeasonRecord]
    
    class Config:
        from_attributes = True


@router.get("", response_model=List[MemberSummary])
async def get_members(db: Session = Depends(get_db)):
    """Get all members with summary stats."""
    members = db.query(Member).all()
    
    summaries = []
    for member in members:
        total_games = member.total_wins + member.total_losses
        win_pct = (member.total_wins / total_games * 100) if total_games > 0 else 0
        
        summaries.append(MemberSummary(
            id=member.id,
            name=member.name,
            total_seasons=member.total_seasons,
            total_championships=member.total_championships,
            total_wins=member.total_wins,
            total_losses=member.total_losses,
            win_percentage=round(win_pct, 1),
            total_points_for=round(member.total_points_for, 2),
        ))
    
    # Sort by championships, then win percentage
    summaries.sort(key=lambda x: (-x.total_championships, -x.win_percentage))
    
    return summaries


@router.get("/{member_id}", response_model=MemberProfile)
async def get_member(member_id: int, db: Session = Depends(get_db)):
    """Get detailed member profile."""
    member = db.query(Member).filter(Member.id == member_id).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    teams = db.query(Team).filter(Team.member_id == member_id).all()
    
    total_games = member.total_wins + member.total_losses
    win_pct = (member.total_wins / total_games * 100) if total_games > 0 else 0
    avg_points = (member.total_points_for / member.total_seasons) if member.total_seasons > 0 else 0
    
    ranks = [t.final_rank for t in teams if t.final_rank]
    best_finish = min(ranks) if ranks else 0
    worst_finish = max(ranks) if ranks else 0
    
    seasons = [
        SeasonRecord(
            year=team.season.year if team.season else 0,
            team_name=team.name,
            record=f"{team.wins}-{team.losses}" + (f"-{team.ties}" if team.ties else ""),
            points_for=round(team.points_for, 2),
            final_rank=team.final_rank or 0,
            is_champion=team.is_champion,
        )
        for team in teams
    ]
    seasons.sort(key=lambda x: x.year, reverse=True)
    
    return MemberProfile(
        id=member.id,
        name=member.name,
        total_seasons=member.total_seasons,
        total_championships=member.total_championships,
        total_wins=member.total_wins,
        total_losses=member.total_losses,
        win_percentage=round(win_pct, 1),
        total_points_for=round(member.total_points_for, 2),
        avg_points_per_season=round(avg_points, 2),
        best_finish=best_finish,
        worst_finish=worst_finish,
        seasons=seasons,
    )


@router.get("/{member_id}/head-to-head")
async def get_member_h2h(member_id: int, db: Session = Depends(get_db)):
    """Get head-to-head records against all other members."""
    member = db.query(Member).filter(Member.id == member_id).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Get all teams for this member
    member_teams = db.query(Team).filter(Team.member_id == member_id).all()
    member_team_ids = [t.id for t in member_teams]
    
    # Get all matchups involving this member's teams
    matchups = db.query(Matchup).filter(
        (Matchup.team1_id.in_(member_team_ids)) | (Matchup.team2_id.in_(member_team_ids))
    ).all()
    
    # Calculate H2H records
    h2h_records = {}  # opponent_member_id -> {wins, losses, ties}
    
    for matchup in matchups:
        # Determine which team is ours and which is opponent
        if matchup.team1_id in member_team_ids:
            our_team = matchup.team1
            opp_team = matchup.team2
            our_score = matchup.team1_score
            opp_score = matchup.team2_score
        else:
            our_team = matchup.team2
            opp_team = matchup.team1
            our_score = matchup.team2_score
            opp_score = matchup.team1_score
        
        if not opp_team or not opp_team.member:
            continue
        
        opp_member_id = opp_team.member.id
        
        if opp_member_id not in h2h_records:
            h2h_records[opp_member_id] = {
                "member_id": opp_member_id,
                "member_name": opp_team.member.name,
                "wins": 0,
                "losses": 0,
                "ties": 0,
                "points_for": 0,
                "points_against": 0,
            }
        
        h2h_records[opp_member_id]["points_for"] += our_score
        h2h_records[opp_member_id]["points_against"] += opp_score
        
        if our_score > opp_score:
            h2h_records[opp_member_id]["wins"] += 1
        elif opp_score > our_score:
            h2h_records[opp_member_id]["losses"] += 1
        else:
            h2h_records[opp_member_id]["ties"] += 1
    
    # Convert to list and add win percentage
    h2h_list = []
    for record in h2h_records.values():
        total = record["wins"] + record["losses"] + record["ties"]
        record["total_games"] = total
        record["win_percentage"] = round((record["wins"] / total * 100) if total > 0 else 0, 1)
        record["points_for"] = round(record["points_for"], 2)
        record["points_against"] = round(record["points_against"], 2)
        h2h_list.append(record)
    
    # Sort by win percentage
    h2h_list.sort(key=lambda x: -x["win_percentage"])
    
    return {
        "member": member.name,
        "head_to_head": h2h_list
    }


@router.get("/{member_id}/rivalries")
async def get_member_rivalries(member_id: int, db: Session = Depends(get_db)):
    """Get rivalry analysis for a member."""
    h2h_data = await get_member_h2h(member_id, db)
    h2h_records = h2h_data["head_to_head"]
    
    # Identify rivalries based on criteria
    rivalries = []
    
    for record in h2h_records:
        if record["total_games"] < 3:
            continue
        
        # Calculate rivalry score
        games = record["total_games"]
        competitiveness = 1 - abs(record["wins"] - record["losses"]) / games
        frequency = min(games / 10, 1)  # Normalize to max 10 games
        
        rivalry_score = (competitiveness * 0.6 + frequency * 0.4) * 100
        
        if rivalry_score > 30:  # Threshold for being considered a rivalry
            rivalries.append({
                **record,
                "rivalry_score": round(rivalry_score, 1),
                "classification": (
                    "Heated Rivalry" if rivalry_score > 70 else
                    "Competitive" if rivalry_score > 50 else
                    "Developing"
                )
            })
    
    rivalries.sort(key=lambda x: -x["rivalry_score"])
    
    return {
        "member": h2h_data["member"],
        "rivalries": rivalries[:5]  # Top 5 rivals
    }
