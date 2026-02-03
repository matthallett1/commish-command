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
    
    # Init database
    init_parser = subparsers.add_parser("init", help="Initialize the database")
    
    args = parser.parse_args()
    
    if args.command == "yahoo":
        sync_yahoo_data(args.filter, args.force)
    elif args.command == "init":
        init_db()
        print("Database initialized.")
    else:
        # Default to yahoo sync
        sync_yahoo_data()
