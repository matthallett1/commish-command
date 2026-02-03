#!/usr/bin/env python3
"""
Export SQLite data to JSON for migration to PostgreSQL.
Run this locally to export your data, then use import_data.py on Railway.
"""

import json
import sys
from pathlib import Path
from datetime import datetime

# Add backend to path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import DATA_DIR

# Connect to local SQLite
db_path = DATA_DIR / "top_pot.db"
if not db_path.exists():
    print(f"Database not found: {db_path}")
    sys.exit(1)

engine = create_engine(f"sqlite:///{db_path}")
Session = sessionmaker(bind=engine)
db = Session()

# Import models
from models.league import League, Season, Team, Member
from models.matchup import Matchup, Standing
from models.draft import DraftPick


def serialize_datetime(obj):
    """JSON serializer for datetime objects."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def export_table(model, name):
    """Export a table to a list of dicts."""
    rows = db.query(model).all()
    data = []
    for row in rows:
        row_dict = {}
        for column in row.__table__.columns:
            value = getattr(row, column.name)
            if isinstance(value, datetime):
                value = value.isoformat() if value else None
            row_dict[column.name] = value
        data.append(row_dict)
    print(f"Exported {len(data)} {name}")
    return data


# Export all tables
export_data = {
    "leagues": export_table(League, "leagues"),
    "members": export_table(Member, "members"),
    "seasons": export_table(Season, "seasons"),
    "teams": export_table(Team, "teams"),
    "matchups": export_table(Matchup, "matchups"),
    "standings": export_table(Standing, "standings"),
    "draft_picks": export_table(DraftPick, "draft_picks"),
    "exported_at": datetime.utcnow().isoformat(),
}

# Write to file
output_file = DATA_DIR / "database_export.json"
with open(output_file, "w") as f:
    json.dump(export_data, f, indent=2, default=serialize_datetime)

print(f"\nExported to: {output_file}")
print(f"Total size: {output_file.stat().st_size / 1024:.1f} KB")
print("\nNext steps:")
print("1. Commit this export file to git")
print("2. Push to GitHub")
print("3. Railway will redeploy and import the data")
