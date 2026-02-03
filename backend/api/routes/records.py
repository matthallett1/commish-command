"""Records and Analytics API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from collections import defaultdict

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from models.database import get_db
from models.league import Member, Team, Season
from models.matchup import Matchup

router = APIRouter()


@router.get("/all-time")
async def get_all_time_records(db: Session = Depends(get_db)):
    """Get all-time league records."""
    matchups = db.query(Matchup).filter(
        Matchup.team1_score > 0,
        Matchup.team2_score > 0
    ).all()
    
    # Initialize record trackers
    records = {
        "highest_score": None,
        "lowest_score": None,
        "biggest_blowout": None,
        "closest_game": None,
        "highest_combined": None,
        "lowest_combined": None,
        "longest_win_streak": None,
        "longest_losing_streak": None,
    }
    
    highest_score = {"score": 0}
    lowest_score = {"score": float("inf")}
    biggest_margin = {"margin": 0}
    closest_game = {"margin": float("inf")}
    highest_combined = {"total": 0}
    lowest_combined = {"total": float("inf")}
    
    for m in matchups:
        season_year = m.season.year if m.season else None
        
        # Individual scores
        for team, score in [(m.team1, m.team1_score), (m.team2, m.team2_score)]:
            if team and score > highest_score["score"]:
                highest_score = {
                    "score": score,
                    "team": team.name,
                    "manager": team.member.name if team.member else "Unknown",
                    "season": season_year,
                    "week": m.week,
                }
            if team and 0 < score < lowest_score["score"]:
                lowest_score = {
                    "score": score,
                    "team": team.name,
                    "manager": team.member.name if team.member else "Unknown",
                    "season": season_year,
                    "week": m.week,
                }
        
        # Margins
        margin = abs(m.team1_score - m.team2_score)
        if margin > biggest_margin["margin"]:
            winner = m.team1 if m.team1_score > m.team2_score else m.team2
            loser = m.team2 if m.team1_score > m.team2_score else m.team1
            biggest_margin = {
                "margin": round(margin, 2),
                "winner": winner.name if winner else "Unknown",
                "winner_score": max(m.team1_score, m.team2_score),
                "loser": loser.name if loser else "Unknown",
                "loser_score": min(m.team1_score, m.team2_score),
                "season": season_year,
                "week": m.week,
            }
        
        if 0 < margin < closest_game["margin"]:
            winner = m.team1 if m.team1_score > m.team2_score else m.team2
            loser = m.team2 if m.team1_score > m.team2_score else m.team1
            closest_game = {
                "margin": round(margin, 2),
                "winner": winner.name if winner else "Unknown",
                "winner_score": max(m.team1_score, m.team2_score),
                "loser": loser.name if loser else "Unknown",
                "loser_score": min(m.team1_score, m.team2_score),
                "season": season_year,
                "week": m.week,
            }
        
        # Combined scores
        total = m.team1_score + m.team2_score
        if total > highest_combined["total"]:
            highest_combined = {
                "total": round(total, 2),
                "team1": m.team1.name if m.team1 else "Unknown",
                "team1_score": m.team1_score,
                "team2": m.team2.name if m.team2 else "Unknown",
                "team2_score": m.team2_score,
                "season": season_year,
                "week": m.week,
            }
        if 0 < total < lowest_combined["total"]:
            lowest_combined = {
                "total": round(total, 2),
                "team1": m.team1.name if m.team1 else "Unknown",
                "team1_score": m.team1_score,
                "team2": m.team2.name if m.team2 else "Unknown",
                "team2_score": m.team2_score,
                "season": season_year,
                "week": m.week,
            }
    
    records["highest_score"] = highest_score if highest_score["score"] > 0 else None
    records["lowest_score"] = lowest_score if lowest_score["score"] < float("inf") else None
    records["biggest_blowout"] = biggest_margin if biggest_margin["margin"] > 0 else None
    records["closest_game"] = closest_game if closest_game["margin"] < float("inf") else None
    records["highest_combined"] = highest_combined if highest_combined["total"] > 0 else None
    records["lowest_combined"] = lowest_combined if lowest_combined["total"] < float("inf") else None
    
    return records


@router.get("/h2h-matrix")
async def get_h2h_matrix(db: Session = Depends(get_db)):
    """Get head-to-head matrix for all members."""
    members = db.query(Member).all()
    
    # Build member ID to name mapping
    member_names = {m.id: m.name for m in members}
    member_ids = list(member_names.keys())
    
    # Initialize matrix
    matrix = {
        mid: {oid: {"wins": 0, "losses": 0, "ties": 0} for oid in member_ids if oid != mid}
        for mid in member_ids
    }
    
    # Get all matchups
    matchups = db.query(Matchup).all()
    
    for m in matchups:
        if not m.team1 or not m.team2:
            continue
        if not m.team1.member or not m.team2.member:
            continue
        
        m1_id = m.team1.member.id
        m2_id = m.team2.member.id
        
        if m1_id == m2_id:
            continue
        
        if m.team1_score > m.team2_score:
            matrix[m1_id][m2_id]["wins"] += 1
            matrix[m2_id][m1_id]["losses"] += 1
        elif m.team2_score > m.team1_score:
            matrix[m2_id][m1_id]["wins"] += 1
            matrix[m1_id][m2_id]["losses"] += 1
        else:
            matrix[m1_id][m2_id]["ties"] += 1
            matrix[m2_id][m1_id]["ties"] += 1
    
    # Convert to response format
    result = []
    for mid in member_ids:
        row = {
            "member_id": mid,
            "member_name": member_names[mid],
            "opponents": []
        }
        for oid in member_ids:
            if oid == mid:
                continue
            record = matrix[mid][oid]
            total = record["wins"] + record["losses"] + record["ties"]
            row["opponents"].append({
                "opponent_id": oid,
                "opponent_name": member_names[oid],
                "wins": record["wins"],
                "losses": record["losses"],
                "ties": record["ties"],
                "total_games": total,
                "win_pct": round(record["wins"] / total * 100, 1) if total > 0 else 0,
            })
        result.append(row)
    
    return {
        "members": [member_names[mid] for mid in member_ids],
        "matrix": result
    }


@router.get("/luck-analysis")
async def get_luck_analysis(db: Session = Depends(get_db)):
    """
    Analyze luck factor - comparing actual wins to expected wins
    based on points scored vs league average.
    """
    members = db.query(Member).all()
    luck_analysis = []
    
    for member in members:
        teams = db.query(Team).filter(Team.member_id == member.id).all()
        
        total_wins = 0
        total_losses = 0
        expected_wins = 0
        lucky_wins = 0  # Won with below-average score
        unlucky_losses = 0  # Lost with above-average score
        
        for team in teams:
            total_wins += team.wins
            total_losses += team.losses
            
            # Get all matchups for this team
            matchups = db.query(Matchup).filter(
                (Matchup.team1_id == team.id) | (Matchup.team2_id == team.id)
            ).all()
            
            for m in matchups:
                if m.team1_id == team.id:
                    our_score = m.team1_score
                    opp_score = m.team2_score
                else:
                    our_score = m.team2_score
                    opp_score = m.team1_score
                
                # Get all scores for this week to calculate median
                week_matchups = db.query(Matchup).filter(
                    Matchup.season_id == m.season_id,
                    Matchup.week == m.week
                ).all()
                
                all_scores = []
                for wm in week_matchups:
                    all_scores.extend([wm.team1_score, wm.team2_score])
                
                if not all_scores:
                    continue
                
                median_score = sorted(all_scores)[len(all_scores) // 2]
                
                # Determine if lucky/unlucky
                we_won = our_score > opp_score
                above_median = our_score > median_score
                
                if we_won and not above_median:
                    lucky_wins += 1
                elif not we_won and above_median:
                    unlucky_losses += 1
                
                # Expected wins based on where score ranks
                wins_expected = sum(1 for s in all_scores if our_score > s) / len(all_scores)
                expected_wins += wins_expected
        
        total_games = total_wins + total_losses
        if total_games == 0:
            continue
        
        luck_factor = total_wins - expected_wins
        
        luck_analysis.append({
            "member": member.name,
            "member_id": member.id,
            "actual_wins": total_wins,
            "actual_losses": total_losses,
            "expected_wins": round(expected_wins, 1),
            "luck_factor": round(luck_factor, 1),
            "lucky_wins": lucky_wins,
            "unlucky_losses": unlucky_losses,
            "luck_rating": (
                "Very Lucky" if luck_factor > 5 else
                "Lucky" if luck_factor > 2 else
                "Neutral" if luck_factor > -2 else
                "Unlucky" if luck_factor > -5 else
                "Very Unlucky"
            )
        })
    
    # Sort by luck factor
    luck_analysis.sort(key=lambda x: -x["luck_factor"])
    
    return {
        "title": "Luck Analysis",
        "description": "Compares actual wins to expected wins based on weekly scoring",
        "analysis": luck_analysis
    }


@router.get("/power-rankings")
async def get_power_rankings(db: Session = Depends(get_db)):
    """Calculate all-time power rankings based on multiple factors."""
    members = db.query(Member).all()
    
    rankings = []
    for member in members:
        if member.total_seasons == 0:
            continue
        
        total_games = member.total_wins + member.total_losses
        win_pct = member.total_wins / total_games if total_games > 0 else 0
        ppg = member.total_points_for / total_games if total_games > 0 else 0
        
        # Get playoff appearances and championships
        teams = db.query(Team).filter(Team.member_id == member.id).all()
        playoff_appearances = sum(1 for t in teams if t.made_playoffs or t.playoff_seed)
        playoff_pct = playoff_appearances / member.total_seasons if member.total_seasons > 0 else 0
        
        # Calculate power score (weighted combination)
        power_score = (
            win_pct * 30 +  # 30% weight on win percentage
            (member.total_championships / member.total_seasons) * 25 +  # 25% on championship rate
            playoff_pct * 20 +  # 20% on playoff percentage
            min(ppg / 150, 1) * 15 +  # 15% on points (normalized)
            min(member.total_seasons / 10, 1) * 10  # 10% on longevity
        )
        
        rankings.append({
            "rank": 0,
            "member": member.name,
            "member_id": member.id,
            "power_score": round(power_score, 1),
            "seasons": member.total_seasons,
            "championships": member.total_championships,
            "win_percentage": round(win_pct * 100, 1),
            "playoff_percentage": round(playoff_pct * 100, 1),
            "ppg": round(ppg, 1),
        })
    
    # Sort and assign ranks
    rankings.sort(key=lambda x: -x["power_score"])
    for i, r in enumerate(rankings):
        r["rank"] = i + 1
    
    return {
        "title": "All-Time Power Rankings",
        "rankings": rankings
    }


@router.get("/season/{year}")
async def get_season_records(year: int, db: Session = Depends(get_db)):
    """Get notable records/events for a specific season."""
    season = db.query(Season).filter(Season.year == year).first()
    
    if not season:
        raise HTTPException(status_code=404, detail=f"Season {year} not found")
    
    # Get all matchups for this season
    matchups = db.query(Matchup).filter(
        Matchup.season_id == season.id,
        Matchup.team1_score > 0,
        Matchup.team2_score > 0
    ).all()
    
    if not matchups:
        return {
            "season": year,
            "highest_score": None,
            "lowest_score": None,
            "biggest_blowout": None,
            "closest_game": None,
            "most_points_team": None,
            "regular_season_leader": None,
            "champion": None,
        }
    
    # Track records
    highest_score = None
    lowest_score = None
    biggest_blowout = None
    closest_game = None
    
    for m in matchups:
        # Track individual scores
        for team, score in [(m.team1, m.team1_score), (m.team2, m.team2_score)]:
            if team and score > 0:
                manager_name = team.member.name if team.member else "Unknown"
                member_id = team.member.id if team.member else None
                
                if highest_score is None or score > highest_score["score"]:
                    highest_score = {
                        "score": round(score, 2),
                        "team": team.name,
                        "manager": manager_name,
                        "member_id": member_id,
                        "week": m.week,
                        "is_playoff": m.is_playoff,
                    }
                
                if lowest_score is None or score < lowest_score["score"]:
                    lowest_score = {
                        "score": round(score, 2),
                        "team": team.name,
                        "manager": manager_name,
                        "member_id": member_id,
                        "week": m.week,
                        "is_playoff": m.is_playoff,
                    }
        
        # Track margins
        margin = abs(m.team1_score - m.team2_score)
        winner = m.team1 if m.team1_score > m.team2_score else m.team2
        loser = m.team2 if m.team1_score > m.team2_score else m.team1
        
        if winner and loser:
            winner_name = winner.member.name if winner.member else "Unknown"
            winner_member_id = winner.member.id if winner.member else None
            loser_name = loser.member.name if loser.member else "Unknown"
            loser_member_id = loser.member.id if loser.member else None
            
            if biggest_blowout is None or margin > biggest_blowout["margin"]:
                biggest_blowout = {
                    "margin": round(margin, 2),
                    "winner": winner_name,
                    "winner_member_id": winner_member_id,
                    "winner_score": round(max(m.team1_score, m.team2_score), 2),
                    "loser": loser_name,
                    "loser_member_id": loser_member_id,
                    "loser_score": round(min(m.team1_score, m.team2_score), 2),
                    "week": m.week,
                    "is_playoff": m.is_playoff,
                }
            
            if closest_game is None or margin < closest_game["margin"]:
                closest_game = {
                    "margin": round(margin, 2),
                    "winner": winner_name,
                    "winner_member_id": winner_member_id,
                    "winner_score": round(max(m.team1_score, m.team2_score), 2),
                    "loser": loser_name,
                    "loser_member_id": loser_member_id,
                    "loser_score": round(min(m.team1_score, m.team2_score), 2),
                    "week": m.week,
                    "is_playoff": m.is_playoff,
                }
    
    # Get team with most total points
    teams = db.query(Team).filter(Team.season_id == season.id).all()
    most_points_team = None
    regular_season_leader = None
    champion = None
    
    for team in teams:
        manager_name = team.member.name if team.member else "Unknown"
        member_id = team.member.id if team.member else None
        
        if most_points_team is None or team.points_for > most_points_team["points"]:
            most_points_team = {
                "points": round(team.points_for, 2),
                "team": team.name,
                "manager": manager_name,
                "member_id": member_id,
                "record": f"{team.wins}-{team.losses}",
            }
        
        if team.final_rank == 1:
            regular_season_leader = {
                "team": team.name,
                "manager": manager_name,
                "member_id": member_id,
                "record": f"{team.wins}-{team.losses}",
                "points": round(team.points_for, 2),
            }
        
        if team.is_champion:
            champion = {
                "team": team.name,
                "manager": manager_name,
                "member_id": member_id,
                "record": f"{team.wins}-{team.losses}",
            }
    
    return {
        "season": year,
        "highest_score": highest_score,
        "lowest_score": lowest_score,
        "biggest_blowout": biggest_blowout,
        "closest_game": closest_game,
        "most_points_team": most_points_team,
        "regular_season_leader": regular_season_leader,
        "champion": champion,
    }
