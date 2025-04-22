from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import models
import schemas
from database import get_db
from auth_utils import (
    authenticate_user, 
    create_access_token, 
    get_password_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter()

# Seed user password for testing - a bcrypt hash for 'password'
TEST_PASSWORD_HASH = "$2b$10$VI1r0Y6HUdc4Ofv9tNRQJePiAS1ccf.yhvo/7HMNQbPberb1FTQ6K"

@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login endpoint to get an access token."""
    user = authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/api/login", response_model=schemas.User)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login endpoint to get user data."""
    user = authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
        
    return user

@router.post("/api/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user."""
    # Check if username exists
    existing_user = db.query(models.User).filter(
        models.User.username == user_data.username
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Create the new user
    hashed_password = get_password_hash(user_data.password)
    
    new_user = models.User(
        username=user_data.username,
        password=hashed_password,
        email=user_data.email,
        phone=user_data.phone,
        role=user_data.role,
        full_name=user_data.full_name
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create default notification preferences
    preferences = models.NotificationPreference(
        user_id=new_user.id,
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
    
    return new_user

@router.post("/api/logout")
async def logout():
    """Logout endpoint (JWT tokens are stateless, so just return 200)."""
    return {"detail": "Successfully logged out"}

@router.get("/api/seed-data")
async def seed_test_data(db: Session = Depends(get_db)):
    """Endpoint to seed test data for development."""
    # Check if data already exists
    if db.query(models.User).count() > 0:
        return {"detail": "Data already seeded"}
    
    # Create test users
    admin_user = models.User(
        id=1,
        username="admin",
        password=TEST_PASSWORD_HASH,
        email="admin@mailrouting.com",
        full_name="Admin User",
        role="admin",
        phone="555-123-4567"
    )
    
    staff_user = models.User(
        id=2,
        username="staff",
        password=TEST_PASSWORD_HASH,
        email="staff@mailrouting.com",
        full_name="Staff User",
        role="staff",
        phone="555-123-7890"
    )
    
    sender_user = models.User(
        id=3,
        username="sender",
        password=TEST_PASSWORD_HASH,
        email="sender@mailrouting.com",
        full_name="Sender User",
        role="sender",
        phone="555-123-5678"
    )
    
    db.add_all([admin_user, staff_user, sender_user])
    db.commit()
    
    # Create notification preferences for users
    for user_id in range(1, 4):
        preference = models.NotificationPreference(
            user_id=user_id,
            delay_notifications=True,
            weather_alerts=True,
            status_changes=True,
            delivery_confirmations=True,
            email_enabled=True,
            sms_enabled=True,
            push_enabled=False,
            frequency="realtime"
        )
        db.add(preference)
    
    # Create initial stats
    stats = models.Stats(
        id=1,
        active_parcels=1248,
        active_routes=87,
        delayed_parcels=35,
        on_time_rate="96.5%",
        road_transit_percentage="72%",
        rail_transit_percentage="18%",
        air_transit_percentage="10%",
        weather_impact_percentage="15%",
        traffic_congestion_percentage="35%",
        mechanical_issues_percentage="8%"
    )
    
    db.add(stats)
    db.commit()
    
    return {"detail": "Test data seeded successfully"}