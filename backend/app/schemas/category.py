from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CategoryBase(BaseModel):
    name: str
    icon: str = "📁"
    color: str = "#6B7280"
    is_income: bool = False


class CategoryCreate(CategoryBase):
    household_id: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryResponse(CategoryBase):
    id: str
    is_default: bool
    user_id: Optional[str]
    household_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
