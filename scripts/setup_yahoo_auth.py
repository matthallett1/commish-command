#!/usr/bin/env python3
"""
Yahoo Fantasy API OAuth Setup Script

This script guides you through setting up OAuth authentication for the Yahoo Fantasy API.
Run this once to authorize the app and generate OAuth tokens.
"""

import json
import sys
import webbrowser
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

try:
    from yahoo_oauth import OAuth2
    from config import settings, BACKEND_DIR
except ImportError as e:
    print(f"Error importing dependencies: {e}")
    print("Please run: pip install -r backend/requirements.txt")
    sys.exit(1)


class OAuthCallbackHandler(BaseHTTPRequestHandler):
    """Handle OAuth callback from Yahoo."""
    
    def do_GET(self):
        """Handle GET request from OAuth redirect."""
        query = parse_qs(urlparse(self.path).query)
        
        if 'code' in query:
            self.server.auth_code = query['code'][0]
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            response = """
            <html>
            <head><title>Authorization Successful</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #4CAF50;">✓ Authorization Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
            </body>
            </html>
            """
            self.wfile.write(response.encode())
        else:
            self.send_response(400)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b"Authorization failed. Please try again.")
    
    def log_message(self, format, *args):
        """Suppress logging."""
        pass


def create_oauth_json():
    """Create the oauth2.json file needed by yahoo_oauth."""
    oauth_data = {
        "consumer_key": settings.yahoo_client_id,
        "consumer_secret": settings.yahoo_client_secret
    }
    
    oauth_file = BACKEND_DIR / "oauth2.json"
    with open(oauth_file, 'w') as f:
        json.dump(oauth_data, f, indent=2)
    
    print(f"Created OAuth credentials file: {oauth_file}")
    return oauth_file


def setup_oauth():
    """Main OAuth setup flow."""
    print("\n" + "=" * 60)
    print("  Top Pot Fantasy Football - Yahoo OAuth Setup")
    print("=" * 60 + "\n")
    
    # Check if credentials are configured
    if not settings.yahoo_credentials_configured:
        print("ERROR: Yahoo API credentials not found!\n")
        print("Please follow these steps:")
        print("1. Go to https://developer.yahoo.com/apps/create/")
        print("2. Create a new app with Fantasy Sports API access")
        print("3. Copy your Client ID and Client Secret")
        print("4. Create backend/.env file with:")
        print("   YAHOO_CLIENT_ID=your_client_id")
        print("   YAHOO_CLIENT_SECRET=your_client_secret")
        print("\nThen run this script again.")
        sys.exit(1)
    
    print("Yahoo credentials found!")
    print(f"  Client ID: {settings.yahoo_client_id[:8]}...")
    
    # Create oauth2.json
    oauth_file = create_oauth_json()
    
    print("\nInitializing OAuth flow...")
    print("A browser window will open for Yahoo authorization.")
    print("Please sign in and authorize the app.\n")
    
    try:
        # Initialize OAuth - this will open a browser for authorization
        oauth = OAuth2(None, None, from_file=str(oauth_file))
        
        if oauth.token_is_valid():
            print("✓ OAuth tokens are valid!")
            print(f"  Token file: {oauth_file}")
            print("\nYou're all set! The Yahoo Fantasy API is ready to use.")
        else:
            print("Refreshing tokens...")
            oauth.refresh_access_token()
            print("✓ Tokens refreshed successfully!")
            
    except Exception as e:
        print(f"\nError during OAuth setup: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure your Yahoo credentials are correct")
        print("2. Check that your app has Fantasy Sports API permissions")
        print("3. Try creating a new app at developer.yahoo.com")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("  Setup Complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Run the data sync: python -m scripts.sync_data")
    print("2. Start the API: uvicorn api.main:app --reload")
    print("3. Start the frontend: cd frontend && npm run dev")


def test_connection():
    """Test the Yahoo API connection."""
    print("\nTesting Yahoo Fantasy API connection...")
    
    oauth_file = BACKEND_DIR / "oauth2.json"
    if not oauth_file.exists():
        print("OAuth file not found. Run setup first.")
        return False
    
    try:
        from yahoo_fantasy_api import Game
        
        oauth = OAuth2(None, None, from_file=str(oauth_file))
        gm = Game(oauth, 'nfl')
        
        # Get league IDs
        league_ids = gm.league_ids()
        print(f"✓ Connected successfully!")
        print(f"  Found {len(league_ids)} league(s)")
        
        for lid in league_ids[:5]:  # Show first 5
            print(f"    - {lid}")
        
        return True
        
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Yahoo Fantasy API OAuth Setup")
    parser.add_argument("--test", action="store_true", help="Test the API connection")
    args = parser.parse_args()
    
    if args.test:
        test_connection()
    else:
        setup_oauth()
        print("\nRunning connection test...")
        test_connection()
