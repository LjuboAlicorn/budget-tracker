from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.database import init_db
from .api import auth, categories, transactions, budgets, analytics, households, csv_import, ai_advisor


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(budgets.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(households.router, prefix="/api")
app.include_router(csv_import.router, prefix="/api")
app.include_router(ai_advisor.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Budget Tracker API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
