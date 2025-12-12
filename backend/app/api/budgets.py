from datetime import date
from decimal import Decimal
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, func, and_, or_, extract
from sqlalchemy.orm import selectinload

from ..core.deps import DbSession, CurrentUser
from ..models.budget import Budget
from ..models.transaction import Transaction
from ..models.category import Category
from ..schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse, BudgetStatus

router = APIRouter(prefix="/budgets", tags=["Budgets"])


def get_first_day_of_month(d: date) -> date:
    return d.replace(day=1)


@router.get("", response_model=list[BudgetResponse])
async def get_budgets(
    db: DbSession,
    current_user: CurrentUser,
    month: date | None = None,
    household_id: str | None = None
):
    """Get budgets for a specific month (defaults to current month)."""
    if not month:
        month = get_first_day_of_month(date.today())
    else:
        month = get_first_day_of_month(month)

    query = select(Budget).options(selectinload(Budget.category)).where(
        Budget.month == month,
        or_(
            Budget.user_id == current_user.id,
            Budget.household_id == household_id if household_id else False
        )
    )

    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_budget(
    budget_data: BudgetCreate,
    db: DbSession,
    current_user: CurrentUser
):
    """Create or update a budget for a category/month."""
    month = get_first_day_of_month(budget_data.month)

    # Check if budget already exists for this category/month
    result = await db.execute(
        select(Budget).where(
            Budget.category_id == budget_data.category_id,
            Budget.month == month,
            Budget.user_id == current_user.id
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Update existing budget
        existing.amount = budget_data.amount
        existing.alert_threshold = budget_data.alert_threshold
        await db.commit()
        await db.refresh(existing)

        result = await db.execute(
            select(Budget)
            .options(selectinload(Budget.category))
            .where(Budget.id == existing.id)
        )
        return result.scalar_one()

    # Create new budget
    budget = Budget(
        user_id=current_user.id,
        category_id=budget_data.category_id,
        month=month,
        amount=budget_data.amount,
        alert_threshold=budget_data.alert_threshold,
        household_id=budget_data.household_id
    )
    db.add(budget)
    await db.commit()

    result = await db.execute(
        select(Budget)
        .options(selectinload(Budget.category))
        .where(Budget.id == budget.id)
    )
    return result.scalar_one()


@router.get("/status", response_model=list[BudgetStatus])
async def get_budget_status(
    db: DbSession,
    current_user: CurrentUser,
    month: date | None = None,
    household_id: str | None = None
):
    """Get budget status with spending for current month."""
    if not month:
        month = get_first_day_of_month(date.today())
    else:
        month = get_first_day_of_month(month)

    # Get end of month
    if month.month == 12:
        end_of_month = date(month.year + 1, 1, 1)
    else:
        end_of_month = date(month.year, month.month + 1, 1)

    # Get all budgets for the month
    budgets_query = select(Budget).options(selectinload(Budget.category)).where(
        Budget.month == month,
        or_(
            Budget.user_id == current_user.id,
            Budget.household_id == household_id if household_id else False
        )
    )
    budgets_result = await db.execute(budgets_query)
    budgets = budgets_result.scalars().all()

    statuses = []
    for budget in budgets:
        # Calculate spent amount for this category
        spent_query = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.category_id == budget.category_id,
            Transaction.date >= month,
            Transaction.date < end_of_month,
            or_(
                Transaction.user_id == current_user.id,
                Transaction.household_id == household_id if household_id else False
            )
        )
        spent_result = await db.execute(spent_query)
        spent = Decimal(str(spent_result.scalar()))

        remaining = budget.amount - spent
        percentage = float(spent / budget.amount * 100) if budget.amount > 0 else 0

        statuses.append(BudgetStatus(
            budget=budget,
            spent=spent,
            remaining=remaining,
            percentage=round(percentage, 1),
            is_over_threshold=percentage >= budget.alert_threshold,
            is_over_budget=spent > budget.amount
        ))

    return statuses


@router.put("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: str,
    budget_data: BudgetUpdate,
    db: DbSession,
    current_user: CurrentUser
):
    """Update a budget."""
    result = await db.execute(
        select(Budget).where(
            Budget.id == budget_id,
            Budget.user_id == current_user.id
        )
    )
    budget = result.scalar_one_or_none()

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )

    update_data = budget_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(budget, field, value)

    await db.commit()

    result = await db.execute(
        select(Budget)
        .options(selectinload(Budget.category))
        .where(Budget.id == budget.id)
    )
    return result.scalar_one()


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: str,
    db: DbSession,
    current_user: CurrentUser
):
    """Delete a budget."""
    result = await db.execute(
        select(Budget).where(
            Budget.id == budget_id,
            Budget.user_id == current_user.id
        )
    )
    budget = result.scalar_one_or_none()

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )

    await db.delete(budget)
    await db.commit()
