from datetime import date, timedelta
from decimal import Decimal
from fastapi import APIRouter
from sqlalchemy import select, func, and_, or_
from pydantic import BaseModel

from ..core.deps import DbSession, CurrentUser
from ..models.transaction import Transaction
from ..models.category import Category

router = APIRouter(prefix="/analytics", tags=["Analytics"])


class MonthlySummary(BaseModel):
    month: date
    total_income: Decimal
    total_expenses: Decimal
    net: Decimal
    transaction_count: int


class CategoryBreakdown(BaseModel):
    category_id: str
    category_name: str
    category_icon: str
    category_color: str
    total: Decimal
    percentage: float
    transaction_count: int


class SpendingTrend(BaseModel):
    date: date
    amount: Decimal


def get_month_range(month: date) -> tuple[date, date]:
    """Get start and end date for a month."""
    start = month.replace(day=1)
    if month.month == 12:
        end = date(month.year + 1, 1, 1)
    else:
        end = date(month.year, month.month + 1, 1)
    return start, end


@router.get("/monthly", response_model=MonthlySummary)
async def get_monthly_summary(
    db: DbSession,
    current_user: CurrentUser,
    month: date | None = None,
    household_id: str | None = None
):
    """Get monthly income/expense summary."""
    if not month:
        month = date.today()

    start, end = get_month_range(month)

    # Base query filter
    base_filter = and_(
        Transaction.date >= start,
        Transaction.date < end,
        or_(
            Transaction.user_id == current_user.id,
            Transaction.household_id == household_id if household_id else False
        )
    )

    # Get income total
    income_query = select(func.coalesce(func.sum(Transaction.amount), 0)).join(Category).where(
        base_filter,
        Category.is_income == True
    )
    income_result = await db.execute(income_query)
    total_income = Decimal(str(income_result.scalar()))

    # Get expense total
    expense_query = select(func.coalesce(func.sum(Transaction.amount), 0)).join(Category).where(
        base_filter,
        Category.is_income == False
    )
    expense_result = await db.execute(expense_query)
    total_expenses = Decimal(str(expense_result.scalar()))

    # Get transaction count
    count_query = select(func.count(Transaction.id)).where(base_filter)
    count_result = await db.execute(count_query)
    transaction_count = count_result.scalar()

    return MonthlySummary(
        month=start,
        total_income=total_income,
        total_expenses=total_expenses,
        net=total_income - total_expenses,
        transaction_count=transaction_count
    )


@router.get("/categories", response_model=list[CategoryBreakdown])
async def get_category_breakdown(
    db: DbSession,
    current_user: CurrentUser,
    month: date | None = None,
    is_income: bool = False,
    household_id: str | None = None
):
    """Get spending/income breakdown by category."""
    if not month:
        month = date.today()

    start, end = get_month_range(month)

    query = select(
        Category.id,
        Category.name,
        Category.icon,
        Category.color,
        func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        func.count(Transaction.id).label("count")
    ).join(Transaction).where(
        Transaction.date >= start,
        Transaction.date < end,
        Category.is_income == is_income,
        or_(
            Transaction.user_id == current_user.id,
            Transaction.household_id == household_id if household_id else False
        )
    ).group_by(Category.id).order_by(func.sum(Transaction.amount).desc())

    result = await db.execute(query)
    rows = result.all()

    # Calculate total for percentages
    grand_total = sum(Decimal(str(row.total)) for row in rows)

    breakdowns = []
    for row in rows:
        total = Decimal(str(row.total))
        percentage = float(total / grand_total * 100) if grand_total > 0 else 0

        breakdowns.append(CategoryBreakdown(
            category_id=row.id,
            category_name=row.name,
            category_icon=row.icon,
            category_color=row.color,
            total=total,
            percentage=round(percentage, 1),
            transaction_count=row.count
        ))

    return breakdowns


@router.get("/trends", response_model=list[SpendingTrend])
async def get_spending_trends(
    db: DbSession,
    current_user: CurrentUser,
    days: int = 30,
    household_id: str | None = None
):
    """Get daily spending trends for the last N days."""
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    query = select(
        Transaction.date,
        func.coalesce(func.sum(Transaction.amount), 0).label("total")
    ).join(Category).where(
        Transaction.date >= start_date,
        Transaction.date <= end_date,
        Category.is_income == False,
        or_(
            Transaction.user_id == current_user.id,
            Transaction.household_id == household_id if household_id else False
        )
    ).group_by(Transaction.date).order_by(Transaction.date)

    result = await db.execute(query)
    rows = result.all()

    # Create a dict for easy lookup
    spending_by_date = {row.date: Decimal(str(row.total)) for row in rows}

    # Fill in all dates (including zeros)
    trends = []
    current = start_date
    while current <= end_date:
        trends.append(SpendingTrend(
            date=current,
            amount=spending_by_date.get(current, Decimal("0"))
        ))
        current += timedelta(days=1)

    return trends
