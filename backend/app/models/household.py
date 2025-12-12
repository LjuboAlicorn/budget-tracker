import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from ..core.database import Base


class MemberRole(str, enum.Enum):
    OWNER = "owner"
    MEMBER = "member"


class Household(Base):
    __tablename__ = "households"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    invite_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    owner = relationship("User", back_populates="owned_households")
    members = relationship("HouseholdMember", back_populates="household", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="household")
    categories = relationship("Category", back_populates="household")
    budgets = relationship("Budget", back_populates="household")


class HouseholdMember(Base):
    __tablename__ = "household_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    household_id: Mapped[str] = mapped_column(String(36), ForeignKey("households.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    role: Mapped[MemberRole] = mapped_column(SQLEnum(MemberRole), default=MemberRole.MEMBER)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    household = relationship("Household", back_populates="members")
    user = relationship("User", back_populates="household_memberships")
