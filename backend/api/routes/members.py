"""Member API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
import math

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from models.database import get_db
from models.league import Member, Team, Season
from models.matchup import Matchup

router = APIRouter()


# ---------------------------------------------------------------------------
# Achievement badge definitions
# ---------------------------------------------------------------------------

def _calculate_achievements(member: Member, teams: list, all_matchups_for_member: list, total_seasons_in_league: int) -> list:
    """Calculate achievement badges for a member based on their data."""
    badges = []
    
    total_games = member.total_wins + member.total_losses
    
    # Dynasty Builder: 2+ championships
    if member.total_championships >= 2:
        badges.append({
            "id": "dynasty_builder",
            "label": "Dynasty Builder",
            "description": f"{member.total_championships} championships — a true dynasty",
        })
    
    # One-Hit Wonder: Exactly 1 championship
    if member.total_championships == 1:
        badges.append({
            "id": "one_hit_wonder",
            "label": "One-Hit Wonder",
            "description": "One ring to rule them all",
        })
    
    # Bridesmaid: 3+ runner-up (final_rank == 2), no championships
    runner_ups = sum(1 for t in teams if t.final_rank == 2)
    if runner_ups >= 3 and member.total_championships == 0:
        badges.append({
            "id": "bridesmaid",
            "label": "Always a Bridesmaid",
            "description": f"Finished 2nd place {runner_ups} times without a title",
        })
    
    # Ironman: Played every season
    if member.total_seasons >= total_seasons_in_league and total_seasons_in_league > 0:
        badges.append({
            "id": "ironman",
            "label": "Ironman",
            "description": f"Played all {total_seasons_in_league} seasons — day-one member",
        })
    
    # Boom or Bust: Highest variance in weekly scores (std dev > 25 across matchups)
    if all_matchups_for_member:
        scores = []
        member_team_ids = {t.id for t in teams}
        for m in all_matchups_for_member:
            if m.team1_id in member_team_ids and m.team1_score and m.team1_score > 0:
                scores.append(m.team1_score)
            elif m.team2_id in member_team_ids and m.team2_score and m.team2_score > 0:
                scores.append(m.team2_score)
        if len(scores) >= 10:
            mean = sum(scores) / len(scores)
            variance = sum((x - mean) ** 2 for x in scores) / len(scores)
            std_dev = math.sqrt(variance)
            if std_dev > 25:
                badges.append({
                    "id": "boom_or_bust",
                    "label": "Boom or Bust",
                    "description": f"Weekly scores swing wildly (std dev: {std_dev:.1f})",
                })
    
    # Closer: Most wins by under 5 points
    if all_matchups_for_member:
        close_wins = 0
        member_team_ids = {t.id for t in teams}
        for m in all_matchups_for_member:
            if m.team1_id in member_team_ids:
                our, opp = m.team1_score or 0, m.team2_score or 0
            else:
                our, opp = m.team2_score or 0, m.team1_score or 0
            if our > opp and (our - opp) < 5:
                close_wins += 1
        if close_wins >= 8:
            badges.append({
                "id": "closer",
                "label": "The Closer",
                "description": f"{close_wins} wins by less than 5 points — ice in their veins",
            })
    
    # Lucky Charm: Win percentage > 55% with fewer than average points
    win_pct = (member.total_wins / total_games * 100) if total_games > 0 else 0
    if win_pct > 55 and member.total_seasons >= 3:
        badges.append({
            "id": "lucky_charm",
            "label": "Lucky Charm",
            "description": f"{win_pct:.1f}% win rate — fortune favors this manager",
        })
    
    return badges


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


@router.get("/{member_id}/notable-events")
async def get_member_notable_events(member_id: int, db: Session = Depends(get_db)):
    """Get notable events/achievements for a member."""
    member = db.query(Member).filter(Member.id == member_id).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Get all teams for this member
    member_teams = db.query(Team).filter(Team.member_id == member_id).all()
    member_team_ids = [t.id for t in member_teams]
    
    # Get all matchups involving this member
    matchups = db.query(Matchup).filter(
        (Matchup.team1_id.in_(member_team_ids)) | (Matchup.team2_id.in_(member_team_ids))
    ).all()
    
    # Initialize trackers
    highest_score = None
    lowest_score = None
    biggest_win = None
    closest_win = None
    worst_loss = None
    championship_years = []
    
    for matchup in matchups:
        season_year = matchup.season.year if matchup.season else None
        
        # Determine which side is ours
        if matchup.team1_id in member_team_ids:
            our_score = matchup.team1_score
            our_team = matchup.team1
            opp_score = matchup.team2_score
            opp_team = matchup.team2
        else:
            our_score = matchup.team2_score
            our_team = matchup.team2
            opp_score = matchup.team1_score
            opp_team = matchup.team1
        
        if not opp_team:
            continue
        
        opp_name = opp_team.member.name if opp_team.member else "Unknown"
        
        # Track highest score
        if our_score > 0:
            if highest_score is None or our_score > highest_score["score"]:
                highest_score = {
                    "score": round(our_score, 2),
                    "opponent": opp_name,
                    "opponent_score": round(opp_score, 2),
                    "year": season_year,
                    "week": matchup.week,
                    "won": our_score > opp_score,
                }
        
        # Track lowest score
        if our_score > 0:
            if lowest_score is None or our_score < lowest_score["score"]:
                lowest_score = {
                    "score": round(our_score, 2),
                    "opponent": opp_name,
                    "opponent_score": round(opp_score, 2),
                    "year": season_year,
                    "week": matchup.week,
                    "won": our_score > opp_score,
                }
        
        # Track wins
        if our_score > opp_score:
            margin = our_score - opp_score
            
            # Biggest win
            if biggest_win is None or margin > biggest_win["margin"]:
                biggest_win = {
                    "margin": round(margin, 2),
                    "score": round(our_score, 2),
                    "opponent": opp_name,
                    "opponent_score": round(opp_score, 2),
                    "year": season_year,
                    "week": matchup.week,
                }
            
            # Closest win
            if closest_win is None or margin < closest_win["margin"]:
                closest_win = {
                    "margin": round(margin, 2),
                    "score": round(our_score, 2),
                    "opponent": opp_name,
                    "opponent_score": round(opp_score, 2),
                    "year": season_year,
                    "week": matchup.week,
                }
        
        # Track losses for worst loss
        elif opp_score > our_score:
            margin = opp_score - our_score
            if worst_loss is None or margin > worst_loss["margin"]:
                worst_loss = {
                    "margin": round(margin, 2),
                    "score": round(our_score, 2),
                    "opponent": opp_name,
                    "opponent_score": round(opp_score, 2),
                    "year": season_year,
                    "week": matchup.week,
                }
    
    # Get championship years
    for team in member_teams:
        if team.is_champion and team.season:
            championship_years.append({
                "year": team.season.year,
                "team_name": team.name,
                "record": f"{team.wins}-{team.losses}",
            })
    
    championship_years.sort(key=lambda x: x["year"], reverse=True)
    
    return {
        "member": member.name,
        "member_id": member.id,
        "highest_score": highest_score,
        "lowest_score": lowest_score,
        "biggest_win": biggest_win,
        "closest_win": closest_win,
        "worst_loss": worst_loss,
        "championship_years": championship_years,
    }


# ---------------------------------------------------------------------------
# Achievement endpoints
# ---------------------------------------------------------------------------

@router.get("/{member_id}/achievements")
async def get_member_achievements(member_id: int, db: Session = Depends(get_db)):
    """Get achievement badges for a member."""
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    teams = db.query(Team).filter(Team.member_id == member_id).all()
    team_ids = [t.id for t in teams]
    matchups = db.query(Matchup).filter(
        (Matchup.team1_id.in_(team_ids)) | (Matchup.team2_id.in_(team_ids))
    ).all()
    
    total_seasons = db.query(func.count(func.distinct(Season.id))).scalar() or 0
    badges = _calculate_achievements(member, teams, matchups, total_seasons)
    
    return {"member": member.name, "achievements": badges}


@router.get("/achievements", response_model=None)
async def get_all_achievements(db: Session = Depends(get_db)):
    """Get achievement badges for all members."""
    members = db.query(Member).all()
    total_seasons = db.query(func.count(func.distinct(Season.id))).scalar() or 0
    
    results = []
    for member in members:
        teams = db.query(Team).filter(Team.member_id == member.id).all()
        team_ids = [t.id for t in teams]
        matchups = db.query(Matchup).filter(
            (Matchup.team1_id.in_(team_ids)) | (Matchup.team2_id.in_(team_ids))
        ).all()
        badges = _calculate_achievements(member, teams, matchups, total_seasons)
        if badges:
            results.append({
                "member_id": member.id,
                "member": member.name,
                "achievements": badges,
            })
    
    return {"members": results}
