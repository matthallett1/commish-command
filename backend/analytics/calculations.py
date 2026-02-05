"""
Analytics Calculations

Core analytics functions for computing league statistics,
power rankings, luck analysis, member personas, and draft analytics.
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
from models.draft import DraftPick, Transaction


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


# ─── Draft Analytics ────────────────────────────────────────────────────────

GRADE_VALUES = {"A+": 4.3, "A": 4.0, "B": 3.0, "C": 2.0, "D": 1.0, "F": 0.0}
GRADE_THRESHOLDS = [(4.3, "A+"), (3.5, "A"), (2.5, "B"), (1.5, "C"), (0.5, "D"), (0, "F")]


def _numeric_grade(letter: Optional[str]) -> float:
    """Convert a letter grade to a numeric value."""
    return GRADE_VALUES.get(letter, 2.0) if letter else 2.0


def _letter_grade(value: float) -> str:
    """Convert a numeric grade value back to a letter grade."""
    for threshold, letter in GRADE_THRESHOLDS:
        if value >= threshold:
            return letter
    return "F"


def calculate_draft_grades(db: Session, season_id: int) -> List[Dict[str, Any]]:
    """
    Calculate draft grades for all picks in a season.
    
    Grade is based on season points relative to draft position:
    - Compare each player's season points against others drafted nearby.
    - A player drafted late who scores a lot = high grade (steal).
    - A player drafted early who scores little = low grade (bust).
    
    Returns updated pick data with grades assigned.
    """
    picks = (
        db.query(DraftPick)
        .filter(DraftPick.season_id == season_id)
        .order_by(DraftPick.pick_number)
        .all()
    )
    
    if not picks:
        return []
    
    # Only grade picks that have season points
    scored = [p for p in picks if p.season_points is not None and p.season_points > 0]
    if not scored:
        return []
    
    # Calculate position-based rankings for grading
    position_groups: Dict[str, List[DraftPick]] = defaultdict(list)
    for p in scored:
        pos = (p.player_position or "FLEX").upper()
        # Normalize to broad position groups
        if pos in ("QB",):
            group = "QB"
        elif pos in ("RB",):
            group = "RB"
        elif pos in ("WR",):
            group = "WR"
        elif pos in ("TE",):
            group = "TE"
        else:
            group = "FLEX"
        position_groups[group].append(p)
    
    # Rank within each position group by season points
    for group, group_picks in position_groups.items():
        group_picks.sort(key=lambda p: -(p.season_points or 0))
        for rank, p in enumerate(group_picks, 1):
            p.season_rank = rank
    
    # Calculate value & grade
    for p in scored:
        if p.adp and p.adp > 0:
            p.value_over_adp = p.adp - p.pick_number  # Positive = picked later than ADP (value)
        
        # Grade based on season rank vs pick position
        p.calculate_grade()
    
    db.commit()
    
    return [
        {
            "pick_number": p.pick_number,
            "player_name": p.player_name,
            "player_position": p.player_position,
            "season_points": p.season_points,
            "season_rank": p.season_rank,
            "adp": p.adp,
            "value_over_adp": p.value_over_adp,
            "grade": p.grade,
        }
        for p in scored
    ]


def calculate_draft_report_cards(db: Session, season_id: int) -> List[Dict[str, Any]]:
    """
    Calculate overall draft report cards per team for a season.
    Aggregates individual pick grades into team-level grades.
    """
    picks = (
        db.query(DraftPick)
        .filter(DraftPick.season_id == season_id)
        .all()
    )
    
    team_picks: Dict[int, List[DraftPick]] = defaultdict(list)
    for p in picks:
        if p.team_id:
            team_picks[p.team_id].append(p)
    
    report_cards = []
    for team_id, tpicks in team_picks.items():
        team = db.query(Team).get(team_id)
        if not team:
            continue
        member = team.member
        
        graded = [p for p in tpicks if p.grade]
        if graded:
            avg_val = sum(_numeric_grade(p.grade) for p in graded) / len(graded)
            overall = _letter_grade(avg_val)
        else:
            avg_val = None
            overall = None
        
        total_pts = sum(p.season_points or 0 for p in tpicks)
        steals = [p for p in tpicks if p.grade in ("A+", "A")]
        busts = [p for p in tpicks if p.grade in ("D", "F")]
        
        report_cards.append({
            "team_id": team_id,
            "team_name": team.name,
            "manager": member.name if member else "Unknown",
            "member_id": member.id if member else None,
            "overall_grade": overall,
            "avg_grade_value": round(avg_val, 2) if avg_val is not None else None,
            "total_picks": len(tpicks),
            "graded_picks": len(graded),
            "total_season_points": round(total_pts, 1),
            "steals": len(steals),
            "busts": len(busts),
        })
    
    report_cards.sort(key=lambda x: x.get("avg_grade_value") or 0, reverse=True)
    return report_cards


def calculate_member_draft_tendencies(db: Session, member_id: int) -> Dict[str, Any]:
    """
    Analyze a member's drafting tendencies across all seasons.
    """
    member = db.query(Member).get(member_id)
    if not member:
        return {}
    
    teams = db.query(Team).filter(Team.member_id == member_id).all()
    team_ids = [t.id for t in teams]
    
    picks = (
        db.query(DraftPick)
        .filter(DraftPick.team_id.in_(team_ids))
        .all()
    )
    
    if not picks:
        return {"member_id": member_id, "member_name": member.name, "total_picks": 0}
    
    # Position preferences
    pos_counts: Dict[str, int] = defaultdict(int)
    pos_points: Dict[str, float] = defaultdict(float)
    for p in picks:
        pos = p.player_position or "Unknown"
        pos_counts[pos] += 1
        pos_points[pos] += p.season_points or 0
    
    # Round 1 history
    round_1 = [
        {
            "season": p.season.year if p.season else None,
            "player_name": p.player_name,
            "player_position": p.player_position,
            "season_points": p.season_points,
            "grade": p.grade,
        }
        for p in picks if p.round == 1
    ]
    
    # Average grade
    graded = [p for p in picks if p.grade]
    avg_grade = _letter_grade(
        sum(_numeric_grade(p.grade) for p in graded) / len(graded)
    ) if graded else None
    
    favorite_pos = max(pos_counts, key=pos_counts.get) if pos_counts else None
    
    return {
        "member_id": member_id,
        "member_name": member.name,
        "total_picks": len(picks),
        "seasons_drafted": len(set(p.season.year for p in picks if p.season)),
        "position_breakdown": {
            pos: {
                "count": count,
                "percentage": round(count / len(picks) * 100, 1),
                "avg_points": round(pos_points[pos] / count, 1) if count else 0,
            }
            for pos, count in sorted(pos_counts.items(), key=lambda x: -x[1])
        },
        "round_1_history": round_1,
        "avg_grade": avg_grade,
        "favorite_position": favorite_pos,
    }


def calculate_waiver_impact(db: Session, season_id: int) -> List[Dict[str, Any]]:
    """
    Calculate the impact of waiver wire / free agent pickups for a season.
    
    Shows which teams were most active and most successful on waivers.
    """
    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.season_id == season_id,
            Transaction.type.in_(["add", "waiver"]),
        )
        .all()
    )
    
    team_stats: Dict[int, Dict[str, Any]] = defaultdict(
        lambda: {"adds": 0, "total_points": 0.0, "best_pickup": None, "best_points": 0}
    )
    
    for tx in transactions:
        tid = tx.team_id
        team_stats[tid]["adds"] += 1
        team_stats[tid]["total_points"] += tx.points_scored or 0
        
        if (tx.points_scored or 0) > team_stats[tid]["best_points"]:
            team_stats[tid]["best_points"] = tx.points_scored or 0
            team_stats[tid]["best_pickup"] = tx.player_name
    
    results = []
    for tid, stats in team_stats.items():
        team = db.query(Team).get(tid)
        if not team:
            continue
        member = team.member
        
        results.append({
            "team_id": tid,
            "team_name": team.name,
            "manager": member.name if member else "Unknown",
            "member_id": member.id if member else None,
            "total_adds": stats["adds"],
            "total_waiver_points": round(stats["total_points"], 1),
            "avg_points_per_add": round(stats["total_points"] / stats["adds"], 1) if stats["adds"] else 0,
            "best_pickup": stats["best_pickup"],
            "best_pickup_points": round(stats["best_points"], 1),
        })
    
    results.sort(key=lambda x: -x["total_waiver_points"])
    return results


def calculate_league_draft_overview(db: Session) -> Dict[str, Any]:
    """
    High-level overview of drafting across all seasons.
    Used for the drafts landing page.
    """
    seasons = db.query(Season).order_by(Season.year.desc()).all()
    
    overview = {
        "seasons": [],
        "all_time_best_drafter": None,
        "all_time_worst_drafter": None,
        "most_active_trader": None,
    }
    
    member_grades: Dict[int, List[float]] = defaultdict(list)
    member_tx_counts: Dict[int, int] = defaultdict(int)
    
    for season in seasons:
        picks = db.query(DraftPick).filter(DraftPick.season_id == season.id).all()
        txns = db.query(Transaction).filter(Transaction.season_id == season.id).count()
        
        graded = [p for p in picks if p.grade]
        avg_grade = None
        if graded:
            avg_val = sum(_numeric_grade(p.grade) for p in graded) / len(graded)
            avg_grade = _letter_grade(avg_val)
            
            # Track per-member grades
            team_grades: Dict[int, List[float]] = defaultdict(list)
            for p in graded:
                if p.team and p.team.member:
                    team_grades[p.team.member_id].append(_numeric_grade(p.grade))
            
            for mid, grades in team_grades.items():
                member_grades[mid].extend(grades)
        
        # Track transactions per member
        member_txns = (
            db.query(Transaction.team_id, func.count(Transaction.id))
            .filter(Transaction.season_id == season.id)
            .group_by(Transaction.team_id)
            .all()
        )
        for tid, count in member_txns:
            team = db.query(Team).get(tid)
            if team and team.member:
                member_tx_counts[team.member_id] += count
        
        overview["seasons"].append({
            "year": season.year,
            "total_picks": len(picks),
            "graded_picks": len(graded),
            "avg_grade": avg_grade,
            "total_transactions": txns,
        })
    
    # All-time best/worst drafter
    if member_grades:
        best_mid = max(member_grades, key=lambda mid: sum(member_grades[mid]) / len(member_grades[mid]))
        worst_mid = min(member_grades, key=lambda mid: sum(member_grades[mid]) / len(member_grades[mid]))
        
        best_member = db.query(Member).get(best_mid)
        worst_member = db.query(Member).get(worst_mid)
        
        if best_member:
            avg = sum(member_grades[best_mid]) / len(member_grades[best_mid])
            overview["all_time_best_drafter"] = {
                "member_id": best_mid,
                "member_name": best_member.name,
                "avg_grade": _letter_grade(avg),
                "total_graded_picks": len(member_grades[best_mid]),
            }
        
        if worst_member:
            avg = sum(member_grades[worst_mid]) / len(member_grades[worst_mid])
            overview["all_time_worst_drafter"] = {
                "member_id": worst_mid,
                "member_name": worst_member.name,
                "avg_grade": _letter_grade(avg),
                "total_graded_picks": len(member_grades[worst_mid]),
            }
    
    # Most active trader
    if member_tx_counts:
        most_active_mid = max(member_tx_counts, key=member_tx_counts.get)
        most_active_member = db.query(Member).get(most_active_mid)
        if most_active_member:
            overview["most_active_trader"] = {
                "member_id": most_active_mid,
                "member_name": most_active_member.name,
                "total_transactions": member_tx_counts[most_active_mid],
            }
    
    return overview
