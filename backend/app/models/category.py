import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from ..core.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str] = mapped_column(String(50), nullable=False, default="📁")
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#6B7280")
    is_income: Mapped[bool] = mapped_column(Boolean, default=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    # Owner (null = system default)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    household_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("households.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user = relationship("User", back_populates="categories")
    household = relationship("Household", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")
    budgets = relationship("Budget", back_populates="category")


# Default categories to seed
DEFAULT_CATEGORIES = [
    # Expenses
    {"name": "Hrana i piće", "icon": "🍔", "color": "#EF4444", "is_income": False},
    {"name": "Stanovanje", "icon": "🏠", "color": "#F97316", "is_income": False},
    {"name": "Transport", "icon": "🚗", "color": "#EAB308", "is_income": False},
    {"name": "Zdravlje", "icon": "💊", "color": "#22C55E", "is_income": False},
    {"name": "Zabava", "icon": "🎬", "color": "#3B82F6", "is_income": False},
    {"name": "Odeća", "icon": "👕", "color": "#8B5CF6", "is_income": False},
    {"name": "Računi", "icon": "📱", "color": "#EC4899", "is_income": False},
    {"name": "Edukacija", "icon": "🎓", "color": "#14B8A6", "is_income": False},
    {"name": "Putovanja", "icon": "✈️", "color": "#06B6D4", "is_income": False},
    {"name": "Ostalo", "icon": "🛒", "color": "#6B7280", "is_income": False},
    # Income
    {"name": "Plata", "icon": "💰", "color": "#10B981", "is_income": True},
    {"name": "Freelance", "icon": "💼", "color": "#059669", "is_income": True},
    {"name": "Pokloni", "icon": "🎁", "color": "#34D399", "is_income": True},
    {"name": "Investicije", "icon": "📈", "color": "#047857", "is_income": True},
    {"name": "Ostali prihodi", "icon": "💵", "color": "#6EE7B7", "is_income": True},
]
