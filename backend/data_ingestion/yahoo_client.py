"""
Yahoo Fantasy API Client

Wrapper for yahoo-fantasy-api that provides methods to fetch
league data, matchups, standings, and historical information.
"""

import json
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, asdict

from yahoo_oauth import OAuth2
from yahoo_fantasy_api import Game, League, Team

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import settings, BACKEND_DIR


@dataclass
class MatchupResult:
    """Represents a single matchup result."""
    season: int
    week: int
    team1_id: str
    team1_name: str
    team1_manager: str
    team1_score: float
    team2_id: str
    team2_name: str
    team2_manager: str
    team2_score: float
    is_playoff: bool
    is_championship: bool
    winner_id: str


@dataclass
class StandingEntry:
    """Represents a team's standing in a season."""
    season: int
    rank: int
    team_id: str
    team_name: str
    manager_name: str
    wins: int
    losses: int
    ties: int
    points_for: float
    points_against: float
    is_champion: bool
    playoff_seed: Optional[int] = None


@dataclass 
class DraftPick:
    """Represents a draft pick."""
    season: int
    round: int
    pick: int
    team_id: str
    team_name: str
    manager_name: str
    player_id: str
    player_name: str
    player_position: str
    player_team: str = ""  # NFL team abbreviation (e.g. "SEA", "SF")


@dataclass
class Transaction:
    """Represents a waiver/trade transaction."""
    season: int
    timestamp: datetime
    type: str  # 'add', 'drop', 'trade'
    team_id: str
    team_name: str
    manager_name: str
    player_id: str
    player_name: str
    details: str


