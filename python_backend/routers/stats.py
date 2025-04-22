from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import models
import schemas
from database import get_db
from auth_utils import (
    get_current_active_user,
    get_staff_or_admin_user
)

router = APIRouter()

@router.get("/stats", response_model=schemas.Stats)
async def get_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get system statistics."""
    stats = db.query(models.Stats).first()
    
    if not stats:
        # Create default stats if not exists
        stats = models.Stats(
            active_parcels=0,
            active_routes=0,
            delayed_parcels=0,
            on_time_rate="0",
            road_transit_percentage="0",
            rail_transit_percentage="0",
            air_transit_percentage="0",
            weather_impact_percentage="0",
            traffic_congestion_percentage="0",
            mechanical_issues_percentage="0"
        )
        
        db.add(stats)
        db.commit()
        db.refresh(stats)
    
    return stats

@router.put("/stats", response_model=schemas.Stats)
async def update_stats(
    stats_data: schemas.StatsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_staff_or_admin_user)
):
    """Update system statistics (staff/admin only)."""
    stats = db.query(models.Stats).first()
    
    if not stats:
        # Create stats if not exists
        new_stats = models.Stats(
            **stats_data.dict(exclude_unset=True),
            updated_at=datetime.utcnow()
        )
        
        db.add(new_stats)
        db.commit()
        db.refresh(new_stats)
        
        return new_stats
    
    # Update stats fields
    for field, value in stats_data.dict(exclude_unset=True).items():
        setattr(stats, field, value)
    
    stats.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(stats)
    
    return stats

@router.post("/stats/recalculate", response_model=schemas.Stats)
async def recalculate_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_staff_or_admin_user)
):
    """Recalculate system statistics based on current data (staff/admin only)."""
    stats = db.query(models.Stats).first()
    
    if not stats:
        stats = models.Stats()
        db.add(stats)
    
    # Count active parcels
    active_parcels = db.query(models.Parcel).filter(
        models.Parcel.status.in_(["preparing", "in_transit", "delayed", "customs_check"])
    ).count()
    
    # Count active routes
    active_routes = db.query(models.Route).filter(
        models.Route.active == True
    ).count()
    
    # Count delayed parcels
    delayed_parcels = db.query(models.Parcel).filter(
        models.Parcel.status == "delayed"
    ).count()
    
    # Calculate on-time rate
    delivered_parcels = db.query(models.Parcel).filter(
        models.Parcel.status == "delivered"
    ).count()
    
    delayed_delivered = db.query(models.Parcel).filter(
        models.Parcel.status == "delivered",
        models.Parcel.delay_reason != None
    ).count()
    
    on_time_rate = "100%"
    if delivered_parcels > 0:
        on_time_percentage = 100 - (delayed_delivered / delivered_parcels * 100)
        on_time_rate = f"{on_time_percentage:.1f}%"
    
    # Calculate transport mode percentages
    all_active_routes = db.query(models.Route).filter(
        models.Route.active == True
    ).all()
    
    road_routes = 0
    rail_routes = 0
    air_routes = 0
    
    weather_impacted = 0
    traffic_impacted = 0
    
    for route in all_active_routes:
        if route.transport_mode == "road":
            road_routes += 1
        elif route.transport_mode == "rail":
            rail_routes += 1
        elif route.transport_mode == "air":
            air_routes += 1
        
        if route.weather and route.weather.get("impact", "none") != "none":
            weather_impacted += 1
        
        if route.traffic and route.traffic.get("congestion", "none") != "none":
            traffic_impacted += 1
    
    # Calculate percentages
    total_routes = len(all_active_routes)
    
    road_percentage = "0%"
    rail_percentage = "0%"
    air_percentage = "0%"
    weather_percentage = "0%"
    traffic_percentage = "0%"
    
    if total_routes > 0:
        road_percentage = f"{(road_routes / total_routes * 100):.1f}%"
        rail_percentage = f"{(rail_routes / total_routes * 100):.1f}%"
        air_percentage = f"{(air_routes / total_routes * 100):.1f}%"
        weather_percentage = f"{(weather_impacted / total_routes * 100):.1f}%"
        traffic_percentage = f"{(traffic_impacted / total_routes * 100):.1f}%"
    
    # Get mechanical issues percentage from actual issues
    mechanical_issues = db.query(models.Issue).filter(
        models.Issue.issue_type == "mechanical",
        models.Issue.status == "active"
    ).count()
    
    all_issues = db.query(models.Issue).filter(
        models.Issue.status == "active"
    ).count()
    
    mechanical_percentage = "0%"
    if all_issues > 0:
        mechanical_percentage = f"{(mechanical_issues / all_issues * 100):.1f}%"
    
    # Update stats
    stats.active_parcels = active_parcels
    stats.active_routes = active_routes
    stats.delayed_parcels = delayed_parcels
    stats.on_time_rate = on_time_rate
    stats.road_transit_percentage = road_percentage
    stats.rail_transit_percentage = rail_percentage
    stats.air_transit_percentage = air_percentage
    stats.weather_impact_percentage = weather_percentage
    stats.traffic_congestion_percentage = traffic_percentage
    stats.mechanical_issues_percentage = mechanical_percentage
    stats.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(stats)
    
    return stats