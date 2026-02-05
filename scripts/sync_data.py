#!/usr/bin/env python3
"""
Data Sync Script

Syncs data from Yahoo Fantasy API into the database.
Can be run manually or scheduled via cron.
"""

import argparse
import sys
from pathlib import Path
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from config import settings, DATA_DIR
from data_ingestion.yahoo_client import YahooFantasyClient
from data_ingestion.data_loader import DataLoader
from models.database import init_db


def sync_draft_stats(league_filter: str = "top pot", year: int = None, delay: float = 0.5):
    """
    Fetch season stats for all draft picks, calculate grades, and populate
    steals/busts data.
    
    This is a separate, slower sync step that enriches existing draft picks
    with season_points, adp, season_rank, value_over_adp, and grade.
    
    Args:
        league_filter: Filter for league names (case-insensitive)
        year: If provided, only process this season year
        delay: Seconds between API calls for rate limiting
    """
    from models.league import Season
    from models.draft import DraftPick
    from models.database import SessionLocal
    from analytics.calculations import calculate_draft_grades, calculate_draft_heuristic_fallback

    print("\n" + "=" * 60)
    print("  Syncing Draft Stats (Steals & Busts)")
    print("=" * 60 + "\n")
    
    if not settings.yahoo_credentials_configured:
        print("ERROR: Yahoo credentials not configured!")
        print("Please set YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET in .env")
        return False
    
    try:
        # Connect to Yahoo API
        client = YahooFantasyClient()
        client.connect()
        print("Connected to Yahoo Fantasy API")
        
        # Find matching leagues
        leagues = client.get_matching_league_ids(league_filter)
        if not leagues:
            print(f"No leagues found matching '{league_filter}'")
            return False
        
        # Filter to specific year if requested
        if year:
            leagues = [l for l in leagues if l["season"] == year]
            if not leagues:
                print(f"No league found for year {year}")
                return False
        
        print(f"Found {len(leagues)} season(s) to process\n")
        
        db = SessionLocal()
        
        total_api_updated = 0
        total_heuristic_updated = 0
        total_graded = 0
        
        for league_info in leagues:
            league_id = league_info["league_id"]
            season_year = league_info["season"]
            league_name = league_info["name"]
            
            print(f"{'─' * 50}")
            print(f"Season {season_year}: {league_name}")
            print(f"  League ID: {league_id}")
            
            # Find the season in our database
            season = db.query(Season).filter(Season.year == season_year).first()
            if not season:
                print(f"  ⚠ Season {season_year} not in database, skipping")
                continue
            
            # Get draft picks for this season from our DB
            picks = (
                db.query(DraftPick)
                .filter(DraftPick.season_id == season.id)
                .order_by(DraftPick.pick_number)
                .all()
            )
            
            if not picks:
                print(f"  No draft picks in database for {season_year}, skipping")
                continue
            
            print(f"  {len(picks)} picks in database")
            
            # Collect player IDs that need stats
            player_ids = [p.player_id for p in picks if p.player_id]
            unique_ids = list(set(player_ids))
            
            # ── Step 1: Fetch stats from Yahoo API ──
            print(f"  Step 1: Fetching Yahoo API stats...")
            api_updated = 0
            try:
                stats_map = client.get_player_stats_for_draft(
                    league_id, unique_ids, delay=delay
                )
                
                # Apply stats to database picks
                for pick in picks:
                    if not pick.player_id:
                        continue
                    stats = stats_map.get(pick.player_id)
                    if not stats:
                        continue
                    
                    if stats.get("season_points") is not None:
                        pick.season_points = stats["season_points"]
                        api_updated += 1
                    if stats.get("adp") is not None:
                        pick.adp = stats["adp"]
                
                db.commit()
                total_api_updated += api_updated
                print(f"  -> API: {api_updated} picks got season_points")
            except Exception as e:
                print(f"  ERROR fetching API stats: {e}")
                db.rollback()
            
            # ── Step 2: Heuristic fallback for missing data ──
            print(f"  Step 2: Heuristic fallback for remaining picks...")
            try:
                heuristic_count = calculate_draft_heuristic_fallback(db, season.id)
                total_heuristic_updated += heuristic_count
                print(f"  -> Heuristic: {heuristic_count} picks estimated")
            except Exception as e:
                print(f"  ERROR in heuristic fallback: {e}")
                db.rollback()
            
            # ── Step 3: Calculate grades ──
            print(f"  Step 3: Calculating grades...")
            try:
                graded = calculate_draft_grades(db, season.id)
                graded_count = len(graded)
                total_graded += graded_count
                print(f"  -> Graded: {graded_count} picks")
                
                # Show top steals and busts for this season
                steals = [g for g in graded if g["grade"] in ("A+", "A")]
                busts = [g for g in graded if g["grade"] in ("D", "F")]
                if steals:
                    top = sorted(steals, key=lambda x: -(x["season_points"] or 0))[:3]
                    steal_strs = ["{} (Rank {})".format(s["player_name"], s.get("season_rank", "?")) for s in top]
                    print("  Top steals: " + ", ".join(steal_strs))
                if busts:
                    worst = sorted(busts, key=lambda x: (x["season_points"] or 999))[:3]
                    bust_strs = ["{} (Rank {})".format(b["player_name"], b.get("season_rank", "?")) for b in worst]
                    print("  Top busts:  " + ", ".join(bust_strs))
            except Exception as e:
                print(f"  ERROR calculating grades: {e}")
                db.rollback()
            
            print()
        
        db.close()
        
        # ── Summary ──
        print("=" * 60)
        print("  Draft Stats Sync Complete!")
        print("=" * 60)
        print(f"  Seasons processed:  {len(leagues)}")
        print(f"  API stats fetched:  {total_api_updated} picks")
        print(f"  Heuristic fills:    {total_heuristic_updated} picks")
        print(f"  Total graded:       {total_graded} picks")
        print()
        
        return True
        
    except Exception as e:
        print(f"\nError syncing draft stats: {e}")
        import traceback
        traceback.print_exc()
        return False


