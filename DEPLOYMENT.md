# Budget Tracker - Deployment Guide

## Overview
This guide covers deploying the Budget Tracker app to production.

## Architecture
- **Frontend**: React + Vite → Vercel
- **Backend**: FastAPI + SQLite → Railway or Render
- **Database**: SQLite (for development) or PostgreSQL (for production)

---

## Frontend Deployment (Vercel)

### 1. Prepare Frontend
```bash
cd frontend
npm run build
```

### 2. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variable
vercel env add VITE_API_URL
# Enter: https://your-backend-url.com/api
```

### 3. Configure Vercel
Create `frontend/vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

---

## Backend Deployment (Railway)

### 1. Prepare Backend

Update `backend/app/core/config.py` for production:
```python
class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./budget_tracker.db"
    # For PostgreSQL:
    # DATABASE_URL: str  # Will be set by Railway

    SECRET_KEY: str  # Set via environment variable
    GEMINI_API_KEY: Optional[str] = None  # Set via environment variable

    CORS_ORIGINS: list[str] = ["https://your-frontend.vercel.app"]
```

### 2. Create `runtime.txt`
```
python-3.11.0
```

### 3. Create `Procfile`
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### 4. Deploy to Railway
1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Set Root Directory: `backend`
5. Add environment variables:
   - `SECRET_KEY`: Generate with `openssl rand -hex 32`
   - `GEMINI_API_KEY`: Your Gemini API key
   - `CORS_ORIGINS`: `["https://your-frontend.vercel.app"]`

### 5. Optional: Add PostgreSQL
1. In Railway, click "+ New" → "Database" → "PostgreSQL"
2. Railway will auto-set `DATABASE_URL`
3. Update requirements.txt:
```
psycopg2-binary==2.9.9
```
4. Update config.py to use PostgreSQL URL

---

## Alternative: Backend on Render

### 1. Create `render.yaml`
```yaml
services:
  - type: web
    name: budget-tracker-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: SECRET_KEY
        generateValue: true
      - key: PYTHON_VERSION
        value: 3.11.0
```

### 2. Deploy
1. Go to [Render.com](https://render.com)
2. New → Web Service
3. Connect repository
4. Set root directory: `backend`
5. Add environment variables

---

## Environment Variables Summary

### Backend
| Variable | Required | Description |
|----------|----------|-------------|
| SECRET_KEY | Yes | JWT secret (min 32 chars) |
| DATABASE_URL | Auto | Set by Railway/Render |
| GEMINI_API_KEY | No | For AI advisor |
| CORS_ORIGINS | Yes | Frontend URL |

### Frontend
| Variable | Required | Description |
|----------|----------|-------------|
| VITE_API_URL | Yes | Backend API URL |

---

## Post-Deployment

### 1. Test the App
- Visit frontend URL
- Register a new account
- Create transactions
- Test all features

### 2. Generate Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Add to backend environment

### 3. Monitor Logs
```bash
# Vercel
vercel logs

# Railway
# View in dashboard

# Render
# View in dashboard
```

---

## Database Migrations (Optional)

For PostgreSQL, use Alembic:

```bash
# Install
pip install alembic

# Initialize
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Initial"

# Run migration
alembic upgrade head
```

---

## Security Checklist

- [ ] Change SECRET_KEY from default
- [ ] Set strong SECRET_KEY (32+ chars)
- [ ] Configure CORS_ORIGINS correctly
- [ ] Use HTTPS for production
- [ ] Set DEBUG=False in production
- [ ] Secure Gemini API key
- [ ] Regular backups of database

---

## Troubleshooting

### CORS Errors
- Check CORS_ORIGINS includes your frontend URL
- Ensure URL includes protocol (https://)

### Database Errors
- For SQLite: Check file permissions
- For PostgreSQL: Verify DATABASE_URL

### Build Errors
- Check Node.js version (20.19+ or 22.12+)
- Check Python version (3.11+)
- Clear cache: `npm run build -- --force`

---

## Scaling

### Database
- SQLite: Good for <1000 users
- PostgreSQL: Recommended for production
- Consider: Supabase for managed PostgreSQL

### Backend
- Railway: Auto-scales
- Render: Manual scaling in settings
- Consider: Redis for caching

### Frontend
- Vercel: Auto-scales globally
- CDN included

---

## Cost Estimate

### Free Tier
- **Vercel**: Free for hobby projects
- **Railway**: $5/month credit
- **Render**: Free tier available
- **Gemini API**: 60 requests/minute free

### Paid (for production)
- **Vercel Pro**: $20/month
- **Railway**: ~$5-20/month
- **Render**: ~$7/month
- **PostgreSQL (Supabase)**: Free up to 500MB

---

## Backup & Recovery

### SQLite Backup
```bash
# Copy database file
cp budget_tracker.db budget_tracker.backup.db
```

### PostgreSQL Backup
```bash
# Export
pg_dump DATABASE_URL > backup.sql

# Import
psql DATABASE_URL < backup.sql
```

---

## Support

For issues:
1. Check logs first
2. Verify environment variables
3. Test locally with same config
4. Check GitHub issues

Happy deploying! 🚀
