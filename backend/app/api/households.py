import secrets
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..core.deps import DbSession, CurrentUser
from ..models.household import Household, HouseholdMember, MemberRole
from ..models.user import User
from ..schemas.household import HouseholdCreate, HouseholdResponse, HouseholdMemberResponse, JoinHouseholdRequest

router = APIRouter(prefix="/households", tags=["Households"])


def generate_invite_code() -> str:
    return secrets.token_urlsafe(8)


@router.get("", response_model=list[HouseholdResponse])
async def get_my_households(
    db: DbSession,
    current_user: CurrentUser
):
    """Get all households the user is a member of."""
    query = select(Household).join(HouseholdMember).where(
        HouseholdMember.user_id == current_user.id
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=HouseholdResponse, status_code=status.HTTP_201_CREATED)
async def create_household(
    household_data: HouseholdCreate,
    db: DbSession,
    current_user: CurrentUser
):
    """Create a new household."""
    household = Household(
        name=household_data.name,
        owner_id=current_user.id,
        invite_code=generate_invite_code()
    )
    db.add(household)
    await db.flush()

    # Add owner as member
    member = HouseholdMember(
        household_id=household.id,
        user_id=current_user.id,
        role=MemberRole.OWNER
    )
    db.add(member)
    await db.commit()
    await db.refresh(household)

    return household


@router.post("/join", response_model=HouseholdResponse)
async def join_household(
    join_data: JoinHouseholdRequest,
    db: DbSession,
    current_user: CurrentUser
):
    """Join a household using invite code."""
    # Find household
    result = await db.execute(
        select(Household).where(Household.invite_code == join_data.invite_code)
    )
    household = result.scalar_one_or_none()

    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invite code"
        )

    # Check if already a member
    member_result = await db.execute(
        select(HouseholdMember).where(
            HouseholdMember.household_id == household.id,
            HouseholdMember.user_id == current_user.id
        )
    )
    if member_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already a member of this household"
        )

    # Add as member
    member = HouseholdMember(
        household_id=household.id,
        user_id=current_user.id,
        role=MemberRole.MEMBER
    )
    db.add(member)
    await db.commit()

    return household


@router.get("/{household_id}", response_model=HouseholdResponse)
async def get_household(
    household_id: str,
    db: DbSession,
    current_user: CurrentUser
):
    """Get a specific household."""
    # Verify membership
    member_result = await db.execute(
        select(HouseholdMember).where(
            HouseholdMember.household_id == household_id,
            HouseholdMember.user_id == current_user.id
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this household"
        )

    result = await db.execute(select(Household).where(Household.id == household_id))
    household = result.scalar_one_or_none()

    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Household not found"
        )

    return household


@router.get("/{household_id}/members", response_model=list[HouseholdMemberResponse])
async def get_household_members(
    household_id: str,
    db: DbSession,
    current_user: CurrentUser
):
    """Get all members of a household."""
    # Verify membership
    member_result = await db.execute(
        select(HouseholdMember).where(
            HouseholdMember.household_id == household_id,
            HouseholdMember.user_id == current_user.id
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this household"
        )

    query = select(HouseholdMember, User).join(User).where(
        HouseholdMember.household_id == household_id
    )
    result = await db.execute(query)
    rows = result.all()

    return [
        HouseholdMemberResponse(
            id=member.id,
            user_id=user.id,
            user_name=user.name,
            user_email=user.email,
            role=member.role,
            joined_at=member.joined_at
        )
        for member, user in rows
    ]


@router.post("/{household_id}/regenerate-code", response_model=HouseholdResponse)
async def regenerate_invite_code(
    household_id: str,
    db: DbSession,
    current_user: CurrentUser
):
    """Regenerate invite code (owner only)."""
    result = await db.execute(
        select(Household).where(
            Household.id == household_id,
            Household.owner_id == current_user.id
        )
    )
    household = result.scalar_one_or_none()

    if not household:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can regenerate the invite code"
        )

    household.invite_code = generate_invite_code()
    await db.commit()
    await db.refresh(household)

    return household


@router.delete("/{household_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    household_id: str,
    user_id: str,
    db: DbSession,
    current_user: CurrentUser
):
    """Remove a member from household (owner only, can't remove self)."""
    # Verify ownership
    result = await db.execute(
        select(Household).where(
            Household.id == household_id,
            Household.owner_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can remove members"
        )

    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Owner cannot remove themselves"
        )

    # Find and remove member
    member_result = await db.execute(
        select(HouseholdMember).where(
            HouseholdMember.household_id == household_id,
            HouseholdMember.user_id == user_id
        )
    )
    member = member_result.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )

    await db.delete(member)
    await db.commit()


@router.delete("/{household_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_household(
    household_id: str,
    db: DbSession,
    current_user: CurrentUser
):
    """Leave a household (members only, owner must delete or transfer)."""
    # Check if owner
    result = await db.execute(
        select(Household).where(
            Household.id == household_id,
            Household.owner_id == current_user.id
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Owner cannot leave. Transfer ownership or delete the household."
        )

    # Find membership
    member_result = await db.execute(
        select(HouseholdMember).where(
            HouseholdMember.household_id == household_id,
            HouseholdMember.user_id == current_user.id
        )
    )
    member = member_result.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not a member of this household"
        )

    await db.delete(member)
    await db.commit()
