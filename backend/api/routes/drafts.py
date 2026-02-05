"""Draft and Transaction API routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
from collections import defaultdict

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from models.database import get_db
from models.league import Member, Team, Season
from models.draft import DraftPick, Transaction

router = APIRouter()


# ─── Draft Endpoints ───────────────────────────────────────────────────────

@router.get("/board/{year}")
async def get_draft_board(year: int, db: Session = Depends(get_db)):
    """
    Get the full draft board for a given season.
    Returns picks organized by round with team/player info.
    """
    season = db.query(Season).filter(Season.year == year).first()
    if not season:
        raise HTTPException(status_code=404, detail=f"Season {year} not found")

    picks = (
        db.query(DraftPick)
        .filter(DraftPick.season_id == season.id)
        .order_by(DraftPick.pick_number)
        .all()
    )

    rounds: Dict[int, list] = defaultdict(list)
    for p in picks:
        team = p.team
        member = team.member if team else None
        rounds[p.round].append({
            "pick_number": p.pick_number,
            "round": p.round,
            "pick_in_round": p.pick_in_round,
            "player_name": p.player_name,
            "player_position": p.player_position,
            "player_team": p.player_team,
            "player_id": p.player_id,
            "team_name": team.name if team else "Unknown",
            "manager": member.name if member else "Unknown",
            "member_id": member.id if member else None,
            "adp": p.adp,
            "value_over_adp": p.value_over_adp,
            "season_points": p.season_points,
            "season_rank": p.season_rank,
            "grade": p.grade,
        })

    return {
        "season": year,
        "total_picks": len(picks),
        "rounds": dict(rounds),
    }


@router.get("/report-card/{year}")
async def get_draft_report_card(
    year: int,
    db: Session = Depends(get_db),
):
    """
    Get draft report cards for each team in a season.
    Grades each team's overall draft based on their picks' performance.
    """
    season = db.query(Season).filter(Season.year == year).first()
    if not season:
        raise HTTPException(status_code=404, detail=f"Season {year} not found")

    picks = (
        db.query(DraftPick)
        .filter(DraftPick.season_id == season.id)
        .order_by(DraftPick.pick_number)
        .all()
    )

    # Group picks by team
    team_picks: Dict[int, list] = defaultdict(list)
    for p in picks:
        if p.team_id:
            team_picks[p.team_id].append(p)

    grade_values = {"A+": 4.3, "A": 4.0, "B": 3.0, "C": 2.0, "D": 1.0, "F": 0.0}
    value_to_grade = [(4.3, "A+"), (3.5, "A"), (2.5, "B"), (1.5, "C"), (0.5, "D"), (0, "F")]

    report_cards = []
    for team_id, tpicks in team_picks.items():
        team = db.query(Team).get(team_id)
        if not team:
            continue
        member = team.member

        graded = [p for p in tpicks if p.grade]
        if graded:
            avg_grade_val = sum(grade_values.get(p.grade, 2.0) for p in graded) / len(graded)
            overall_grade = "C"
            for threshold, letter in value_to_grade:
                if avg_grade_val >= threshold:
                    overall_grade = letter
                    break
        else:
            overall_grade = None
            avg_grade_val = None

        total_season_pts = sum(p.season_points or 0 for p in tpicks)
        steals = [p for p in tpicks if p.grade in ("A+", "A")]
        busts = [p for p in tpicks if p.grade in ("D", "F")]

        pick_details = []
        for p in tpicks:
            pick_details.append({
                "pick_number": p.pick_number,
                "round": p.round,
                "player_name": p.player_name,
                "player_position": p.player_position,
                "adp": p.adp,
                "value_over_adp": p.value_over_adp,
                "season_points": p.season_points,
                "season_rank": p.season_rank,
                "grade": p.grade,
            })

        report_cards.append({
            "team_id": team_id,
            "team_name": team.name,
            "manager": member.name if member else "Unknown",
            "member_id": member.id if member else None,
            "overall_grade": overall_grade,
            "avg_grade_value": round(avg_grade_val, 2) if avg_grade_val else None,
            "total_picks": len(tpicks),
            "graded_picks": len(graded),
            "total_season_points": round(total_season_pts, 1),
            "steals_count": len(steals),
            "busts_count": len(busts),
            "best_pick": max(tpicks, key=lambda p: p.season_points or 0).player_name if tpicks else None,
            "picks": pick_details,
        })

    # Sort by overall grade
    report_cards.sort(key=lambda x: x.get("avg_grade_value") or 0, reverse=True)

    return {
        "season": year,
        "report_cards": report_cards,
    }


@router.get("/steals-busts/{year}")
async def get_steals_and_busts(
    year: int,
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """
    Get the biggest steals and busts from a draft.
    Steals: players picked later than their ADP who outperformed.
    Busts: players picked earlier than their ADP who underperformed.
    """
    season = db.query(Season).filter(Season.year == year).first()
    if not season:
        raise HTTPException(status_code=404, detail=f"Season {year} not found")

    picks = (
        db.query(DraftPick)
        .filter(DraftPick.season_id == season.id)
        .all()
    )

    def pick_to_dict(p: DraftPick) -> dict:
        team = p.team
        member = team.member if team else None
        return {
            "pick_number": p.pick_number,
            "round": p.round,
            "player_name": p.player_name,
            "player_position": p.player_position,
            "team_name": team.name if team else "Unknown",
            "manager": member.name if member else "Unknown",
            "member_id": member.id if member else None,
            "adp": p.adp,
            "value_over_adp": p.value_over_adp,
            "season_points": p.season_points,
            "season_rank": p.season_rank,
            "grade": p.grade,
        }

    # Steals: best value_over_adp (positive = picked after ADP, outperformed)
    graded = [p for p in picks if p.value_over_adp is not None and p.season_points is not None]

    steals = sorted(graded, key=lambda p: -(p.season_points or 0) / max(p.pick_number, 1))[:limit]
    busts = sorted(
        [p for p in graded if p.season_points is not None],
        key=lambda p: (p.season_points or 0) / max(p.pick_number, 1),
    )[:limit]

    # Fallback: if no graded data, just use season_points relative to pick order
    if not steals and picks:
        with_pts = [p for p in picks if p.season_points and p.season_points > 0]
        steals = sorted(with_pts, key=lambda p: -(p.season_points or 0) / max(p.pick_number, 1))[:limit]
        busts = sorted(with_pts, key=lambda p: (p.season_points or 0) / max(p.pick_number, 1))[:limit]

    return {
        "season": year,
        "steals": [pick_to_dict(p) for p in steals],
        "busts": [pick_to_dict(p) for p in busts],
    }


@router.get("/tendencies/{member_id}")
async def get_draft_tendencies(
    member_id: int,
    db: Session = Depends(get_db),
):
    """
    Analyze a member's draft tendencies across all seasons.
    Shows position preferences, average draft position patterns, etc.
    """
    member = db.query(Member).get(member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    teams = db.query(Team).filter(Team.member_id == member_id).all()
    team_ids = [t.id for t in teams]

    picks = (
        db.query(DraftPick)
        .filter(DraftPick.team_id.in_(team_ids))
        .order_by(DraftPick.pick_number)
        .all()
    )

    if not picks:
        return {
            "member_id": member_id,
            "member_name": member.name,
            "total_picks": 0,
            "seasons_drafted": 0,
            "position_breakdown": {},
            "round_1_history": [],
            "avg_grade": None,
            "favorite_position": None,
        }

    # Position breakdown
    position_counts: Dict[str, int] = defaultdict(int)
    position_points: Dict[str, float] = defaultdict(float)
    for p in picks:
        pos = p.player_position or "Unknown"
        position_counts[pos] += 1
        position_points[pos] += p.season_points or 0

    position_breakdown = {}
    for pos, count in sorted(position_counts.items(), key=lambda x: -x[1]):
        position_breakdown[pos] = {
            "count": count,
            "percentage": round(count / len(picks) * 100, 1),
            "avg_points": round(position_points[pos] / count, 1) if count > 0 else 0,
        }

    # Round 1 history
    round_1_picks = []
    for p in picks:
        if p.round == 1:
            season = p.season
            round_1_picks.append({
                "season": season.year if season else None,
                "pick_number": p.pick_number,
                "player_name": p.player_name,
                "player_position": p.player_position,
                "season_points": p.season_points,
                "grade": p.grade,
            })

    # Average grade
    grade_values = {"A+": 4.3, "A": 4.0, "B": 3.0, "C": 2.0, "D": 1.0, "F": 0.0}
    graded = [p for p in picks if p.grade]
    avg_grade = None
    if graded:
        avg_val = sum(grade_values.get(p.grade, 2.0) for p in graded) / len(graded)
        for threshold, letter in [(4.3, "A+"), (3.5, "A"), (2.5, "B"), (1.5, "C"), (0.5, "D"), (0, "F")]:
            if avg_val >= threshold:
                avg_grade = letter
                break

    # Favorite position (most drafted)
    favorite_pos = max(position_counts, key=position_counts.get) if position_counts else None

    # Seasons drafted
    seasons = set()
    for p in picks:
        if p.season:
            seasons.add(p.season.year)

    return {
        "member_id": member_id,
        "member_name": member.name,
        "total_picks": len(picks),
        "seasons_drafted": len(seasons),
        "position_breakdown": position_breakdown,
        "round_1_history": round_1_picks,
        "avg_grade": avg_grade,
        "favorite_position": favorite_pos,
    }


@router.get("/seasons")
async def get_available_draft_seasons(db: Session = Depends(get_db)):
    """Get list of seasons that have draft data."""
    seasons_with_drafts = (
        db.query(Season)
        .join(DraftPick, DraftPick.season_id == Season.id)
        .distinct()
        .order_by(Season.year.desc())
        .all()
    )

    return {
        "seasons": [
            {
                "year": s.year,
                "num_picks": db.query(DraftPick).filter(DraftPick.season_id == s.id).count(),
                "num_teams": s.num_teams,
            }
            for s in seasons_with_drafts
        ]
    }


# ─── Transaction Endpoints ─────────────────────────────────────────────────

@router.get("/transactions/{year}")
async def get_transactions(
    year: int,
    tx_type: Optional[str] = Query(default=None, description="Filter by type: add, drop, trade, waiver"),
    db: Session = Depends(get_db),
):
    """Get all transactions for a season, optionally filtered by type."""
    season = db.query(Season).filter(Season.year == year).first()
    if not season:
        raise HTTPException(status_code=404, detail=f"Season {year} not found")

    query = db.query(Transaction).filter(Transaction.season_id == season.id)
    if tx_type:
        query = query.filter(Transaction.type == tx_type)

    transactions = query.order_by(Transaction.timestamp.desc()).all()

    results = []
    for tx in transactions:
        team = tx.team
        member = team.member if team else None
        results.append({
            "id": tx.id,
            "type": tx.type,
            "timestamp": tx.timestamp.isoformat() if tx.timestamp else None,
            "week": tx.week,
            "player_name": tx.player_name,
            "player_position": tx.player_position,
            "player_id": tx.player_id,
            "team_name": team.name if team else "Unknown",
            "manager": member.name if member else "Unknown",
            "member_id": member.id if member else None,
            "games_played": tx.games_played,
            "points_scored": tx.points_scored,
        })

    # Summary stats
    type_counts = defaultdict(int)
    for tx in transactions:
        type_counts[tx.type] += 1

    return {
        "season": year,
        "total": len(results),
        "type_breakdown": dict(type_counts),
        "transactions": results,
    }


@router.get("/transactions/activity/{member_id}")
async def get_member_transaction_activity(
    member_id: int,
    db: Session = Depends(get_db),
):
    """Get transaction activity summary for a member across all seasons."""
    member = db.query(Member).get(member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    teams = db.query(Team).filter(Team.member_id == member_id).all()
    team_ids = [t.id for t in teams]

    transactions = (
        db.query(Transaction)
        .filter(Transaction.team_id.in_(team_ids))
        .order_by(Transaction.timestamp.desc())
        .all()
    )

    # Per-season breakdown
    season_activity: Dict[int, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for tx in transactions:
        season_year = tx.season.year if tx.season else 0
        season_activity[season_year][tx.type] += 1
        season_activity[season_year]["total"] += 1

    # Top waiver pickups by points
    waiver_adds = [tx for tx in transactions if tx.type in ("add", "waiver") and tx.points_scored > 0]
    waiver_adds.sort(key=lambda tx: tx.points_scored, reverse=True)

    top_pickups = []
    for tx in waiver_adds[:10]:
        season_year = tx.season.year if tx.season else None
        top_pickups.append({
            "player_name": tx.player_name,
            "player_position": tx.player_position,
            "season": season_year,
            "points_scored": tx.points_scored,
            "games_played": tx.games_played,
        })

    # Overall type counts
    type_counts = defaultdict(int)
    for tx in transactions:
        type_counts[tx.type] += 1

    return {
        "member_id": member_id,
        "member_name": member.name,
        "total_transactions": len(transactions),
        "type_breakdown": dict(type_counts),
        "season_activity": {str(k): dict(v) for k, v in sorted(season_activity.items(), reverse=True)},
        "top_waiver_pickups": top_pickups,
    }


@router.get("/waiver-wire-wins/{year}")
async def get_waiver_wire_wins(
    year: int,
    limit: int = Query(default=15, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """
    Get the best waiver wire pickups for a season.
    Ranked by points scored after being added.
    """
    season = db.query(Season).filter(Season.year == year).first()
    if not season:
        raise HTTPException(status_code=404, detail=f"Season {year} not found")

    # Get add/waiver transactions with points
    adds = (
        db.query(Transaction)
        .filter(
            Transaction.season_id == season.id,
            Transaction.type.in_(["add", "waiver"]),
        )
        .order_by(Transaction.points_scored.desc())
        .limit(limit)
        .all()
    )

    results = []
    for tx in adds:
        team = tx.team
        member = team.member if team else None
        results.append({
            "player_name": tx.player_name,
            "player_position": tx.player_position,
            "team_name": team.name if team else "Unknown",
            "manager": member.name if member else "Unknown",
            "member_id": member.id if member else None,
            "points_scored": tx.points_scored,
            "games_played": tx.games_played,
            "week_added": tx.week,
            "timestamp": tx.timestamp.isoformat() if tx.timestamp else None,
        })

    return {
        "season": year,
        "waiver_wins": results,
    }
