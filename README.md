# ⚔️ Commish Command

**Your League. Your Rules. Your Regime.**

A fantasy football commissioner dashboard for tracking historical stats, power rankings, and league dominance.

## Features

- **Trophy Case**: All-time champions with records
- **Power Rankings**: Calculated scores based on titles and win percentage
- **Season Standings**: Year-by-year standings with full stats
- **Member Profiles**: Individual player statistics across all seasons
- **Records**: All-time bests and worsts
- **Matchups**: Closest games, biggest blowouts, high/low scores

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Python, FastAPI, SQLAlchemy
- **Database**: SQLite
- **Data Source**: Yahoo Fantasy Sports API

---

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 20+ (22 recommended)
- Yahoo Developer App credentials

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your Yahoo credentials
```

### Frontend Setup

```bash
cd frontend
npm install
```

### Running Locally

```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
uvicorn api.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

Visit http://localhost:3000

### Syncing Data from Yahoo

```bash
cd backend
source venv/bin/activate

# First time: authenticate with Yahoo
python ../scripts/setup_yahoo_auth.py

# Sync data
python ../scripts/sync_data.py yahoo --filter "your league name"
```

---

## Deployment

### Option 1: Railway (Backend) + Vercel (Frontend)

This is the recommended deployment approach.

#### Backend on Railway

1. Create a [Railway](https://railway.app) account
2. Create a new project and select "Deploy from GitHub repo"
3. Connect your GitHub repo and select the `backend` folder as root
4. Railway will auto-detect the Dockerfile
5. Add environment variables:
   - `YAHOO_CLIENT_ID`: Your Yahoo app client ID
   - `YAHOO_CLIENT_SECRET`: Your Yahoo app client secret
6. Deploy! Railway will give you a URL like `https://your-app.up.railway.app`

**Important**: After deploying, you'll need to upload your database file with synced data.

#### Frontend on Vercel

1. Create a [Vercel](https://vercel.com) account
2. Import your GitHub repo
3. Set the root directory to `frontend`
4. Add environment variable:
   - `NEXT_PUBLIC_API_URL`: Your Railway backend URL (e.g., `https://your-app.up.railway.app`)
5. Deploy!

---

## Project Structure

```
├── backend/
│   ├── api/              # FastAPI routes
│   ├── data_ingestion/   # Yahoo API client
│   ├── models/           # SQLAlchemy models
│   ├── analytics/        # Stats calculations
│   ├── Dockerfile        # Railway deployment
│   └── requirements.txt
├── frontend/
│   ├── app/              # Next.js pages
│   ├── components/       # React components
│   └── vercel.json       # Vercel config
├── scripts/
│   ├── setup_yahoo_auth.py
│   └── sync_data.py
└── data/
    └── *.db              # SQLite database
```

---

## Yahoo API Setup

1. Go to [Yahoo Developer Network](https://developer.yahoo.com/apps/)
2. Create a new app
3. Set redirect URI to `oob` (out of band)
4. Note your Client ID and Client Secret
5. Add them to `backend/.env`

---

## License

MIT - Use this for your own league!
