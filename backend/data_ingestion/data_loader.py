"""
Data Loader

Loads data from Yahoo Fantasy API and iMessage exports into the database.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session
from models.database import SessionLocal, init_db
from models.league import League, Season, Team, Member
from models.matchup import Matchup, Standing
from models.draft import DraftPick
from config import DATA_DIR


class DataLoader:
    """Loads data into the database from various sources."""
    
    def __init__(self, db: Optional[Session] = None):
        """Initialize the data loader."""
        self.db = db or SessionLocal()
        self._member_cache: Dict[str, Member] = {}
        self._team_cache: Dict[str, Team] = {}
    
    def close(self):
        """Close database session."""
        self.db.close()
    
    def initialize_database(self):
        """Initialize database tables."""
        init_db()
        print("Database initialized.")
    
    def get_or_create_member(self, name: str, yahoo_id: str = None, phone: str = None) -> Member:
        """Get existing member or create new one."""
        # Check cache first
        cache_key = yahoo_id or name.lower().strip()
        if cache_key in self._member_cache:
            return self._member_cache[cache_key]
        
        # Check database
        member = None
        if yahoo_id:
            member = self.db.query(Member).filter(Member.yahoo_id == yahoo_id).first()
        if not member:
            member = self.db.query(Member).filter(Member.name == name).first()
        
        if not member:
            member = Member(
                name=name,
                yahoo_id=yahoo_id,
                phone=phone,
            )
            self.db.add(member)
            self.db.flush()
        
        self._member_cache[cache_key] = member
        return member
    
    def get_or_create_league(self, name: str = "Top Pot Fantasy Football League") -> League:
        """Get or create the main league."""
        league = self.db.query(League).filter(League.name == name).first()
        if not league:
            league = League(name=name)
            self.db.add(league)
            self.db.flush()
        return league
    
    def load_yahoo_data(self, data_file: Path = None) -> Dict[str, int]:
        """
        Load Yahoo Fantasy data from JSON export.
        
        Args:
            data_file: Path to JSON file. Defaults to data/yahoo_export.json
            
        Returns:
            Dictionary of loaded counts
        """
        data_file = data_file or (DATA_DIR / "yahoo_export.json")
        
        if not data_file.exists():
            print(f"Yahoo data file not found: {data_file}")
            print("Run: python -m data_ingestion.yahoo_client --sync-all")
            return {}
        
        print(f"Loading Yahoo data from: {data_file}")
        
        with open(data_file, "r") as f:
            data = json.load(f)
        
        counts = {
            "leagues": 0,
            "seasons": 0,
            "teams": 0,
            "members": 0,
            "matchups": 0,
            "standings": 0,
            "draft_picks": 0,
        }
        
        # Get or create the main league
        league = self.get_or_create_league()
        counts["leagues"] = 1
        
        # Process seasons
        season_map = {}  # yahoo_league_id -> Season
        for league_data in data.get("leagues", []):
            year = league_data.get("season")
            yahoo_id = league_data.get("league_id")
            
            if not year:
                continue
            
            season = self.db.query(Season).filter(
                Season.league_id == league.id,
                Season.year == year
            ).first()
            
            if not season:
                season = Season(
                    league_id=league.id,
                    year=year,
                    yahoo_league_id=yahoo_id,
                    num_teams=league_data.get("num_teams", 12),
                    regular_season_weeks=league_data.get("end_week", 14),
                )
                self.db.add(season)
                self.db.flush()
                counts["seasons"] += 1
            
            season_map[yahoo_id] = season
        
        # Process teams
        team_map = {}  # yahoo_team_key -> Team
        for team_data in data.get("teams", []):
            yahoo_team_key = team_data.get("team_key") or team_data.get("team_id")
            manager_name = team_data.get("manager", "Unknown")
            team_name = team_data.get("name", "Unknown")
            
            # Find season from team key
            if yahoo_team_key and "." in yahoo_team_key:
                league_id_part = ".".join(yahoo_team_key.split(".")[:3])
                season = season_map.get(league_id_part)
            else:
                season = None
            
            if not season:
                continue
            
            # Get or create member
            member = self.get_or_create_member(manager_name)
            if member.id not in [m.id for m in self._member_cache.values()]:
                counts["members"] += 1
            
            # Check if team exists
            team = self.db.query(Team).filter(
                Team.season_id == season.id,
                Team.yahoo_team_key == yahoo_team_key
            ).first()
            
            if not team:
                team = Team(
                    season_id=season.id,
                    member_id=member.id,
                    name=team_name,
                    yahoo_team_key=yahoo_team_key,
                    logo_url=team_data.get("logo_url"),
                )
                self.db.add(team)
                self.db.flush()
                counts["teams"] += 1
            
            team_map[yahoo_team_key] = team
        
        # Process standings
        for standing_data in data.get("standings", []):
            season_year = standing_data.get("season")
            
            # Find season
            season = None
            for s in season_map.values():
                if s.year == season_year:
                    season = s
                    break
            
            if not season:
                continue
            
            # Find team
            team_key = standing_data.get("team_id")
            team = team_map.get(team_key)
            
            if not team:
                # Try to create team from standing data
                manager_name = standing_data.get("manager_name", "Unknown")
                member = self.get_or_create_member(manager_name)
                
                team = Team(
                    season_id=season.id,
                    member_id=member.id,
                    name=standing_data.get("team_name", "Unknown"),
                    yahoo_team_key=team_key,
                    wins=standing_data.get("wins", 0),
                    losses=standing_data.get("losses", 0),
                    ties=standing_data.get("ties", 0),
                    points_for=standing_data.get("points_for", 0),
                    points_against=standing_data.get("points_against", 0),
                )
                self.db.add(team)
                self.db.flush()
                team_map[team_key] = team
                counts["teams"] += 1
            
            # Update team stats
            team.wins = standing_data.get("wins", team.wins)
            team.losses = standing_data.get("losses", team.losses)
            team.ties = standing_data.get("ties", team.ties)
            team.points_for = standing_data.get("points_for", team.points_for)
            team.points_against = standing_data.get("points_against", team.points_against)
            team.final_rank = standing_data.get("rank")
            team.is_champion = standing_data.get("is_champion", False)
            team.playoff_seed = standing_data.get("playoff_seed")
            
            # Create standing record
            existing = self.db.query(Standing).filter(
                Standing.season_id == season.id,
                Standing.team_id == team.id,
                Standing.week == None  # Final standings
            ).first()
            
            if not existing:
                standing = Standing(
                    season_id=season.id,
                    team_id=team.id,
                    rank=standing_data.get("rank", 0),
                    wins=standing_data.get("wins", 0),
                    losses=standing_data.get("losses", 0),
                    ties=standing_data.get("ties", 0),
                    points_for=standing_data.get("points_for", 0),
                    points_against=standing_data.get("points_against", 0),
                )
                self.db.add(standing)
                counts["standings"] += 1
        
        # Process matchups
        for matchup_data in data.get("matchups", []):
            season_year = matchup_data.get("season")
            week = matchup_data.get("week")
            
            # Find season
            season = None
            for s in season_map.values():
                if s.year == season_year:
                    season = s
                    break
            
            if not season:
                continue
            
            # Find teams
            team1 = team_map.get(matchup_data.get("team1_id"))
            team2 = team_map.get(matchup_data.get("team2_id"))
            
            if not team1 or not team2:
                continue
            
            # Check if matchup exists
            existing = self.db.query(Matchup).filter(
                Matchup.season_id == season.id,
                Matchup.week == week,
                Matchup.team1_id == team1.id,
                Matchup.team2_id == team2.id
            ).first()
            
            if not existing:
                winner_key = matchup_data.get("winner_id")
                winner = team_map.get(winner_key) if winner_key else None
                
                matchup = Matchup(
                    season_id=season.id,
                    week=week,
                    team1_id=team1.id,
                    team2_id=team2.id,
                    team1_score=matchup_data.get("team1_score", 0),
                    team2_score=matchup_data.get("team2_score", 0),
                    winner_id=winner.id if winner else None,
                    is_playoff=matchup_data.get("is_playoff", False),
                    is_championship=matchup_data.get("is_championship", False),
                )
                matchup.calculate_fields()
                self.db.add(matchup)
                counts["matchups"] += 1
        
        # Process draft picks
        for pick_data in data.get("draft_picks", []):
            season_year = pick_data.get("season")
            
            # Find season
            season = None
            for s in season_map.values():
                if s.year == season_year:
                    season = s
                    break
            
            if not season:
                continue
            
            # Find team
            team = team_map.get(pick_data.get("team_id"))
            if not team:
                continue
            
            # Check if pick exists
            existing = self.db.query(DraftPick).filter(
                DraftPick.season_id == season.id,
                DraftPick.pick_number == pick_data.get("pick")
            ).first()
            
            if not existing:
                draft_pick = DraftPick(
                    season_id=season.id,
                    team_id=team.id,
                    round=pick_data.get("round", 1),
                    pick_number=pick_data.get("pick", 0),
                    player_id=pick_data.get("player_id"),
                    player_name=pick_data.get("player_name", "Unknown"),
                    player_position=pick_data.get("player_position"),
                )
                self.db.add(draft_pick)
                counts["draft_picks"] += 1
        
        self.db.commit()
        
        # Update member aggregate stats
        self._update_member_stats()
        
        print(f"Loaded Yahoo data: {counts}")
        return counts
    
    def _update_member_stats(self):
        """Update aggregate stats for all members."""
        members = self.db.query(Member).all()
        
        for member in members:
            teams = self.db.query(Team).filter(Team.member_id == member.id).all()
            
            member.total_seasons = len(teams)
            member.total_championships = sum(1 for t in teams if t.is_champion)
            member.total_wins = sum(t.wins for t in teams)
            member.total_losses = sum(t.losses for t in teams)
            member.total_points_for = sum(t.points_for for t in teams)
        
        self.db.commit()


# CLI interface
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Data Loader")
    parser.add_argument("--init", action="store_true", help="Initialize database")
    parser.add_argument("--load-yahoo", action="store_true", help="Load Yahoo data")
    parser.add_argument("--yahoo-file", type=str, help="Yahoo JSON file path")
    args = parser.parse_args()
    
    loader = DataLoader()
    
    if args.init:
        loader.initialize_database()
    
    if args.load_yahoo:
        yahoo_file = Path(args.yahoo_file) if args.yahoo_file else None
        loader.load_yahoo_data(yahoo_file)
    
    loader.close()
