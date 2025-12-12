from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from .category import CategoryResponse


class BudgetBase(BaseModel):
    amount: Decimal
    month: date  # First day of month
    category_id: str
    alert_threshold: int = 80


class BudgetCreate(BudgetBase):
    household_id: Optional[str] = None


class BudgetUpdate(BaseModel):
    amount: Optional[Decimal] = None
    alert_threshold: Optional[int] = None


class BudgetResponse(BudgetBase):
    id: str
    user_id: str
    household_id: Optional[str]
    created_at: datetime
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True


class BudgetStatus(BaseModel):
    budget: BudgetResponse
    spent: Decimal
    remaining: Decimal
    percentage: float
    is_over_threshold: bool
    is_over_budget: bool
