"""
Analytics Calculations

Core analytics functions for computing league statistics,
power rankings, luck analysis, and member personas.
"""

from typing import Dict, List, Any, Optional
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import func

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from models.league import Member, Team, Season
from models.matchup import Matchup
from models.chat import ChatMessage, ChatReaction, ChatStats, MemberPersona


def calculate_power_rankings(db: Session) -> List[Dict[str, Any]]:
    """
    Calculate all-time power rankings for all members.
    
    Power score is based on:
    - Win percentage (30%)
    - Championship rate (25%)
    - Playoff percentage (20%)
    - Points per game (15%)
    - Longevity (10%)
    """
    members = db.query(Member).all()
    rankings = []
    
    for member in members:
        if member.total_seasons == 0:
            continue
        
        total_games = member.total_wins + member.total_losses
        win_pct = member.total_wins / total_games if total_games > 0 else 0
        ppg = member.total_points_for / total_games if total_games > 0 else 0
        
        # Get playoff data
        teams = db.query(Team).filter(Team.member_id == member.id).all()
        playoff_appearances = sum(1 for t in teams if t.made_playoffs or t.playoff_seed)
        playoff_pct = playoff_appearances / member.total_seasons if member.total_seasons > 0 else 0
        
        # Calculate power score
        power_score = (
            win_pct * 30 +
            (member.total_championships / member.total_seasons) * 25 +
            playoff_pct * 20 +
            min(ppg / 150, 1) * 15 +
            min(member.total_seasons / 10, 1) * 10
        )
        
        rankings.append({
            "member_id": member.id,
            "member": member.name,
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
    
    return rankings


def calculate_luck_analysis(db: Session) -> List[Dict[str, Any]]:
    """
    Analyze luck factor for all members.
    
    Compares actual wins to expected wins based on where
    a team's score ranked each week.
    """
    members = db.query(Member).all()
    analysis = []
    
    for member in members:
        teams = db.query(Team).filter(Team.member_id == member.id).all()
        
        total_wins = 0
        total_losses = 0
        expected_wins = 0.0
        lucky_wins = 0
        unlucky_losses = 0
        
        for team in teams:
            total_wins += team.wins
            total_losses += team.losses
            
            # Get matchups for this team
            matchups = db.query(Matchup).filter(
                (Matchup.team1_id == team.id) | (Matchup.team2_id == team.id)
            ).all()
            
            for m in matchups:
                # Determine our score
                if m.team1_id == team.id:
                    our_score = m.team1_score
                    opp_score = m.team2_score
                else:
                    our_score = m.team2_score
                    opp_score = m.team1_score
                
                # Get all scores for this week
                week_matchups = db.query(Matchup).filter(
                    Matchup.season_id == m.season_id,
                    Matchup.week == m.week
                ).all()
                
                all_scores = []
                for wm in week_matchups:
                    all_scores.extend([wm.team1_score, wm.team2_score])
                
                if not all_scores:
                    continue
                
                # Calculate expected wins
                wins_expected = sum(1 for s in all_scores if our_score > s) / len(all_scores)
                expected_wins += wins_expected
                
                # Determine luck
                median_score = sorted(all_scores)[len(all_scores) // 2]
                we_won = our_score > opp_score
                above_median = our_score > median_score
                
                if we_won and not above_median:
                    lucky_wins += 1
                elif not we_won and above_median:
                    unlucky_losses += 1
        
        total_games = total_wins + total_losses
        if total_games == 0:
            continue
        
        luck_factor = total_wins - expected_wins
        
        analysis.append({
            "member_id": member.id,
            "member": member.name,
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
    
    analysis.sort(key=lambda x: -x["luck_factor"])
    return analysis


def calculate_h2h_matrix(db: Session) -> Dict[str, Any]:
    """
    Calculate head-to-head records for all member pairs.
    """
    members = db.query(Member).all()
    member_names = {m.id: m.name for m in members}
    member_ids = list(member_names.keys())
    
    # Initialize matrix
    matrix = {
        mid: {oid: {"wins": 0, "losses": 0, "ties": 0, "pf": 0, "pa": 0} 
              for oid in member_ids if oid != mid}
        for mid in member_ids
    }
    
    # Process all matchups
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
        
        # Update scores
        matrix[m1_id][m2_id]["pf"] += m.team1_score
        matrix[m1_id][m2_id]["pa"] += m.team2_score
        matrix[m2_id][m1_id]["pf"] += m.team2_score
        matrix[m2_id][m1_id]["pa"] += m.team1_score
        
        # Update record
        if m.team1_score > m.team2_score:
            matrix[m1_id][m2_id]["wins"] += 1
            matrix[m2_id][m1_id]["losses"] += 1
        elif m.team2_score > m.team1_score:
            matrix[m2_id][m1_id]["wins"] += 1
            matrix[m1_id][m2_id]["losses"] += 1
        else:
            matrix[m1_id][m2_id]["ties"] += 1
            matrix[m2_id][m1_id]["ties"] += 1
    
    # Format for output
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
                "points_for": round(record["pf"], 2),
                "points_against": round(record["pa"], 2),
            })
        result.append(row)
    
    return {
        "members": [member_names[mid] for mid in member_ids],
        "matrix": result
    }


def calculate_member_personas(db: Session) -> List[Dict[str, Any]]:
    """
    Calculate chat-based personas for members.
    """
    members = db.query(Member).all()
    
    # Get total counts for normalization
    total_messages = db.query(func.count(ChatMessage.id)).scalar() or 1
    total_reactions = db.query(func.count(ChatReaction.id)).scalar() or 1
    
    personas = []
    
    for member in members:
        msg_count = db.query(func.count(ChatMessage.id)).filter(
            ChatMessage.member_id == member.id
        ).scalar() or 0
        
        if msg_count == 0:
            continue
        
        word_count = db.query(func.sum(ChatMessage.word_count)).filter(
            ChatMessage.member_id == member.id
        ).scalar() or 0
        
        reactions_given = db.query(func.count(ChatReaction.id)).filter(
            ChatReaction.member_id == member.id
        ).scalar() or 0
        
        # Calculate traits
        msg_share = msg_count / total_messages
        reaction_share = reactions_given / total_reactions if total_reactions > 0 else 0
        avg_words = word_count / msg_count if msg_count > 0 else 0
        
        social = min(100, (msg_share * 500) + (reaction_share * 300))
        lurker = max(0, 100 - social)
        analytical = min(100, avg_words * 5)
        supportive = min(100, reaction_share * 500)
        
        # Determine primary persona
        traits = {
            "The Social Butterfly": social,
            "The Analyst": analytical,
            "The Lurker": lurker,
            "The Hype Man": supportive,
        }
        
        primary = max(traits.items(), key=lambda x: x[1])
        
        personas.append({
            "member_id": member.id,
            "member_name": member.name,
            "primary_persona": primary[0],
            "confidence": round(primary[1] / 100, 2),
            "traits": {
                "social": round(social, 1),
                "analytical": round(analytical, 1),
                "lurker": round(lurker, 1),
                "supportive": round(supportive, 1),
            },
            "stats": {
                "messages": msg_count,
                "words": word_count,
                "avg_words": round(avg_words, 1),
                "reactions_given": reactions_given,
            }
        })
    
    return personas


def calculate_all_time_records(db: Session) -> Dict[str, Any]:
    """
    Calculate all-time league records.
    """
    matchups = db.query(Matchup).filter(
        Matchup.team1_score > 0,
        Matchup.team2_score > 0
    ).all()
    
    records = {
        "highest_score": None,
        "lowest_score": None,
        "biggest_blowout": None,
        "closest_game": None,
        "highest_combined": None,
        "lowest_combined": None,
    }
    
    highest = {"score": 0}
    lowest = {"score": float("inf")}
    biggest_margin = {"margin": 0}
    closest = {"margin": float("inf")}
    highest_combined = {"total": 0}
    lowest_combined = {"total": float("inf")}
    
    for m in matchups:
        season_year = m.season.year if m.season else None
        
        # Check individual scores
        for team, score in [(m.team1, m.team1_score), (m.team2, m.team2_score)]:
            if team and score > highest["score"]:
                highest = {
                    "score": score,
                    "team": team.name,
                    "manager": team.member.name if team.member else "Unknown",
                    "season": season_year,
                    "week": m.week,
                }
            if team and 0 < score < lowest["score"]:
                lowest = {
                    "score": score,
                    "team": team.name,
                    "manager": team.member.name if team.member else "Unknown",
                    "season": season_year,
                    "week": m.week,
                }
        
        # Check margins
        margin = abs(m.team1_score - m.team2_score)
        winner = m.team1 if m.team1_score > m.team2_score else m.team2
        loser = m.team2 if m.team1_score > m.team2_score else m.team1
        
        if margin > biggest_margin["margin"]:
            biggest_margin = {
                "margin": round(margin, 2),
                "winner": winner.name if winner else "Unknown",
                "winner_score": max(m.team1_score, m.team2_score),
                "loser": loser.name if loser else "Unknown",
                "loser_score": min(m.team1_score, m.team2_score),
                "season": season_year,
                "week": m.week,
            }
        
        if 0 < margin < closest["margin"]:
            closest = {
                "margin": round(margin, 2),
                "winner": winner.name if winner else "Unknown",
                "winner_score": max(m.team1_score, m.team2_score),
                "loser": loser.name if loser else "Unknown",
                "loser_score": min(m.team1_score, m.team2_score),
                "season": season_year,
                "week": m.week,
            }
        
        # Check combined
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
    
    records["highest_score"] = highest if highest["score"] > 0 else None
    records["lowest_score"] = lowest if lowest["score"] < float("inf") else None
    records["biggest_blowout"] = biggest_margin if biggest_margin["margin"] > 0 else None
    records["closest_game"] = closest if closest["margin"] < float("inf") else None
    records["highest_combined"] = highest_combined if highest_combined["total"] > 0 else None
    records["lowest_combined"] = lowest_combined if lowest_combined["total"] < float("inf") else None
    
    return records
