from fastapi import APIRouter, Depends
from ..core.auth import get_current_user
from ..models.schemas import User

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/me", response_model=User)
async def get_me(current_user = Depends(get_current_user)):
    """
    Get currently logged-in user information
    """
    return User(
        id=current_user.id,
        email=current_user.email,
        created_at=current_user.created_at
    )