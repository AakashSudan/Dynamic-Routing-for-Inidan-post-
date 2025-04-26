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

@router.get("/notifications", response_model=List[schemas.Notification])
async def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get notifications for the current user."""
    notifications = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).all()
    
    return notifications

@router.get("/notifications/unread", response_model=List[schemas.Notification])
async def get_unread_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get unread notifications for the current user."""
    notifications = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.read == False
    ).order_by(models.Notification.created_at.desc()).all()
    
    return notifications

@router.get("/notifications/{notification_id}", response_model=schemas.Notification)
async def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get a specific notification."""
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Check permissions - users can only see their own notifications
    if notification.user_id != current_user.id and current_user.role not in ["staff", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view this notification"
        )
        
    return notification

@router.put("/notifications/{notification_id}/read", response_model=schemas.Notification)
async def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Mark a notification as read."""
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Check permissions - users can only mark their own notifications
    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this notification"
        )
    
    notification.read = True
    db.commit()
    db.refresh(notification)
    
    return notification

@router.put("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Mark all notifications as read for the current user."""
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.read == False
    ).update({"read": True})
    
    db.commit()
    
    return {"detail": "All notifications marked as read"}

@router.post("/notifications", response_model=schemas.Notification, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification_data: schemas.NotificationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_staff_or_admin_user)
):
    """Create a new notification (staff/admin only)."""
    # Check if user exists
    user = db.query(models.User).filter(
        models.User.id == notification_data.user_id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if parcel exists
    parcel = db.query(models.Parcel).filter(
        models.Parcel.id == notification_data.parcel_id
    ).first()
    
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parcel not found"
        )
    
    # Check user notification preferences
    preferences = db.query(models.NotificationPreference).filter(
        models.NotificationPreference.user_id == notification_data.user_id
    ).first()
    
    # Skip notification creation if user has disabled this type
    if preferences:
        if notification_data.type == "delay" and not preferences.delay_notifications:
            return {"detail": "User has disabled delay notifications"}
        elif notification_data.type == "weather" and not preferences.weather_alerts:
            return {"detail": "User has disabled weather alerts"}
        elif notification_data.type == "status_change" and not preferences.status_changes:
            return {"detail": "User has disabled status change notifications"}
        elif notification_data.type == "delivery" and not preferences.delivery_confirmations:
            return {"detail": "User has disabled delivery confirmations"}
    
    # Create the notification
    new_notification = models.Notification(**notification_data.dict())
    
    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)
    
    return new_notification

@router.get("/notification-preferences", response_model=schemas.NotificationPreference)
async def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get notification preferences for the current user."""
    preferences = db.query(models.NotificationPreference).filter(
        models.NotificationPreference.user_id == current_user.id
    ).first()
    
    if not preferences:
        # Create default preferences if not exists
        preferences = models.NotificationPreference(
            user_id=current_user.id,
            delay_notifications=True,
            weather_alerts=True,
            status_changes=True,
            delivery_confirmations=True,
            email_enabled=True,
            sms_enabled=True,
            push_enabled=False,
            frequency="realtime"
        )
        
        db.add(preferences)
        db.commit()
        db.refresh(preferences)
    
    return preferences

@router.put("/notification-preferences", response_model=schemas.NotificationPreference)
async def update_notification_preferences(
    preferences_data: schemas.NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Update notification preferences for the current user."""
    preferences = db.query(models.NotificationPreference).filter(
        models.NotificationPreference.user_id == current_user.id
    ).first()
    
    if not preferences:
        # Create preferences if not exists
        new_preferences = models.NotificationPreference(
            user_id=current_user.id,
            **preferences_data.dict(exclude_unset=True)
        )
        
        db.add(new_preferences)
        db.commit()
        db.refresh(new_preferences)
        
        return new_preferences
    
    # Update preference fields
    for field, value in preferences_data.dict(exclude_unset=True).items():
        setattr(preferences, field, value)
    
    db.commit()
    db.refresh(preferences)
    
    return preferences