class YahooFantasyClient:
    """Client for interacting with Yahoo Fantasy API."""
    
    def __init__(self):
        """Initialize the Yahoo Fantasy client."""
        self.oauth = None
        self.game = None
        self._league_cache = {}
        
    def connect(self) -> bool:
        """Establish connection to Yahoo Fantasy API."""
        oauth_file = BACKEND_DIR / "oauth2.json"
        
        if not oauth_file.exists():
            raise FileNotFoundError(
                "OAuth credentials not found. Run: python -m scripts.setup_yahoo_auth"
            )
        
        self.oauth = OAuth2(None, None, from_file=str(oauth_file))
        
        if not self.oauth.token_is_valid():
            self.oauth.refresh_access_token()
        
        self.game = Game(self.oauth, 'nfl')
        return True
    
    def get_league_ids(self) -> List[str]:
        """Get all league IDs the user has access to."""
        if not self.game:
            self.connect()
        
        return self.game.league_ids()
    
    def get_league(self, league_id: str) -> League:
        """Get a league object, with caching."""
        if league_id not in self._league_cache:
            if not self.game:
                self.connect()
            self._league_cache[league_id] = self.game.to_league(league_id)
        
        return self._league_cache[league_id]
    
    def get_league_info(self, league_id: str) -> Dict[str, Any]:
        """Get basic league information."""
        league = self.get_league(league_id)
        settings = league.settings()
        
        # Helper for safe int conversion
        def safe_int(val, default=0):
            if val is None or val == '':
                return default
            try:
                return int(val)
            except (ValueError, TypeError):
                return default
        
        return {
            "league_id": league_id,
            "name": str(settings.get("name", "Unknown")),
            "season": self._extract_season(league_id),
            "num_teams": safe_int(settings.get("num_teams", 0)),
            "scoring_type": str(settings.get("scoring_type", "head")),
            "current_week": safe_int(settings.get("current_week", 0)),
            "start_week": safe_int(settings.get("start_week", 1)),
            "end_week": safe_int(settings.get("end_week", 16)),
            "playoff_start_week": safe_int(settings.get("playoff_start_week", 14)),
        }
    
    def get_standings(self, league_id: str) -> List[StandingEntry]:
        """Get standings for a league."""
        league = self.get_league(league_id)
        standings_data = league.standings()
        
        # Also get teams data to get manager names (not in standings)
        teams_data = league.teams()
        team_managers = {}
        if teams_data:
            for team_key, team_info in teams_data.items():
                if isinstance(team_info, dict):
                    managers = team_info.get("managers", [])
                    if managers and isinstance(managers, list) and len(managers) > 0:
                        mgr = managers[0]
                        if isinstance(mgr, dict) and "manager" in mgr:
                            mgr_info = mgr["manager"]
                            if isinstance(mgr_info, dict):
                                team_managers[team_key] = mgr_info.get("nickname", "Unknown")
        
        # Extract season from league_id (format: xxx.l.xxxxx)
        season = self._extract_season(league_id)
        
        # Helper functions for safe type conversion
        def safe_int(val, default=0):
            if val is None or val == '':
                return default
            try:
                return int(val)
            except (ValueError, TypeError):
                return default
        
        def safe_float(val, default=0.0):
            if val is None or val == '':
                return default
            try:
                return float(val)
            except (ValueError, TypeError):
                return default
        
        def safe_str(val, default=""):
            if val is None:
                return default
            return str(val)
        
        def safe_get(obj, key, default=None):
            """Safely get from dict, handling non-dict objects."""
            if isinstance(obj, dict):
                return obj.get(key, default)
            return default
        
        standings = []
        for team_data in standings_data:
            # Skip non-dict entries
            if not isinstance(team_data, dict):
                continue
            
            # Data can be at top level or nested under "team"
            if "team" in team_data and isinstance(team_data.get("team"), dict):
                team_info = team_data["team"]
            elif "team" in team_data and isinstance(team_data.get("team"), list):
                # Old format: list of dicts
                team_dict = {}
                for item in team_data["team"]:
                    if isinstance(item, dict):
                        team_dict.update(item)
                team_info = team_dict
            else:
                # Data is at top level (newer API format)
                team_info = team_data
            
            # Get wins/losses from either direct fields or outcome_totals
            outcome_totals = safe_get(team_info, "outcome_totals", {})
            if not isinstance(outcome_totals, dict):
                outcome_totals = {}
            
            # Use rank from data if available, otherwise derive from position
            rank = safe_int(safe_get(team_info, "rank", 0))
            
            team_key = safe_str(safe_get(team_info, "team_key", ""))
            manager_name = team_managers.get(team_key, "Unknown")
            
            standings.append(StandingEntry(
                season=season,
                rank=rank,
                team_id=team_key,
                team_name=safe_str(safe_get(team_info, "name", "Unknown")),
                manager_name=manager_name,
                wins=safe_int(safe_get(team_info, "wins")) or safe_int(safe_get(outcome_totals, "wins", 0)),
                losses=safe_int(safe_get(team_info, "losses")) or safe_int(safe_get(outcome_totals, "losses", 0)),
                ties=safe_int(safe_get(team_info, "ties")) or safe_int(safe_get(outcome_totals, "ties", 0)),
                points_for=safe_float(safe_get(team_info, "points_for", 0)),
                points_against=safe_float(safe_get(team_info, "points_against", 0)),
                is_champion=(rank == 1),  # Based on final standings rank
                playoff_seed=safe_int(safe_get(team_info, "playoff_seed")) or None,
            ))
        
        return standings
    
    def get_matchups(self, league_id: str, week: int) -> List[MatchupResult]:
        """Get matchups for a specific week."""
        league = self.get_league(league_id)
        
        try:
            raw_data = league.matchups(week=week)
        except Exception as e:
            print(f"Error fetching matchups for week {week}: {e}")
            return []
        
        if not raw_data:
            return []
        
        season = self._extract_season(league_id)
        league_info = self.get_league_info(league_id)
        playoff_start = league_info.get("playoff_start_week", 14)
        
        # Get teams for manager names
        teams_data = league.teams()
        team_managers = {}
        if teams_data:
            for team_key, team_info in teams_data.items():
                if isinstance(team_info, dict):
                    managers = team_info.get("managers", [])
                    if managers and isinstance(managers, list) and len(managers) > 0:
                        mgr = managers[0]
                        if isinstance(mgr, dict) and "manager" in mgr:
                            mgr_info = mgr["manager"]
                            if isinstance(mgr_info, dict):
                                team_managers[team_key] = mgr_info.get("nickname", "Unknown")
        
        # Navigate the nested Yahoo API structure
        # Structure: fantasy_content.league[1].scoreboard.0.matchups.{0,1,2...}.matchup
        matchups = []
        try:
            fc = raw_data.get('fantasy_content', {})
            league_data = fc.get('league', [])
            if len(league_data) < 2:
                return []
            
            scoreboard = league_data[1].get('scoreboard', {})
            matchup_container = scoreboard.get('0', {}).get('matchups', {})
            
            # Iterate through numbered matchup keys (0, 1, 2, etc.)
            count = matchup_container.get('count', 0)
            for i in range(int(count)):
                matchup_data = matchup_container.get(str(i), {}).get('matchup', {})
                if not matchup_data:
                    continue
                
                # Get matchup metadata
                is_playoffs = matchup_data.get('is_playoffs', '0') == '1'
                is_consolation = matchup_data.get('is_consolation', '0') == '1'
                winner_key = matchup_data.get('winner_team_key', '')
                
                # Get teams from the matchup
                teams_container = matchup_data.get('0', {}).get('teams', {})
                
                team1_info = self._parse_matchup_team(teams_container.get('0', {}))
                team2_info = self._parse_matchup_team(teams_container.get('1', {}))
                
                # Get manager names
                team1_manager = team_managers.get(team1_info['team_key'], team1_info.get('manager', 'Unknown'))
                team2_manager = team_managers.get(team2_info['team_key'], team2_info.get('manager', 'Unknown'))
                
                is_playoff = week >= playoff_start or is_playoffs
                
                matchups.append(MatchupResult(
                    season=season,
                    week=week,
                    team1_id=str(team1_info.get('team_key', '')),
                    team1_name=str(team1_info.get('name', 'Unknown')),
                    team1_manager=str(team1_manager),
                    team1_score=float(team1_info.get('score', 0)),
                    team2_id=str(team2_info.get('team_key', '')),
                    team2_name=str(team2_info.get('name', 'Unknown')),
                    team2_manager=str(team2_manager),
                    team2_score=float(team2_info.get('score', 0)),
                    is_playoff=is_playoff,
                    is_championship=False,  # Will determine from playoff bracket later
                    winner_id=str(winner_key),
                ))
        except Exception as e:
            print(f"Error parsing matchups for week {week}: {e}")
            return []
        
        return matchups
    
    def _parse_matchup_team(self, team_data: dict) -> dict:
        """Parse team data from Yahoo's nested matchup structure."""
        result = {
            'team_key': '',
            'name': 'Unknown',
            'manager': 'Unknown',
            'score': 0.0
        }
        
        if not isinstance(team_data, dict):
            return result
        
        team_list = team_data.get('team', [])
        if not isinstance(team_list, list) or len(team_list) < 2:
            return result
        
        # team_list[0] is a list of dicts with team info
        # team_list[1] is a dict with team_points
        
        # Parse team info from first element (list of dicts)
        if isinstance(team_list[0], list):
            for item in team_list[0]:
                if isinstance(item, dict):
                    if 'team_key' in item:
                        result['team_key'] = item['team_key']
                    if 'name' in item:
                        result['name'] = item['name']
                    if 'managers' in item:
                        managers = item['managers']
                        if isinstance(managers, list) and len(managers) > 0:
                            mgr = managers[0]
                            if isinstance(mgr, dict) and 'manager' in mgr:
                                result['manager'] = mgr['manager'].get('nickname', 'Unknown')
        
        # Parse score from second element
        if isinstance(team_list[1], dict):
            team_points = team_list[1].get('team_points', {})
            if isinstance(team_points, dict):
                total = team_points.get('total', '0')
                try:
                    result['score'] = float(total)
                except (ValueError, TypeError):
                    result['score'] = 0.0
        
        return result
    
    def get_all_matchups(self, league_id: str) -> List[MatchupResult]:
        """Get all matchups for a league (all weeks)."""
        league_info = self.get_league_info(league_id)
        start_week = league_info.get("start_week", 1)
        end_week = league_info.get("end_week", 17)
        current_week = league_info.get("current_week", end_week)
        
        # Only fetch up to current week
        end_week = min(end_week, current_week)
        
        print(f"  Fetching matchups for weeks {start_week}-{end_week}...", end="", flush=True)
        
        all_matchups = []
        for week in range(start_week, end_week + 1):
            matchups = self.get_matchups(league_id, week)
            all_matchups.extend(matchups)
            print(".", end="", flush=True)
            time.sleep(0.3)  # Rate limiting
        
        print(f" ({len(all_matchups)} matchups)", flush=True)
        return all_matchups
    
    def get_draft_results(self, league_id: str) -> List[DraftPick]:
        """Get draft results for a league with team/manager names populated.

        The yahoo_fantasy_api library's draft_results() returns flat dicts:
            {'pick': 1, 'round': 1, 'team_key': '388.l.27081.t.4', 'player_id': 9490}
        Player names/positions require a separate player_details() call.
        """
        league = self.get_league(league_id)
        season = self._extract_season(league_id)
        
        try:
            draft_data = league.draft_results()
        except Exception as e:
            print(f"  Error fetching draft results: {e}")
            return []
        
        if not draft_data:
            print(f"  No draft data available")
            return []
        
        # Build team lookup for populating names
        teams = self.get_teams(league_id)
        team_lookup: Dict[str, Dict[str, str]] = {}
        for t in teams:
            team_lookup[t["team_key"]] = {"name": t["name"], "manager": t["manager"]}
        
        # Collect player IDs and batch-fetch details (names, positions)
        player_ids = []
        for p in draft_data:
            if isinstance(p, dict) and p.get("player_id") is not None:
                try:
                    player_ids.append(int(p["player_id"]))
                except (ValueError, TypeError):
                    pass
        
        player_details_map: Dict[int, Dict] = {}
        if player_ids:
            # Fetch in batches of 25 (library handles batching internally,
            # but we wrap in try/except per batch for resilience)
            batch_size = 25
            print(f"  Fetching player details for {len(player_ids)} picks...", end="", flush=True)
            for i in range(0, len(player_ids), batch_size):
                batch = player_ids[i:i + batch_size]
                try:
                    details_list = league.player_details(batch)
                    for detail in details_list:
                        if isinstance(detail, dict):
                            pid = detail.get("player_id")
                            if pid is not None:
                                player_details_map[int(pid)] = detail
                    print(".", end="", flush=True)
                except Exception as e:
                    # Some players may no longer exist in Yahoo's system
                    # (especially older seasons). Skip the batch gracefully.
                    print(f"x", end="", flush=True)
                time.sleep(0.3)
            print(f" got {len(player_details_map)} of {len(player_ids)}", flush=True)
        
        def safe_int(val, default=0):
            if val is None or val == '':
                return default
            try:
                return int(val)
            except (ValueError, TypeError):
                return default
        
        picks = []
        for pick_data in draft_data:
            if not isinstance(pick_data, dict):
                continue
            
            # draft_results() returns flat dicts — no wrapper key
            team_key = str(pick_data.get("team_key", ""))
            team_info = team_lookup.get(team_key, {})
            player_id = pick_data.get("player_id")
            
            round_num = safe_int(pick_data.get("round"))
            pick_num = safe_int(pick_data.get("pick"))
            
            if round_num == 0 and pick_num == 0:
                continue  # Skip empty/invalid picks
            
            # Look up player name and position from details
            pid_int = safe_int(player_id) if player_id is not None else 0
            player_info = player_details_map.get(pid_int, {})
            
            name_data = player_info.get("name", {})
            if isinstance(name_data, dict):
                player_name = name_data.get("full", f"Player #{pid_int}")
            else:
                player_name = str(name_data) if name_data else f"Player #{pid_int}"
            
            player_position = str(
                player_info.get("display_position")
                or player_info.get("primary_position")
                or ""
            )
            
            # NFL team abbreviation (e.g. "SEA", "SF", "GB")
            player_nfl_team = str(
                player_info.get("editorial_team_abbr")
                or player_info.get("editorial_team_key", "")
            ).upper()
            
            picks.append(DraftPick(
                season=season,
                round=round_num,
                pick=pick_num,
                team_id=team_key,
                team_name=team_info.get("name", ""),
                manager_name=team_info.get("manager", ""),
                player_id=str(player_id) if player_id is not None else "",
                player_name=player_name,
                player_position=player_position,
                player_team=player_nfl_team,
            ))
        
        if picks:
            print(f"  Fetched {len(picks)} draft picks")
        
        return picks
    
    def get_transactions(self, league_id: str) -> List[Transaction]:
        """Get transaction history for a league (adds, drops, trades, waivers).

        The yahoo_fantasy_api library's transactions(tran_types, count) returns
        flat dicts that merge transaction metadata with player data:
            {'type': 'add', 'timestamp': '...', 'players': {...}, ...}
        """
        league = self.get_league(league_id)
        season = self._extract_season(league_id)
        
        # Build team lookup
        teams = self.get_teams(league_id)
        team_lookup: Dict[str, Dict[str, str]] = {}
        for t in teams:
            team_lookup[t["team_key"]] = {"name": t["name"], "manager": t["manager"]}
        
        transactions = []
        
        # Fetch different transaction types
        # The library requires (tran_types: str, count: str) arguments
        for tran_type in ["add,drop", "trade"]:
            try:
                raw_transactions = league.transactions(tran_type, "")
            except Exception as e:
                print(f"  Error fetching {tran_type} transactions: {e}")
                continue
            
            if not raw_transactions:
                continue
            
            for tx_data in raw_transactions:
                if not isinstance(tx_data, dict):
                    continue
                
                tx_type = str(tx_data.get("type", "unknown"))
                timestamp_str = tx_data.get("timestamp")
                try:
                    ts = datetime.fromtimestamp(int(timestamp_str)) if timestamp_str else datetime.utcnow()
                except (ValueError, TypeError):
                    ts = datetime.utcnow()
                
                # For trades, capture trader/tradee info
                trader_team_key = str(tx_data.get("trader_team_key", ""))
                tradee_team_key = str(tx_data.get("tradee_team_key", ""))
                
                # Players are merged at top level as numbered keys
                # e.g. tx_data["0"], tx_data["1"], etc. with tx_data["count"]
                players_count = 0
                if "count" in tx_data:
                    try:
                        players_count = int(tx_data["count"])
                    except (ValueError, TypeError):
                        pass
                
                # Also check for a nested "players" dict (format can vary)
                players_container = tx_data
                if "players" in tx_data and isinstance(tx_data["players"], dict):
                    players_container = tx_data["players"]
                    if "count" in players_container:
                        try:
                            players_count = int(players_container["count"])
                        except (ValueError, TypeError):
                            pass
                
                if players_count == 0:
                    # Try to find numbered keys directly
                    for k in tx_data.keys():
                        if k.isdigit():
                            players_count = max(players_count, int(k) + 1)
                
                for i in range(players_count):
                    player_entry = players_container.get(str(i), {})
                    if not isinstance(player_entry, dict):
                        continue
                    
                    player_list = player_entry.get("player", [])
                    
                    # player_list is typically [list_of_info_dicts, {transaction_data: {...}}]
                    player_info = {}
                    tx_inner = {}
                    
                    if isinstance(player_list, list) and len(player_list) >= 2:
                        # First element: list of dicts with player info
                        if isinstance(player_list[0], list):
                            for item in player_list[0]:
                                if isinstance(item, dict):
                                    player_info.update(item)
                        elif isinstance(player_list[0], dict):
                            player_info = player_list[0]
                        
                        # Second element: dict with transaction_data
                        if isinstance(player_list[1], dict):
                            td = player_list[1].get("transaction_data", {})
                            if isinstance(td, dict):
                                tx_inner = td
                            elif isinstance(td, list):
                                for item in td:
                                    if isinstance(item, dict):
                                        tx_inner.update(item)
                    elif isinstance(player_list, dict):
                        player_info = player_list
                    
                    # Extract player name
                    name_data = player_info.get("name", {})
                    if isinstance(name_data, dict):
                        player_name = name_data.get("full", "Unknown")
                    else:
                        player_name = str(name_data) if name_data else "Unknown"
                    
                    player_id = str(player_info.get("player_key", ""))
                    player_position = str(player_info.get("display_position", ""))
                    
                    # Determine action type and team from transaction_data
                    action_type = str(tx_inner.get("type", tx_type))
                    dest_team_key = str(
                        tx_inner.get("destination_team_key", "")
                        or tx_inner.get("source_team_key", "")
                    )
                    
                    # Fallback for trades
                    if not dest_team_key and trader_team_key:
                        dest_team_key = trader_team_key
                    
                    team_key = dest_team_key
                    team_info = team_lookup.get(team_key, {})
                    
                    transactions.append(Transaction(
                        season=season,
                        timestamp=ts,
                        type=str(action_type),
                        team_id=team_key,
                        team_name=team_info.get("name", ""),
                        manager_name=team_info.get("manager", ""),
                        player_id=player_id,
                        player_name=player_name,
                        details=json.dumps({
                            "transaction_type": tx_type,
                            "action": action_type,
                        }),
                    ))
            
            time.sleep(0.5)  # Rate limiting between transaction types
        
        if transactions:
            print(f"  Fetched {len(transactions)} transactions")
        
        return transactions
    
    def get_player_stats_for_draft(self, league_id: str, player_ids: List[str],
                                     delay: float = 0.5) -> Dict[str, Dict[str, Any]]:
        """
        Fetch season stats for drafted players in batches.
        
        Args:
            league_id: Yahoo league ID (e.g. "390.l.123456")
            player_ids: List of raw Yahoo player ID strings (e.g. ["9490", "25802"])
            delay: Seconds to wait between API calls for rate limiting
            
        Returns:
            Dict mapping player_id -> {"season_points": float|None, "adp": float|None}
        """
        league = self.get_league(league_id)
        game_id = league_id.split(".")[0]  # e.g. "390" from "390.l.123456"
        
        # Build full player keys: "390.p.9490"
        player_keys = []
        key_to_raw_id = {}
        for pid in player_ids:
            if not pid:
                continue
            player_key = f"{game_id}.p.{pid}"
            player_keys.append(player_key)
            key_to_raw_id[player_key] = pid
        
        results: Dict[str, Dict[str, Any]] = {}
        total = len(player_keys)
        if total == 0:
            return results
        
        batch_size = 25
        stats_fetched = 0
        adp_fetched = 0
        errors = 0
        
        print(f"  Fetching season stats for {total} players in batches of {batch_size}...",
              end="", flush=True)
        
        # ── Pass 1: Batch-fetch season points via player_stats() ──
        for i in range(0, total, batch_size):
            batch = player_keys[i:i + batch_size]
            try:
                stats_data = league.player_stats(batch, "season")
                if stats_data and isinstance(stats_data, list):
                    for stat_entry in stats_data:
                        if not isinstance(stat_entry, dict):
                            continue
                        # Response can be flat or nested under "player"
                        player_data = stat_entry.get("player", stat_entry)
                        if not isinstance(player_data, dict):
                            continue
                        
                        # Find the player key in this entry
                        pkey = str(player_data.get("player_key", ""))
                        raw_id = key_to_raw_id.get(pkey)
                        if not raw_id:
                            # Try extracting from player_id
                            pid_val = player_data.get("player_id")
                            if pid_val is not None:
                                raw_id = str(pid_val)
                        if not raw_id:
                            continue
                        
                        # Extract season points
                        season_pts = None
                        player_points = player_data.get("player_points", {})
                        if isinstance(player_points, dict):
                            total_pts = player_points.get("total")
                            if total_pts is not None:
                                try:
                                    season_pts = float(total_pts)
                                    stats_fetched += 1
                                except (ValueError, TypeError):
                                    pass
                        
                        if raw_id not in results:
                            results[raw_id] = {"season_points": None, "adp": None}
                        results[raw_id]["season_points"] = season_pts
                print(".", end="", flush=True)
            except Exception as e:
                errors += 1
                print("x", end="", flush=True)
            
            time.sleep(delay)
        
        print(f" stats:{stats_fetched}", end="", flush=True)
        
        # ── Pass 2: Batch-fetch ADP via player_details() ──
        print(" ADP", end="", flush=True)
        for i in range(0, total, batch_size):
            batch_keys = player_keys[i:i + batch_size]
            # player_details expects integer player IDs
            batch_int_ids = []
            for pk in batch_keys:
                try:
                    batch_int_ids.append(int(pk.split(".p.")[1]))
                except (ValueError, IndexError):
                    pass
            
            if not batch_int_ids:
                continue
                
            try:
                details_list = league.player_details(batch_int_ids)
                if details_list and isinstance(details_list, list):
                    for detail in details_list:
                        if not isinstance(detail, dict):
                            continue
                        
                        pid_val = detail.get("player_id")
                        raw_id = str(pid_val) if pid_val is not None else None
                        if not raw_id:
                            continue
                        
                        # Extract ADP from draft_analysis
                        draft_analysis = detail.get("draft_analysis", {})
                        if isinstance(draft_analysis, dict):
                            avg_pick = draft_analysis.get("average_pick")
                            if avg_pick is not None:
                                try:
                                    adp_val = float(avg_pick)
                                    if raw_id not in results:
                                        results[raw_id] = {"season_points": None, "adp": None}
                                    results[raw_id]["adp"] = adp_val
                                    adp_fetched += 1
                                except (ValueError, TypeError):
                                    pass
                print(".", end="", flush=True)
            except Exception:
                errors += 1
                print("x", end="", flush=True)
            
            time.sleep(delay)
        
        print(f" adp:{adp_fetched} errors:{errors} done", flush=True)
        return results
    
    def get_player_nfl_teams(self, league_id: str, player_ids: List[str],
                              delay: float = 0.3) -> Dict[str, str]:
        """
        Fetch NFL team abbreviations for a list of player IDs.
        
        Uses the same player_details() approach that works in get_draft_results().
        
        Args:
            league_id: Yahoo league ID
            player_ids: List of raw Yahoo player ID strings (e.g. ["9490", "25802"])
            delay: Seconds between batches
            
        Returns:
            Dict mapping player_id -> NFL team abbreviation (e.g. "SEA", "SF")
        """
        league = self.get_league(league_id)
        
        # Convert string IDs to ints for player_details()
        int_ids = []
        for pid in player_ids:
            if not pid:
                continue
            try:
                int_ids.append(int(pid))
            except (ValueError, TypeError):
                pass
        
        results: Dict[str, str] = {}
        batch_size = 25
        total = len(int_ids)
        fetched = 0
        
        if total == 0:
            return results
        
        print(f"  Fetching NFL teams for {total} players...", end="", flush=True)
        
        for i in range(0, total, batch_size):
            batch = int_ids[i:i + batch_size]
            try:
                details_list = league.player_details(batch)
                for detail in details_list:
                    if not isinstance(detail, dict):
                        continue
                    pid = detail.get("player_id")
                    if pid is None:
                        continue
                    
                    nfl_team = str(
                        detail.get("editorial_team_abbr")
                        or detail.get("editorial_team_key", "")
                    ).upper()
                    
                    if nfl_team:
                        results[str(pid)] = nfl_team
                        fetched += 1
                print(".", end="", flush=True)
            except Exception:
                print("x", end="", flush=True)
            time.sleep(delay)
        
        print(f" got {fetched} of {total}", flush=True)
        return results

    def get_teams(self, league_id: str) -> List[Dict[str, Any]]:
        """Get all teams in a league."""
        league = self.get_league(league_id)
        teams_data = league.teams()
        
        teams = []
        if not isinstance(teams_data, dict):
            return teams
            
        for team_key, team_info in teams_data.items():
            if not isinstance(team_info, dict):
                continue
            
            # Safely get logo URL
            logo_url = ""
            team_logos = team_info.get("team_logos", [])
            if isinstance(team_logos, list) and len(team_logos) > 0:
                first_logo = team_logos[0]
                if isinstance(first_logo, dict):
                    logo_url = str(first_logo.get("url", ""))
            
            teams.append({
                "team_key": str(team_key),
                "team_id": str(team_key),
                "name": str(team_info.get("name", "Unknown")),
                "manager": self._extract_manager_name(team_info),
                "logo_url": logo_url,
            })
        
        return teams
    
    def get_matching_league_ids(self, league_name_filter: str = "top pot") -> List[Dict[str, Any]]:
        """
        Get league IDs and metadata for leagues matching the name filter.
        
        Returns list of dicts with league_id, season, and name.
        """
        all_league_ids = self.get_league_ids()
        matching = []
        for league_id in all_league_ids:
            try:
                league_info = self.get_league_info(league_id)
                league_name = league_info.get("name", "").lower()
                if league_name_filter.lower() in league_name:
                    matching.append({
                        "league_id": league_id,
                        "season": league_info.get("season"),
                        "name": league_info.get("name"),
                    })
            except Exception:
                continue
        return sorted(matching, key=lambda x: x.get("season", 0))

    def get_all_historical_data(self, league_name_filter: str = "top pot") -> Dict[str, Any]:
        """
        Fetch all historical data for leagues matching the filter.
        
        Args:
            league_name_filter: Case-insensitive filter for league names
            
        Returns:
            Dictionary containing all league data organized by season
        """
        all_league_ids = self.get_league_ids()
        
        historical_data = {
            "leagues": [],
            "standings": [],
            "matchups": [],
            "teams": [],
            "draft_picks": [],
            "transactions": [],
        }
        
        print(f"Found {len(all_league_ids)} total leagues", flush=True)
        
        for league_id in all_league_ids:
            try:
                league_info = self.get_league_info(league_id)
                league_name = league_info.get("name", "").lower()
                
                # Filter by league name
                if league_name_filter.lower() not in league_name:
                    continue
                
                print(f"Processing: {league_info.get('name')} ({league_info.get('season')})", flush=True)
                
                historical_data["leagues"].append(league_info)
                
                # Get standings
                standings = self.get_standings(league_id)
                historical_data["standings"].extend([asdict(s) for s in standings])
                
                # Get teams
                teams = self.get_teams(league_id)
                historical_data["teams"].extend(teams)
                
                # Get matchups (with rate limiting)
                matchups = self.get_all_matchups(league_id)
                historical_data["matchups"].extend([asdict(m) for m in matchups])
                
                # Get draft results
                draft_picks = self.get_draft_results(league_id)
                historical_data["draft_picks"].extend([asdict(p) for p in draft_picks])
                
                # Get transactions
                transactions = self.get_transactions(league_id)
                historical_data["transactions"].extend([asdict(t) for t in transactions])
                
                time.sleep(1)  # Rate limiting between leagues
                
            except Exception as e:
                print(f"Error processing league {league_id}: {e}")
                continue
        
        return historical_data
    
    def _extract_season(self, league_id: str) -> int:
        """Extract season year from league ID."""
        # League ID format varies, try to extract year
        try:
            # Format like "390.l.123456" where 390 = 2019 NFL
            game_id = int(league_id.split(".")[0])
            # Yahoo game IDs: 331=2014, 348=2015, 359=2016, 371=2017, 380=2018, 390=2019, 399=2020, 406=2021, 414=2022, 423=2023, 449=2024
            game_to_year = {
                331: 2014, 348: 2015, 359: 2016, 371: 2017, 380: 2018,
                390: 2019, 399: 2020, 406: 2021, 414: 2022, 423: 2023, 
                449: 2024, 461: 2025
            }
            return game_to_year.get(game_id, 2024)
        except:
            return 2024
    
    def _extract_manager_name(self, team_info: Dict) -> str:
        """Extract manager name from team info."""
        try:
            managers = team_info.get("managers", [])
            if managers:
                if isinstance(managers, list) and len(managers) > 0:
                    manager = managers[0]
                    if isinstance(manager, dict):
                        manager_data = manager.get("manager", {})
                        if isinstance(manager_data, dict):
                            nickname = manager_data.get("nickname", "Unknown")
                            return str(nickname) if nickname else "Unknown"
        except Exception:
            pass
        return "Unknown"
    
    def _parse_team_from_matchup(self, team_data: Dict) -> Dict[str, Any]:
        """Parse team data from matchup response."""
        team = team_data.get("team", {})
        
        # Handle different response formats
        if isinstance(team, list):
            team_dict = {}
            for item in team:
                if isinstance(item, dict):
                    team_dict.update(item)
            team = team_dict
        
        # Safely extract score
        def safe_float(val, default=0.0):
            if val is None or val == '':
                return default
            try:
                return float(val)
            except (ValueError, TypeError):
                return default
        
        team_points = team.get("team_points", {})
        if isinstance(team_points, dict):
            score = safe_float(team_points.get("total", 0))
        else:
            score = 0.0
        
        return {
            "team_key": str(team.get("team_key", "")),
            "name": str(team.get("name", "Unknown")),
            "manager": self._extract_manager_name(team),
            "score": score,
        }


