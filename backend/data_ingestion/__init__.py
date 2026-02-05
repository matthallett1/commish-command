"""Data ingestion modules for Top Pot Dashboard."""

from .yahoo_client import YahooFantasyClient

try:
    from .imessage_parser import iMessageParser
    __all__ = ["YahooFantasyClient", "iMessageParser"]
except ImportError:
    __all__ = ["YahooFantasyClient"]
