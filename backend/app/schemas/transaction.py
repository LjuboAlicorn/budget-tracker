from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from .category import CategoryResponse


class TransactionBase(BaseModel):
    amount: Decimal
    description: Optional[str] = None
    date: date
    category_id: str
    is_shared: bool = False


class TransactionCreate(TransactionBase):
    household_id: Optional[str] = None


class TransactionUpdate(BaseModel):
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    date: Optional[date] = None
    category_id: Optional[str] = None
    is_shared: Optional[bool] = None


class TransactionResponse(TransactionBase):
    id: str
    user_id: str
    household_id: Optional[str]
    created_at: datetime
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True


class TransactionFilters(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    category_id: Optional[str] = None
    is_income: Optional[bool] = None
    is_shared: Optional[bool] = None
    household_id: Optional[str] = None
    search: Optional[str] = None