# CLI for testing
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Yahoo Fantasy API Client")
    parser.add_argument("--list-leagues", action="store_true", help="List all leagues")
    parser.add_argument("--league-id", type=str, help="Specific league ID to query")
    parser.add_argument("--standings", action="store_true", help="Get standings")
    parser.add_argument("--matchups", type=int, help="Get matchups for week N")
    parser.add_argument("--sync-all", action="store_true", help="Sync all Top Pot data")
    args = parser.parse_args()
    
    client = YahooFantasyClient()
    client.connect()
    
    if args.list_leagues:
        leagues = client.get_league_ids()
        print(f"\nFound {len(leagues)} leagues:")
        for lid in leagues:
            try:
                info = client.get_league_info(lid)
                print(f"  {lid}: {info.get('name')} ({info.get('season')})")
            except:
                print(f"  {lid}: (unable to fetch info)")
    
    if args.league_id:
        if args.standings:
            standings = client.get_standings(args.league_id)
            print(f"\nStandings for {args.league_id}:")
            for s in standings:
                print(f"  {s.rank}. {s.team_name} ({s.manager_name}) - {s.wins}-{s.losses}-{s.ties}")
        
        if args.matchups:
            matchups = client.get_matchups(args.league_id, args.matchups)
            print(f"\nWeek {args.matchups} matchups:")
            for m in matchups:
                winner = "→" if m.winner_id == m.team1_id else "←" if m.winner_id == m.team2_id else "="
                print(f"  {m.team1_name} ({m.team1_score}) {winner} {m.team2_name} ({m.team2_score})")
    
    if args.sync_all:
        print("\nSyncing all Top Pot league data...")
        data = client.get_all_historical_data("top pot")
        
        output_file = Path(__file__).parent.parent.parent / "data" / "yahoo_export.json"
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, "w") as f:
            json.dump(data, f, indent=2, default=str)
        
        print(f"\nData exported to: {output_file}")
        print(f"  Leagues: {len(data['leagues'])}")
        print(f"  Standings: {len(data['standings'])}")
        print(f"  Matchups: {len(data['matchups'])}")
        print(f"  Teams: {len(data['teams'])}")
        print(f"  Draft picks: {len(data['draft_picks'])}")
        print(f"  Transactions: {len(data.get('transactions', []))}")
