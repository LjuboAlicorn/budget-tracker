from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from ..models.household import MemberRole


class HouseholdBase(BaseModel):
    name: str


class HouseholdCreate(HouseholdBase):
    pass


class HouseholdResponse(HouseholdBase):
    id: str
    owner_id: str
    invite_code: str
    created_at: datetime

    class Config:
        from_attributes = True


class HouseholdMemberResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    role: MemberRole
    joined_at: datetime

    class Config:
        from_attributes = True


class JoinHouseholdRequest(BaseModel):
    invite_code: str
