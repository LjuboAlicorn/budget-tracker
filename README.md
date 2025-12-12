# Budget Tracker / Personal Finance App

Aplikacija za praćenje troškova i prihoda sa modernim UI i AI savetnikom.

## Features

- Kategorije troškova i prihoda
- Mesečni grafikoni i analitika
- Budžet po kategoriji + upozorenja
- Uvoz CSV bankovnih izvoda
- AI savetnik za finansije (Gemini)
- Mobilni friendly dizajn
- Deljenje sa partnerom / porodicom

## Tech Stack

**Frontend:**
- React 18 + Vite + TypeScript
- shadcn/ui (Tailwind CSS + Radix UI)
- Recharts za grafike
- Zustand za state management

**Backend:**
- Python 3.11+ + FastAPI
- SQLite + SQLAlchemy
- JWT autentifikacija
- Google Gemini AI

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- pip

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# or (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy env file and configure
cp .env.example .env
# Edit .env and set your SECRET_KEY and GEMINI_API_KEY

# Run server
uvicorn app.main:app --reload
```

Backend runs at: http://localhost:8000
API docs: http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy env file
cp .env.example .env

# Run development server
npm run dev
```

Frontend runs at: http://localhost:5173

## Project Structure

```
budget-tracker/
├── frontend/                 # React + Vite app
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   └── ui/           # shadcn components
│   │   ├── pages/            # Route pages
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities, API client
│   │   ├── stores/           # Zustand state
│   │   └── types/            # TypeScript types
│   └── ...
│
├── backend/                  # FastAPI app
│   ├── app/
│   │   ├── api/              # API routes
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   └── core/             # Config, security
│   └── ...
│
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Registracija
- `POST /api/auth/login` - Prijava
- `GET /api/auth/me` - Trenutni korisnik

### Transactions
- `GET /api/transactions` - Lista transakcija
- `POST /api/transactions` - Nova transakcija
- `PUT /api/transactions/{id}` - Izmena
- `DELETE /api/transactions/{id}` - Brisanje

### Categories
- `GET /api/categories` - Lista kategorija
- `POST /api/categories` - Nova kategorija

### Budgets
- `GET /api/budgets` - Lista budžeta
- `POST /api/budgets` - Novi budžet
- `GET /api/budgets/status` - Status budžeta

### Analytics
- `GET /api/analytics/monthly` - Mesečni pregled
- `GET /api/analytics/categories` - Po kategorijama
- `GET /api/analytics/trends` - Trendovi

### AI
- `POST /api/ai/analyze` - AI analiza potrošnje
- `POST /api/ai/chat` - Chat sa AI savetnikom

### CSV Import
- `POST /api/import/csv/preview` - Preview CSV
- `POST /api/import/csv/confirm` - Import CSV

### Households
- `GET /api/households` - Lista domaćinstava
- `POST /api/households` - Novo domaćinstvo
- `POST /api/households/join` - Pridruživanje

## Default Categories (Serbian)

**Rashodi:**
- 🍔 Hrana i piće
- 🏠 Stanovanje
- 🚗 Transport
- 💊 Zdravlje
- 🎬 Zabava
- 👕 Odeća
- 📱 Računi
- 🎓 Edukacija
- ✈️ Putovanja
- 🛒 Ostalo

**Prihodi:**
- 💰 Plata
- 💼 Freelance
- 🎁 Pokloni
- 📈 Investicije
- 💵 Ostali prihodi

## Environment Variables

### Backend (.env)
```
SECRET_KEY=your-secret-key-min-32-chars
DATABASE_URL=sqlite+aiosqlite:///./budget_tracker.db
GEMINI_API_KEY=your-gemini-api-key
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000/api
```

## License

MIT
