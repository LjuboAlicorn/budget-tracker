from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from ..core.deps import DbSession, CurrentUser
from ..core.security import get_password_hash, verify_password, create_access_token
from ..models.user import User
from ..models.category import Category, DEFAULT_CATEGORIES
from ..schemas.user import UserCreate, UserLogin, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: DbSession):
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=get_password_hash(user_data.password)
    )
    db.add(user)
    await db.flush()

    # Create default categories for user
    for cat_data in DEFAULT_CATEGORIES:
        category = Category(
            user_id=user.id,
            is_default=True,
            **cat_data
        )
        db.add(category)

    await db.commit()

    # Generate token
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token)


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: DbSession):
    # Find user
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Generate token
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: CurrentUser):
    return current_user
