"""NFL team draft history API routes."""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, List, Any
from collections import defaultdict

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from models.database import get_db
from models.league import Season, Team, Member
from models.draft import DraftPick

router = APIRouter()

GRADE_VALUES = {"A+": 4.3, "A": 4.0, "B": 3.0, "C": 2.0, "D": 1.0, "F": 0.0}
GRADE_THRESHOLDS = [(4.3, "A+"), (3.5, "A"), (2.5, "B"), (1.5, "C"), (0.5, "D"), (0, "F")]


def _letter_grade(value: float) -> str:
    for threshold, letter in GRADE_THRESHOLDS:
        if value >= threshold:
            return letter
    return "F"


@router.get("/")
async def list_nfl_teams(db: Session = Depends(get_db)):
    """
    List all NFL teams that appear in draft data, with summary stats.
    """
    picks = (
        db.query(DraftPick)
        .filter(DraftPick.player_team.isnot(None), DraftPick.player_team != "")
        .all()
    )

    if not picks:
        return {"teams": []}

    # Aggregate per NFL team
    team_data: Dict[str, Dict[str, Any]] = {}

    for p in picks:
        abbr = p.player_team.upper().strip()
        if abbr not in team_data:
            team_data[abbr] = {
                "abbr": abbr,
                "total_picks": 0,
                "total_points": 0.0,
                "grades": [],
                "managers": set(),
                "positions": defaultdict(int),
                "seasons": set(),
            }
        td = team_data[abbr]
        td["total_picks"] += 1
        td["total_points"] += p.season_points or 0
        if p.grade:
            td["grades"].append(p.grade)
        team = p.team
        member = team.member if team else None
        if member:
            td["managers"].add(member.name)
        season = p.season
        if season:
            td["seasons"].add(season.year)
        if p.player_position:
            td["positions"][p.player_position] += 1

    # Format output
    results = []
    for abbr, td in team_data.items():
        avg_grade = None
        if td["grades"]:
            avg_val = sum(GRADE_VALUES.get(g, 2.0) for g in td["grades"]) / len(td["grades"])
            avg_grade = _letter_grade(avg_val)

        top_pos = max(td["positions"], key=td["positions"].get) if td["positions"] else None

        results.append({
            "abbr": abbr,
            "total_picks": td["total_picks"],
            "total_points": round(td["total_points"], 1),
            "avg_grade": avg_grade,
            "graded_picks": len(td["grades"]),
            "unique_managers": len(td["managers"]),
            "seasons_span": sorted(td["seasons"]) if td["seasons"] else [],
            "top_position": top_pos,
        })

    results.sort(key=lambda t: -t["total_picks"])

    return {"count": len(results), "teams": results}


