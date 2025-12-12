from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, or_

from ..core.deps import DbSession, CurrentUser
from ..models.category import Category
from ..schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=list[CategoryResponse])
async def get_categories(
    db: DbSession,
    current_user: CurrentUser,
    household_id: str | None = None
):
    """Get all categories available to the user."""
    query = select(Category).where(
        or_(
            Category.user_id == current_user.id,
            Category.household_id == household_id if household_id else False
        )
    ).order_by(Category.is_income, Category.name)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    db: DbSession,
    current_user: CurrentUser
):
    """Create a new custom category."""
    category = Category(
        user_id=current_user.id,
        household_id=category_data.household_id,
        name=category_data.name,
        icon=category_data.icon,
        color=category_data.color,
        is_income=category_data.is_income,
        is_default=False
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category_data: CategoryUpdate,
    db: DbSession,
    current_user: CurrentUser
):
    """Update a category (only custom categories can be updated)."""
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == current_user.id
        )
    )
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    if category.is_default:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify default categories"
        )

    update_data = category_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    await db.commit()
    await db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    db: DbSession,
    current_user: CurrentUser
):
    """Delete a custom category."""
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == current_user.id
        )
    )
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    if category.is_default:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete default categories"
        )

    await db.delete(category)
    await db.commit()
