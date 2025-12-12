import uuid
from datetime import datetime, date, timezone
from decimal import Decimal
from sqlalchemy import String, DateTime, ForeignKey, Boolean, Date, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from ..core.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)

    # Foreign keys
    category_id: Mapped[str] = mapped_column(String(36), ForeignKey("categories.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    household_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("households.id"), nullable=True)

    # Shared expense flag
    is_shared: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    category = relationship("Category", back_populates="transactions")
    user = relationship("User", back_populates="transactions")
    household = relationship("Household", back_populates="transactions")
