"""
Import data from JSON export into the database.
Used for migrating data to PostgreSQL on Railway.
"""

import json
import os
from pathlib import Path
from datetime import datetime
from sqlalchemy.orm import Session

from models.database import SessionLocal, init_db, engine, Base
from models.league import League, Season, Team, Member
from models.matchup import Matchup, Standing
from models.draft import DraftPick
from config import DATA_DIR, BACKEND_DIR


def parse_datetime(value):
    """Parse ISO datetime string."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except:
        return None


def import_from_json(db: Session, data: dict):
    """Import data from JSON export."""
    
    # Import in order of dependencies
    
    # 1. Members (no dependencies)
    for item in data.get("members", []):
        member = Member(
            id=item["id"],
            name=item["name"],
            email=item.get("email"),
            phone=item.get("phone"),
            yahoo_id=item.get("yahoo_id"),
            created_at=parse_datetime(item.get("created_at")),
            total_championships=item.get("total_championships", 0),
            total_seasons=item.get("total_seasons", 0),
            total_wins=item.get("total_wins", 0),
            total_losses=item.get("total_losses", 0),
            total_points_for=item.get("total_points_for", 0),
        )
        db.merge(member)
    db.flush()
    print(f"Imported {len(data.get('members', []))} members")
    
    # 2. Leagues (no dependencies)
    for item in data.get("leagues", []):
        league = League(
            id=item["id"],
            name=item["name"],
            yahoo_league_key=item.get("yahoo_league_key"),
            created_at=parse_datetime(item.get("created_at")),
        )
        db.merge(league)
    db.flush()
    print(f"Imported {len(data.get('leagues', []))} leagues")
    
    # 3. Seasons (depends on leagues)
    for item in data.get("seasons", []):
        season = Season(
            id=item["id"],
            league_id=item["league_id"],
            year=item["year"],
            yahoo_league_id=item.get("yahoo_league_id"),
            num_teams=item.get("num_teams", 12),
            num_playoff_teams=item.get("num_playoff_teams", 6),
            regular_season_weeks=item.get("regular_season_weeks", 14),
            playoff_weeks=item.get("playoff_weeks", 3),
            draft_date=parse_datetime(item.get("draft_date")),
            season_start=parse_datetime(item.get("season_start")),
            season_end=parse_datetime(item.get("season_end")),
            champion_team_id=item.get("champion_team_id"),
        )
        db.merge(season)
    db.flush()
    print(f"Imported {len(data.get('seasons', []))} seasons")
    
    # 4. Teams (depends on seasons, members)
    for item in data.get("teams", []):
        team = Team(
            id=item["id"],
            season_id=item["season_id"],
            member_id=item["member_id"],
            name=item["name"],
            yahoo_team_key=item.get("yahoo_team_key"),
            logo_url=item.get("logo_url"),
            wins=item.get("wins", 0),
            losses=item.get("losses", 0),
            ties=item.get("ties", 0),
            points_for=item.get("points_for", 0),
            points_against=item.get("points_against", 0),
            playoff_seed=item.get("playoff_seed"),
            made_playoffs=item.get("made_playoffs", False),
            final_rank=item.get("final_rank"),
            is_champion=item.get("is_champion", False),
        )
        db.merge(team)
    db.flush()
    print(f"Imported {len(data.get('teams', []))} teams")
    
    # 5. Matchups (depends on seasons, teams)
    for item in data.get("matchups", []):
        matchup = Matchup(
            id=item["id"],
            season_id=item["season_id"],
            week=item["week"],
            team1_id=item["team1_id"],
            team2_id=item["team2_id"],
            team1_score=item.get("team1_score", 0),
            team2_score=item.get("team2_score", 0),
            winner_id=item.get("winner_id"),
            is_playoff=item.get("is_playoff", False),
            is_championship=item.get("is_championship", False),
            margin=item.get("margin", 0),
            total_points=item.get("total_points", 0),
        )
        db.merge(matchup)
    db.flush()
    print(f"Imported {len(data.get('matchups', []))} matchups")
    
    # 6. Standings (depends on seasons, teams)
    for item in data.get("standings", []):
        standing = Standing(
            id=item["id"],
            season_id=item["season_id"],
            team_id=item["team_id"],
            week=item.get("week"),
            rank=item.get("rank", 0),
            wins=item.get("wins", 0),
            losses=item.get("losses", 0),
            ties=item.get("ties", 0),
            points_for=item.get("points_for", 0),
            points_against=item.get("points_against", 0),
        )
        db.merge(standing)
    db.flush()
    print(f"Imported {len(data.get('standings', []))} standings")
    
    # 7. Draft picks (depends on seasons, teams)
    for item in data.get("draft_picks", []):
        pick = DraftPick(
            id=item["id"],
            season_id=item["season_id"],
            team_id=item["team_id"],
            round=item.get("round", 1),
            pick_number=item.get("pick_number", 0),
            player_id=item.get("player_id"),
            player_name=item.get("player_name", "Unknown"),
            player_position=item.get("player_position"),
            player_nfl_team=item.get("player_nfl_team"),
        )
        db.merge(pick)
    db.flush()
    print(f"Imported {len(data.get('draft_picks', []))} draft picks")
    
    db.commit()
    print("Import complete!")


def check_and_import():
    """Check if database is empty and import from JSON if needed."""
    # Create tables first
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if data exists
        member_count = db.query(Member).count()
        if member_count > 0:
            print(f"Database already has {member_count} members, skipping import")
            return False
        
        # Look for export file
        export_file = BACKEND_DIR / "data" / "database_export.json"
        if not export_file.exists():
            export_file = DATA_DIR / "database_export.json"
        if not export_file.exists():
            print("No database_export.json found, skipping import")
            return False
        
        print(f"Importing data from: {export_file}")
        with open(export_file, "r") as f:
            data = json.load(f)
        
        import_from_json(db, data)
        return True
        
    finally:
        db.close()


if __name__ == "__main__":
    check_and_import()