@router.get("/{abbr}")
async def get_nfl_team_detail(abbr: str, db: Session = Depends(get_db)):
    """
    Get full draft history for a specific NFL team.
    Shows homer leaderboard, all picks, grade breakdown, and position stats.
    """
    abbr_upper = abbr.upper().strip()

    picks = (
        db.query(DraftPick)
        .filter(
            DraftPick.player_team.isnot(None),
            func.upper(DraftPick.player_team) == abbr_upper,
        )
        .all()
    )

    if not picks:
        raise HTTPException(
            status_code=404,
            detail=f"No draft data found for NFL team '{abbr_upper}'",
        )

    # Build season lookup
    season_ids = set(p.season_id for p in picks)
    seasons = db.query(Season).filter(Season.id.in_(season_ids)).all()
    season_map = {s.id: s for s in seasons}

    # ── Homer leaderboard (managers who drafted the most from this team) ──
    manager_stats: Dict[int, Dict[str, Any]] = {}
    for p in picks:
        team = p.team
        member = team.member if team else None
        if not member:
            continue
        mid = member.id
        if mid not in manager_stats:
            manager_stats[mid] = {
                "member_id": mid,
                "manager": member.name,
                "pick_count": 0,
                "total_points": 0.0,
                "grades": [],
                "players": [],
                "seasons": set(),
            }
        ms = manager_stats[mid]
        ms["pick_count"] += 1
        ms["total_points"] += p.season_points or 0
        if p.grade:
            ms["grades"].append(p.grade)
        ms["seasons"].add(season_map[p.season_id].year if p.season_id in season_map else None)
        ms["players"].append(p.player_name)

    homer_leaderboard = []
    for mid, ms in manager_stats.items():
        avg_grade = None
        if ms["grades"]:
            avg_val = sum(GRADE_VALUES.get(g, 2.0) for g in ms["grades"]) / len(ms["grades"])
            avg_grade = _letter_grade(avg_val)

        # Deduplicate player names for display
        unique_players = list(dict.fromkeys(ms["players"]))

        homer_leaderboard.append({
            "member_id": ms["member_id"],
            "manager": ms["manager"],
            "pick_count": ms["pick_count"],
            "total_points": round(ms["total_points"], 1),
            "avg_grade": avg_grade,
            "seasons_count": len(ms["seasons"] - {None}),
            "notable_players": unique_players[:5],
        })

    homer_leaderboard.sort(key=lambda h: -h["pick_count"])

    # ── All picks ──
    all_picks = []
    for p in picks:
        season = season_map.get(p.season_id)
        team = p.team
        member = team.member if team else None
        all_picks.append({
            "season": season.year if season else None,
            "round": p.round,
            "pick_number": p.pick_number,
            "player_name": p.player_name,
            "player_position": p.player_position,
            "team_name": team.name if team else "Unknown",
            "manager": member.name if member else "Unknown",
            "member_id": member.id if member else None,
            "season_points": p.season_points,
            "grade": p.grade,
        })
    all_picks.sort(key=lambda p: (p["season"] or 0, p["pick_number"] or 0))

    # ── Grade breakdown ──
    grade_counts: Dict[str, int] = defaultdict(int)
    for p in picks:
        if p.grade:
            grade_counts[p.grade] += 1

    graded = [p for p in picks if p.grade]
    overall_avg_grade = None
    if graded:
        avg_val = sum(GRADE_VALUES.get(p.grade, 2.0) for p in graded) / len(graded)
        overall_avg_grade = _letter_grade(avg_val)

    # ── Position breakdown ──
    position_stats: Dict[str, Dict[str, Any]] = defaultdict(
        lambda: {"count": 0, "total_points": 0.0, "grades": []}
    )
    for p in picks:
        pos = p.player_position or "Unknown"
        position_stats[pos]["count"] += 1
        position_stats[pos]["total_points"] += p.season_points or 0
        if p.grade:
            position_stats[pos]["grades"].append(p.grade)

    position_breakdown = []
    for pos, ps in sorted(position_stats.items(), key=lambda x: -x[1]["count"]):
        avg_grade = None
        if ps["grades"]:
            avg_val = sum(GRADE_VALUES.get(g, 2.0) for g in ps["grades"]) / len(ps["grades"])
            avg_grade = _letter_grade(avg_val)
        position_breakdown.append({
            "position": pos,
            "count": ps["count"],
            "total_points": round(ps["total_points"], 1),
            "avg_grade": avg_grade,
        })

    # ── Best and worst picks ──
    graded_picks = [p for p in all_picks if p["grade"]]
    grade_order = {"A+": 6, "A": 5, "B": 4, "C": 3, "D": 2, "F": 1}
    best_picks = sorted(
        graded_picks,
        key=lambda p: (-grade_order.get(p["grade"], 0), -(p["season_points"] or 0)),
    )[:5]
    worst_picks = sorted(
        graded_picks,
        key=lambda p: (grade_order.get(p["grade"], 0), p["season_points"] or 0),
    )[:5]

    # ── Season-by-season breakdown ──
    season_stats: Dict[int, Dict[str, Any]] = defaultdict(
        lambda: {"picks": 0, "total_points": 0.0, "grades": []}
    )
    for p in picks:
        season = season_map.get(p.season_id)
        if not season:
            continue
        ss = season_stats[season.year]
        ss["picks"] += 1
        ss["total_points"] += p.season_points or 0
        if p.grade:
            ss["grades"].append(p.grade)

    by_season = []
    for year in sorted(season_stats.keys()):
        ss = season_stats[year]
        avg_grade = None
        if ss["grades"]:
            avg_val = sum(GRADE_VALUES.get(g, 2.0) for g in ss["grades"]) / len(ss["grades"])
            avg_grade = _letter_grade(avg_val)
        by_season.append({
            "season": year,
            "picks": ss["picks"],
            "total_points": round(ss["total_points"], 1),
            "avg_grade": avg_grade,
        })

    return {
        "abbr": abbr_upper,
        "total_picks": len(picks),
        "total_points": round(sum(p.season_points or 0 for p in picks), 1),
        "avg_grade": overall_avg_grade,
        "homer_leaderboard": homer_leaderboard,
        "all_picks": all_picks,
        "grade_breakdown": dict(grade_counts),
        "position_breakdown": position_breakdown,
        "best_picks": best_picks,
        "worst_picks": worst_picks,
        "by_season": by_season,
    }
