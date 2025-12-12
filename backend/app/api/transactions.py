from datetime import date
from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload

from ..core.deps import DbSession, CurrentUser
from ..models.transaction import Transaction
from ..models.category import Category
from ..schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("", response_model=list[TransactionResponse])
async def get_transactions(
    db: DbSession,
    current_user: CurrentUser,
    start_date: date | None = None,
    end_date: date | None = None,
    category_id: str | None = None,
    is_income: bool | None = None,
    is_shared: bool | None = None,
    household_id: str | None = None,
    search: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """Get transactions with filters."""
    query = select(Transaction).options(selectinload(Transaction.category)).where(
        or_(
            Transaction.user_id == current_user.id,
            Transaction.household_id == household_id if household_id else False
        )
    )

    # Apply filters
    if start_date:
        query = query.where(Transaction.date >= start_date)
    if end_date:
        query = query.where(Transaction.date <= end_date)
    if category_id:
        query = query.where(Transaction.category_id == category_id)
    if is_shared is not None:
        query = query.where(Transaction.is_shared == is_shared)
    if search:
        query = query.where(Transaction.description.ilike(f"%{search}%"))

    # Filter by income/expense if specified
    if is_income is not None:
        query = query.join(Category).where(Category.is_income == is_income)

    query = query.order_by(Transaction.date.desc(), Transaction.created_at.desc())
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_data: TransactionCreate,
    db: DbSession,
    current_user: CurrentUser
):
    """Create a new transaction."""
    # Verify category exists and belongs to user
    result = await db.execute(
        select(Category).where(
            Category.id == transaction_data.category_id,
            or_(
                Category.user_id == current_user.id,
                Category.household_id == transaction_data.household_id if transaction_data.household_id else False
            )
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    transaction = Transaction(
        user_id=current_user.id,
        **transaction_data.model_dump()
    )
    db.add(transaction)
    await db.commit()

    # Reload with category
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(Transaction.id == transaction.id)
    )
    return result.scalar_one()


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    db: DbSession,
    current_user: CurrentUser
):
    """Get a single transaction."""
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id
        )
    )
    transaction = result.scalar_one_or_none()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    return transaction


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    transaction_data: TransactionUpdate,
    db: DbSession,
    current_user: CurrentUser
):
    """Update a transaction."""
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id
        )
    )
    transaction = result.scalar_one_or_none()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    update_data = transaction_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(transaction, field, value)

    await db.commit()

    # Reload with category
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(Transaction.id == transaction.id)
    )
    return result.scalar_one()


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: str,
    db: DbSession,
    current_user: CurrentUser
):
    """Delete a transaction."""
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id
        )
    )
    transaction = result.scalar_one_or_none()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    await db.delete(transaction)
    await db.commit()
