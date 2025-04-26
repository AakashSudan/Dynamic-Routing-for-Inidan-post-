from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models
import schemas
from database import get_db
from auth_utils import (
    get_current_active_user,
    get_admin_user,
    get_staff_or_admin_user
)

router = APIRouter()

@router.get("/user", response_model=schemas.User)
async def get_current_user_info(
    current_user: models.User = Depends(get_current_active_user)
):
    """Get the current user's information."""
    return current_user

@router.get("/users", response_model=List[schemas.User])
async def get_all_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_staff_or_admin_user)
):
    """Get all users (staff/admin only)."""
    users = db.query(models.User).all()
    return users

@router.get("/users/{user_id}", response_model=schemas.User)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_staff_or_admin_user)
):
    """Get a specific user by ID (staff/admin only)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    return user

@router.put("/users/{user_id}", response_model=schemas.User)
async def update_user(
    user_id: int,
    user_data: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Update a user's information."""
    # Only admins can update other users
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update other users"
        )
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Only admins can change roles
    if user_data.role and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to change roles"
        )
    
    # Update user fields
    for field, value in user_data.dict(exclude_unset=True).items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    return user