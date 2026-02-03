# Deployment Guide

This guide covers deploying the Top Pot Fantasy Football Dashboard to production.

## Architecture

- **Frontend**: Next.js app deployed to Vercel
- **Backend**: FastAPI deployed to Railway (or Fly.io)
- **Database**: SQLite (local) or PostgreSQL (production)

## Option 1: Vercel + Railway (Recommended)

### Backend (Railway)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy Backend**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login
   railway login
   
   # Initialize project
   railway init
   
   # Deploy
   railway up
   ```

3. **Configure Environment Variables**
   In Railway dashboard, add:
   - `YAHOO_CLIENT_ID` - Your Yahoo API client ID
   - `YAHOO_CLIENT_SECRET` - Your Yahoo API secret
   - `DATABASE_URL` - Railway provides PostgreSQL, use that URL

4. **Get API URL**
   Railway will provide a URL like: `https://top-pot-backend.railway.app`

### Frontend (Vercel)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set root directory to `frontend`
   - Add environment variable:
     - `NEXT_PUBLIC_API_URL` = Your Railway backend URL

3. **Deploy**
   Vercel will automatically deploy on push to main.

## Option 2: Docker Compose (Self-hosted)

For self-hosting on a VPS or home server:

```bash
# Clone repository
git clone your-repo-url
cd top-pot-dashboard

# Create .env file
cp backend/.env.example .env
# Edit .env with your credentials

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

Access at: `http://your-server-ip:3000`

## Option 3: Fly.io

Alternative to Railway for the backend:

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch (from backend directory)
cd backend
fly launch

# Set secrets
fly secrets set YAHOO_CLIENT_ID=xxx YAHOO_CLIENT_SECRET=xxx

# Deploy
fly deploy
```

## Database Considerations

### Development (SQLite)
- Default configuration uses SQLite
- Data stored in `data/top_pot.db`
- Good for local development and small scale

### Production (PostgreSQL)
- Recommended for production
- Railway provides PostgreSQL addon
- Update `DATABASE_URL` environment variable

To migrate:
```python
# In backend/config.py, DATABASE_URL will automatically use PostgreSQL
# when the environment variable is set to a PostgreSQL URL
```

## Data Sync

After deployment, sync your data:

```bash
# SSH into Railway
railway run python -m scripts.sync_data yahoo

# Or use the API endpoint (future feature)
curl -X POST https://your-api/api/sync
```

## SSL/HTTPS

- Vercel: Automatic HTTPS
- Railway: Automatic HTTPS
- Self-hosted: Use nginx with Let's Encrypt

## Monitoring

### Railway
- Built-in metrics dashboard
- Log streaming

### Vercel
- Analytics dashboard
- Error tracking

### Self-hosted
- Consider adding:
  - Prometheus + Grafana for metrics
  - Sentry for error tracking

## Updating

### Vercel
Push to main branch - automatic deployment

### Railway
```bash
railway up
```

### Docker
```bash
git pull
docker-compose up -d --build
```

## Troubleshooting

### Backend won't start
- Check environment variables are set
- Verify Yahoo credentials are valid
- Check database connection

### Frontend can't connect to API
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS settings in backend
- Ensure backend is running and healthy

### OAuth issues
- Re-run `python -m scripts.setup_yahoo_auth`
- Check redirect URIs match your deployment URL

## Cost Estimates

### Vercel
- Hobby (Free): Sufficient for personal use
- Pro ($20/mo): Team features, more bandwidth

### Railway
- Starter (Free): 500 hours/month, 512MB RAM
- Developer ($5/mo): Unlimited hours, more resources

### Total: Free to $25/month depending on usage
