from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models
import schemas
from database import get_db
from auth_utils import (
    get_current_active_user,
    get_staff_or_admin_user
)
import random
import string

router = APIRouter()

def generate_tracking_number():
    """Generate a random tracking number."""
    prefix = "MRS"
    digits = ''.join(random.choices(string.digits, k=8))
    letters = ''.join(random.choices(string.ascii_uppercase, k=2))
    return f"{prefix}-{digits}-{letters}"

@router.get("/parcels", response_model=List[schemas.Parcel])
async def get_parcels(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all parcels (filtered by role)."""
    if current_user.role == "sender":
        # Senders can only see their own parcels
        parcels = db.query(models.Parcel).filter(
            models.Parcel.user_id == current_user.id
        ).all()
    else:
        # Admin and staff can see all parcels
        parcels = db.query(models.Parcel).all()
        
    return parcels

@router.get("/parcels/{parcel_id}", response_model=schemas.Parcel)
async def get_parcel(
    parcel_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get a specific parcel by ID."""
    parcel = db.query(models.Parcel).filter(models.Parcel.id == parcel_id).first()
    
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parcel not found"
        )
    
    # Check permissions - senders can only see their own parcels
    if current_user.role == "sender" and parcel.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view this parcel"
        )
        
    return parcel

@router.get("/parcels/track/{tracking_number}", response_model=schemas.Parcel)
async def track_parcel(
    tracking_number: str,
    db: Session = Depends(get_db)
):
    """Track a parcel by tracking number (public endpoint)."""
    parcel = db.query(models.Parcel).filter(
        models.Parcel.tracking_number == tracking_number
    ).first()
    
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parcel not found"
        )
        
    return parcel

@router.post("/parcels", response_model=schemas.Parcel, status_code=status.HTTP_201_CREATED)
async def create_parcel(
    parcel_data: schemas.ParcelCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a new parcel."""
    # If no tracking number provided, generate one
    if not parcel_data.tracking_number or parcel_data.tracking_number == "auto":
        parcel_data.tracking_number = generate_tracking_number()
    
    # Check if a parcel with this tracking number already exists
    existing_parcel = db.query(models.Parcel).filter(
        models.Parcel.tracking_number == parcel_data.tracking_number
    ).first()
    
    if existing_parcel:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parcel with this tracking number already exists"
        )
    
    # Set user_id if sender
    if current_user.role == "sender":
        parcel_data.user_id = current_user.id
    
    # Create the parcel
    new_parcel = models.Parcel(**parcel_data.dict())
    
    db.add(new_parcel)
    db.commit()
    db.refresh(new_parcel)
    
    # Update stats
    stats = db.query(models.Stats).first()
    if stats:
        stats.active_parcels += 1
        db.commit()
    
    return new_parcel

@router.put("/parcels/{parcel_id}", response_model=schemas.Parcel)
async def update_parcel(
    parcel_id: int,
    parcel_data: schemas.ParcelUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Update a parcel."""
    parcel = db.query(models.Parcel).filter(models.Parcel.id == parcel_id).first()
    
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parcel not found"
        )
    
    # Check permissions
    if current_user.role == "sender" and parcel.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this parcel"
        )
    
    # Check if status is being updated to 'delayed'
    was_delayed = parcel.status == "delayed"
    is_now_delayed = parcel_data.status == "delayed" if parcel_data.status else was_delayed
    
    # Update parcel fields
    for field, value in parcel_data.dict(exclude_unset=True).items():
        setattr(parcel, field, value)
    
    db.commit()
    db.refresh(parcel)
    
    # Update stats if delay status changed
    if not was_delayed and is_now_delayed:
        stats = db.query(models.Stats).first()
        if stats:
            stats.delayed_parcels += 1
            db.commit()
    elif was_delayed and not is_now_delayed:
        stats = db.query(models.Stats).first()
        if stats and stats.delayed_parcels > 0:
            stats.delayed_parcels -= 1
            db.commit()
    
    return parcel