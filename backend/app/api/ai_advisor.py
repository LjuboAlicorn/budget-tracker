from datetime import date, timedelta
from decimal import Decimal
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func, and_, or_
import google.generativeai as genai

from ..core.config import settings
from ..core.deps import DbSession, CurrentUser
from ..models.transaction import Transaction
from ..models.category import Category

router = APIRouter(prefix="/ai", tags=["AI Advisor"])


class AIAnalysisRequest(BaseModel):
    household_id: str | None = None


class AIAnalysisResponse(BaseModel):
    analysis: str
    suggestions: list[str]


class AIChatRequest(BaseModel):
    message: str
    household_id: str | None = None


class AIChatResponse(BaseModel):
    response: str


async def get_spending_context(
    db: DbSession,
    user_id: str,
    household_id: str | None = None,
    days: int = 30
) -> str:
    """Build context string about user's spending for AI."""
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    # Get spending by category
    query = select(
        Category.name,
        Category.is_income,
        func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        func.count(Transaction.id).label("count")
    ).join(Transaction).where(
        Transaction.date >= start_date,
        Transaction.date <= end_date,
        or_(
            Transaction.user_id == user_id,
            Transaction.household_id == household_id if household_id else False
        )
    ).group_by(Category.id)

    result = await db.execute(query)
    rows = result.all()

    # Build summary
    income_total = Decimal("0")
    expense_total = Decimal("0")
    expense_breakdown = []
    income_breakdown = []

    for row in rows:
        total = Decimal(str(row.total))
        if row.is_income:
            income_total += total
            income_breakdown.append(f"- {row.name}: {total:.2f} RSD ({row.count} transakcija)")
        else:
            expense_total += total
            expense_breakdown.append(f"- {row.name}: {total:.2f} RSD ({row.count} transakcija)")

    context = f"""Analiza troškova za poslednjih {days} dana:

PRIHODI (ukupno: {income_total:.2f} RSD):
{chr(10).join(income_breakdown) if income_breakdown else "- Nema zabeleženih prihoda"}

RASHODI (ukupno: {expense_total:.2f} RSD):
{chr(10).join(expense_breakdown) if expense_breakdown else "- Nema zabeleženih rashoda"}

BILANS: {income_total - expense_total:.2f} RSD
"""
    return context


@router.post("/analyze", response_model=AIAnalysisResponse)
async def analyze_spending(
    request: AIAnalysisRequest,
    db: DbSession,
    current_user: CurrentUser
):
    """Get AI analysis of spending patterns."""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI features are not configured. Please set GEMINI_API_KEY."
        )

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')

        context = await get_spending_context(db, current_user.id, request.household_id)

        prompt = f"""Ti si finansijski savetnik. Analiziraj sledeće podatke o prihodima i rashodima korisnika i pruži konkretne savete za uštedu na srpskom jeziku.

{context}

Napiši:
1. Kratku analizu potrošnje (2-3 rečenice)
2. 3-5 konkretnih saveta za uštedu baziranih na podacima

Format odgovora:
ANALIZA:
[tvoja analiza]

SAVETI:
- [savet 1]
- [savet 2]
- [savet 3]
"""

        response = model.generate_content(prompt)
        text = response.text

        # Parse response
        analysis = ""
        suggestions = []

        if "ANALIZA:" in text:
            parts = text.split("SAVETI:")
            analysis = parts[0].replace("ANALIZA:", "").strip()
            if len(parts) > 1:
                suggestions_text = parts[1].strip()
                suggestions = [
                    s.strip().lstrip("- ").lstrip("• ")
                    for s in suggestions_text.split("\n")
                    if s.strip() and s.strip() not in ["-", "•"]
                ]
        else:
            analysis = text
            suggestions = ["Nastavite sa praćenjem troškova za detaljnije savete."]

        return AIAnalysisResponse(
            analysis=analysis,
            suggestions=suggestions[:5]
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI analysis failed: {str(e)}"
        )


@router.post("/chat", response_model=AIChatResponse)
async def chat_with_advisor(
    request: AIChatRequest,
    db: DbSession,
    current_user: CurrentUser
):
    """Chat with AI financial advisor."""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI features are not configured. Please set GEMINI_API_KEY."
        )

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')

        context = await get_spending_context(db, current_user.id, request.household_id)

        prompt = f"""Ti si prijateljski finansijski savetnik. Korisnik ti postavlja pitanje o svojim finansijama. Odgovori na srpskom jeziku, konkretno i korisno.

Kontekst o korisnikovim finansijama:
{context}

Pitanje korisnika: {request.message}

Odgovori kratko i jasno (maksimalno 3-4 rečenice), pružajući praktične savete kada je moguće.
"""

        response = model.generate_content(prompt)
        return AIChatResponse(response=response.text)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI chat failed: {str(e)}"
        )
