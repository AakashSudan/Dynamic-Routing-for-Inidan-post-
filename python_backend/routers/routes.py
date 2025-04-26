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

router = APIRouter()

@router.get("/routes", response_model=List[schemas.Route])
async def get_routes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all routes."""
    if current_user.role == "sender":
        # Senders can only see routes for their parcels
        routes = db.query(models.Route).join(
            models.Parcel, models.Route.parcel_id == models.Parcel.id
        ).filter(
            models.Parcel.user_id == current_user.id
        ).all()
    else:
        # Admin and staff can see all routes
        routes = db.query(models.Route).all()
        
    return routes

@router.get("/routes/active", response_model=List[schemas.Route])
async def get_active_routes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get active routes."""
    if current_user.role == "sender":
        # Senders can only see routes for their parcels
        routes = db.query(models.Route).join(
            models.Parcel, models.Route.parcel_id == models.Parcel.id
        ).filter(
            models.Parcel.user_id == current_user.id,
            models.Route.active == True
        ).all()
    else:
        # Admin and staff can see all active routes
        routes = db.query(models.Route).filter(
            models.Route.active == True
        ).all()
        
    return routes

@router.get("/routes/{route_id}", response_model=schemas.Route)
async def get_route(
    route_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get a specific route by ID."""
    route = db.query(models.Route).filter(models.Route.id == route_id).first()
    
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Route not found"
        )
    
    # Check permissions for senders
    if current_user.role == "sender":
        parcel = db.query(models.Parcel).filter(
            models.Parcel.id == route.parcel_id
        ).first()
        
        if not parcel or parcel.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to view this route"
            )
            
    return route

@router.get("/routes/parcel/{parcel_id}", response_model=List[schemas.Route])
async def get_routes_for_parcel(
    parcel_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get routes for a specific parcel."""
    # Check parcel exists
    parcel = db.query(models.Parcel).filter(models.Parcel.id == parcel_id).first()
    
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parcel not found"
        )
    
    # Check permissions for senders
    if current_user.role == "sender" and parcel.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view routes for this parcel"
        )
    
    routes = db.query(models.Route).filter(
        models.Route.parcel_id == parcel_id
    ).all()
    
    return routes

@router.post("/routes", response_model=schemas.Route, status_code=status.HTTP_201_CREATED)
async def create_route(
    route_data: schemas.RouteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_staff_or_admin_user)
):
    """Create a new route (staff/admin only)."""
    # Check if parcel exists
    parcel = db.query(models.Parcel).filter(
        models.Parcel.id == route_data.parcel_id
    ).first()
    
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parcel not found"
        )
    
    # Create the route
    new_route = models.Route(**route_data.dict())
    
    db.add(new_route)
    db.commit()
    db.refresh(new_route)
    
    # Update stats
    stats = db.query(models.Stats).first()
    if stats and new_route.active:
        stats.active_routes += 1
        db.commit()
    
    return new_route

@router.put("/routes/{route_id}", response_model=schemas.Route)
async def update_route(
    route_id: int,
    route_data: schemas.RouteUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_staff_or_admin_user)
):
    """Update a route (staff/admin only)."""
    route = db.query(models.Route).filter(models.Route.id == route_id).first()
    
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Route not found"
        )
    
    # Check if active status is being changed
    was_active = route.active
    is_now_active = route_data.active if route_data.active is not None else was_active
    
    # Update route fields
    for field, value in route_data.dict(exclude_unset=True).items():
        setattr(route, field, value)
    
    db.commit()
    db.refresh(route)
    
    # Update stats if active status changed
    stats = db.query(models.Stats).first()
    if stats:
        if not was_active and is_now_active:
            stats.active_routes += 1
            db.commit()
        elif was_active and not is_now_active:
            if stats.active_routes > 0:
                stats.active_routes -= 1
                db.commit()
    
    return route