def sync_yahoo_data(league_filter: str = "top pot", force_full: bool = False):
    """
    Sync data from Yahoo Fantasy API.
    
    Args:
        league_filter: Filter for league names (case-insensitive)
        force_full: If True, re-sync all historical data
    """
    print("\n" + "=" * 60)
    print("  Syncing Yahoo Fantasy Data")
    print("=" * 60 + "\n")
    
    # Check if credentials are configured
    if not settings.yahoo_credentials_configured:
        print("ERROR: Yahoo credentials not configured!")
        print("Please set YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET in .env")
        return False
    
    try:
        # Connect to Yahoo API
        client = YahooFantasyClient()
        client.connect()
        print("Connected to Yahoo Fantasy API")
        
        # Fetch all data
        print(f"\nFetching leagues matching '{league_filter}'...")
        data = client.get_all_historical_data(league_filter)
        
        if not data["leagues"]:
            print(f"No leagues found matching '{league_filter}'")
            return False
        
        # Save raw export
        export_file = DATA_DIR / "yahoo_export.json"
        import json
        with open(export_file, "w") as f:
            json.dump(data, f, indent=2, default=str)
        print(f"\nRaw data exported to: {export_file}")
        
        # Load into database
        print("\nLoading data into database...")
        loader = DataLoader()
        loader.initialize_database()
        counts = loader.load_yahoo_data(export_file)
        loader.close()
        
        print("\nSync complete!")
        print(f"  Seasons: {counts.get('seasons', 0)}")
        print(f"  Teams: {counts.get('teams', 0)}")
        print(f"  Matchups: {counts.get('matchups', 0)}")
        print(f"  Standings: {counts.get('standings', 0)}")
        print(f"  Draft picks: {counts.get('draft_picks', 0)}")
        print(f"  Transactions: {counts.get('transactions', 0)}")
        
        return True
        
    except Exception as e:
        print(f"\nError syncing Yahoo data: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Sync data from Yahoo Fantasy API"
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Yahoo sync
    yahoo_parser = subparsers.add_parser("yahoo", help="Sync Yahoo Fantasy data")
    yahoo_parser.add_argument(
        "--filter", type=str, default="top pot",
        help="League name filter (default: 'top pot')"
    )
    yahoo_parser.add_argument(
        "--force", action="store_true",
        help="Force full re-sync of all data"
    )
    
    # Draft stats sync
    draft_parser = subparsers.add_parser(
        "draft-stats", help="Fetch season stats for draft picks (steals & busts)"
    )
    draft_parser.add_argument(
        "--filter", type=str, default="top pot",
        help="League name filter (default: 'top pot')"
    )
    draft_parser.add_argument(
        "--year", type=int, default=None,
        help="Only process a specific season year (e.g. 2023)"
    )
    draft_parser.add_argument(
        "--delay", type=float, default=0.5,
        help="Seconds between API calls for rate limiting (default: 0.5)"
    )
    
    # Init database
    init_parser = subparsers.add_parser("init", help="Initialize the database")
    
    args = parser.parse_args()
    
    if args.command == "yahoo":
        sync_yahoo_data(args.filter, args.force)
    elif args.command == "draft-stats":
        sync_draft_stats(args.filter, args.year, args.delay)
    elif args.command == "init":
        init_db()
        print("Database initialized.")
    else:
        # Default to yahoo sync
        sync_yahoo_data()
