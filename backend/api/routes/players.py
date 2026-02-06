"""Player search and history API routes."""

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
from models.draft import DraftPick, Transaction

router = APIRouter()


@router.get("/search")
async def search_players(
    q: str = Query(..., min_length=2, description="Player name search query"),
    limit: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Search for players by name across all draft picks and transactions.
    Returns unique player names with position, NFL team, and number of appearances.
    """
    search_term = f"%{q.strip()}%"

    # Search draft picks
    draft_matches = (
        db.query(
            DraftPick.player_name,
            DraftPick.player_position,
            DraftPick.player_team,
            DraftPick.player_id,
        )
        .filter(DraftPick.player_name.ilike(search_term))
        .all()
    )

    # Search transactions
    tx_matches = (
        db.query(
            Transaction.player_name,
            Transaction.player_position,
            Transaction.player_id,
        )
        .filter(Transaction.player_name.ilike(search_term))
        .all()
    )

    # Deduplicate by normalized name, keeping the best info
    players: Dict[str, Dict[str, Any]] = {}

    for name, position, nfl_team, pid in draft_matches:
        key = name.strip().lower()
        if key not in players:
            players[key] = {
                "player_name": name.strip(),
                "player_position": position or "",
                "player_team": nfl_team or "",
                "player_id": pid or "",
                "draft_count": 0,
                "transaction_count": 0,
            }
        players[key]["draft_count"] += 1
        # Prefer non-empty values
        if nfl_team and not players[key]["player_team"]:
            players[key]["player_team"] = nfl_team
        if position and not players[key]["player_position"]:
            players[key]["player_position"] = position

    for name, position, pid in tx_matches:
        key = name.strip().lower()
        if key not in players:
            players[key] = {
                "player_name": name.strip(),
                "player_position": position or "",
                "player_team": "",
                "player_id": pid or "",
                "draft_count": 0,
                "transaction_count": 0,
            }
        players[key]["transaction_count"] += 1
        if position and not players[key]["player_position"]:
            players[key]["player_position"] = position

    # Sort by total appearances (most relevant first)
    results = sorted(
        players.values(),
        key=lambda p: p["draft_count"] + p["transaction_count"],
        reverse=True,
    )[:limit]

    return {"query": q, "count": len(results), "players": results}


@router.get("/history/{player_name:path}")
async def get_player_history(
    player_name: str,
    db: Session = Depends(get_db),
):
    """
    Get the complete history of a player in the league.
    Returns draft history, transaction timeline, and summary stats.
    """
    search_name = player_name.strip()

    # ── Draft picks for this player ──
    draft_picks = (
        db.query(DraftPick)
        .filter(DraftPick.player_name.ilike(search_name))
        .order_by(DraftPick.season_id)
        .all()
    )

    # ── Transactions for this player ──
    transactions = (
        db.query(Transaction)
        .filter(Transaction.player_name.ilike(search_name))
        .order_by(Transaction.timestamp)
        .all()
    )

    if not draft_picks and not transactions:
        raise HTTPException(
            status_code=404,
            detail=f"Player '{search_name}' not found in league history",
        )

    # Build season lookup
    season_ids = set()
    for p in draft_picks:
        season_ids.add(p.season_id)
    for t in transactions:
        season_ids.add(t.season_id)

    seasons = db.query(Season).filter(Season.id.in_(season_ids)).all()
    season_map = {s.id: s for s in seasons}

    # ── Player info (use most recent data) ──
    position = ""
    nfl_team = ""
    for p in reversed(draft_picks):
        if p.player_position and not position:
            position = p.player_position
        if p.player_team and not nfl_team:
            nfl_team = p.player_team
        if position and nfl_team:
            break

    # ── Draft history ──
    draft_history = []
    for p in draft_picks:
        season = season_map.get(p.season_id)
        team = p.team
        member = team.member if team else None
        draft_history.append({
            "season": season.year if season else None,
            "round": p.round,
            "pick_number": p.pick_number,
            "team_name": team.name if team else "Unknown",
            "manager": member.name if member else "Unknown",
            "member_id": member.id if member else None,
            "player_position": p.player_position,
            "player_team": p.player_team,
            "season_points": p.season_points,
            "season_rank": p.season_rank,
            "grade": p.grade,
            "adp": p.adp,
            "value_over_adp": p.value_over_adp,
        })

    # ── Transaction timeline ──
    transaction_timeline = []
    for t in transactions:
        season = season_map.get(t.season_id)
        team = t.team
        member = team.member if team else None
        transaction_timeline.append({
            "season": season.year if season else None,
            "type": t.type,
            "timestamp": t.timestamp.isoformat() if t.timestamp else None,
            "week": t.week,
            "team_name": team.name if team else "Unknown",
            "manager": member.name if member else "Unknown",
            "member_id": member.id if member else None,
            "player_position": t.player_position,
        })

    # ── Combined timeline (chronological) ──
    timeline = []

    for d in draft_history:
        timeline.append({
            "event": "drafted",
            "season": d["season"],
            "sort_key": (d["season"] or 0, 0),  # Drafts happen before the season
            "detail": "Rd {} Pk {} by {} ({})".format(
                d["round"], d["pick_number"], d["manager"], d["team_name"]
            ),
            "manager": d["manager"],
            "member_id": d["member_id"],
            "team_name": d["team_name"],
            "grade": d["grade"],
            "season_points": d["season_points"],
            "round": d["round"],
            "pick_number": d["pick_number"],
        })

    for t in transaction_timeline:
        # Approximate week to sort within a season
        week = t["week"] or 0
        timeline.append({
            "event": t["type"],
            "season": t["season"],
            "sort_key": (t["season"] or 0, week + 1),  # +1 so transactions sort after drafts
            "detail": "{} by {} ({}){}".format(
                t["type"].capitalize(),
                t["manager"],
                t["team_name"],
                f" (Week {t['week']})" if t["week"] else "",
            ),
            "manager": t["manager"],
            "member_id": t["member_id"],
            "team_name": t["team_name"],
            "grade": None,
            "season_points": None,
            "round": None,
            "pick_number": None,
        })

    timeline.sort(key=lambda x: x["sort_key"])

    # Remove sort_key from output
    for item in timeline:
        del item["sort_key"]

    # ── Summary stats ──
    managers_drafted_by = list(set(
        d["manager"] for d in draft_history if d["manager"] != "Unknown"
    ))
    times_drafted = len(draft_picks)
    times_added = sum(1 for t in transactions if t.type in ("add", "waiver"))
    times_dropped = sum(1 for t in transactions if t.type == "drop")
    times_traded = sum(1 for t in transactions if t.type == "trade")

    seasons_active = sorted(set(
        d["season"] for d in draft_history if d["season"]
    ) | set(
        t["season"] for t in transaction_timeline if t["season"]
    ))

    # Grade summary
    grades = [d["grade"] for d in draft_history if d["grade"]]
    avg_grade = None
    if grades:
        grade_values = {"A+": 4.3, "A": 4.0, "B": 3.0, "C": 2.0, "D": 1.0, "F": 0.0}
        avg_val = sum(grade_values.get(g, 2.0) for g in grades) / len(grades)
        thresholds = [(4.3, "A+"), (3.5, "A"), (2.5, "B"), (1.5, "C"), (0.5, "D"), (0, "F")]
        for threshold, letter in thresholds:
            if avg_val >= threshold:
                avg_grade = letter
                break

    # Best season
    best_season = None
    if draft_history:
        scored = [d for d in draft_history if d["season_points"] and d["season_points"] > 0]
        if scored:
            best = max(scored, key=lambda d: d["season_points"])
            best_season = {
                "season": best["season"],
                "points": best["season_points"],
                "grade": best["grade"],
                "manager": best["manager"],
            }

    return {
        "player_name": search_name,
        "player_position": position,
        "player_team": nfl_team,
        "summary": {
            "times_drafted": times_drafted,
            "times_added": times_added,
            "times_dropped": times_dropped,
            "times_traded": times_traded,
            "total_transactions": times_added + times_dropped + times_traded,
            "seasons_active": seasons_active,
            "managers_drafted_by": managers_drafted_by,
            "avg_draft_grade": avg_grade,
            "best_season": best_season,
        },
        "draft_history": draft_history,
        "transaction_timeline": transaction_timeline,
        "timeline": timeline,
    }
