from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, EmailStr, validator, Field
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    phone: Optional[str] = None
    role: str = "sender"
    full_name: str

class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None

class UserInDB(UserBase):
    id: int
    password: str
    
    class Config:
        orm_mode = True

class User(UserBase):
    id: int
    
    class Config:
        orm_mode = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None

# Parcel schemas
class ParcelBase(BaseModel):
    tracking_number: str
    origin: str
    destination: str
    status: str = "preparing"
    transport_mode: str
    weight: str
    dimensions: Optional[str] = None
    current_location: Optional[str] = None
    notes: Optional[str] = None
    estimated_delivery: Optional[datetime] = None

class ParcelCreate(ParcelBase):
    user_id: int

class ParcelUpdate(BaseModel):
    origin: Optional[str] = None
    destination: Optional[str] = None
    status: Optional[str] = None
    transport_mode: Optional[str] = None
    weight: Optional[str] = None
    dimensions: Optional[str] = None
    current_location: Optional[str] = None
    notes: Optional[str] = None
    estimated_delivery: Optional[datetime] = None
    actual_delivery: Optional[datetime] = None
    delay_reason: Optional[str] = None
    delay_duration: Optional[str] = None

class ParcelInDB(ParcelBase):
    id: int
    user_id: int
    created_at: datetime
    actual_delivery: Optional[datetime] = None
    delay_reason: Optional[str] = None
    delay_duration: Optional[str] = None
    
    class Config:
        orm_mode = True

class Parcel(ParcelInDB):
    class Config:
        orm_mode = True

# Route schemas
class RouteBase(BaseModel):
    parcel_id: int
    route_path: Dict[str, Any]  # JSON
    transport_mode: str
    duration: str
    distance: str
    weather: Optional[Dict[str, Any]] = None  # JSON
    traffic: Optional[Dict[str, Any]] = None  # JSON
    active: bool = True

class RouteCreate(RouteBase):
    pass

class RouteUpdate(BaseModel):
    route_path: Optional[Dict[str, Any]] = None
    transport_mode: Optional[str] = None
    duration: Optional[str] = None
    distance: Optional[str] = None
    weather: Optional[Dict[str, Any]] = None
    traffic: Optional[Dict[str, Any]] = None
    active: Optional[bool] = None

class RouteInDB(RouteBase):
    id: int
    created_at: datetime
    
    class Config:
        orm_mode = True

class Route(RouteInDB):
    class Config:
        orm_mode = True

# Notification schemas
class NotificationBase(BaseModel):
    user_id: int
    parcel_id: int
    type: str  # delay, status_change, delivery, weather
    message: str
    channel: str  # email, sms, push

class NotificationCreate(NotificationBase):
    pass

class NotificationUpdate(BaseModel):
    read: Optional[bool] = None
    sent: Optional[bool] = None

class NotificationInDB(NotificationBase):
    id: int
    created_at: datetime
    read: bool
    sent: bool
    
    class Config:
        orm_mode = True

class Notification(NotificationInDB):
    class Config:
        orm_mode = True

# Issue schemas
class IssueBase(BaseModel):
    title: str
    description: str
    severity: str  # low, medium, high
    status: str = "active"  # active, resolved
    affected_parcels: Optional[List[int]] = None
    location: Optional[str] = None
    issue_type: str  # weather, traffic, mechanical, system

class IssueCreate(IssueBase):
    pass

class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    affected_parcels: Optional[List[int]] = None
    location: Optional[str] = None
    resolved_at: Optional[datetime] = None

class IssueInDB(IssueBase):
    id: int
    created_at: datetime
    resolved_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

class Issue(IssueInDB):
    class Config:
        orm_mode = True

# Notification Preference schemas
class NotificationPreferenceBase(BaseModel):
    user_id: int
    delay_notifications: bool = True
    weather_alerts: bool = True
    status_changes: bool = True
    delivery_confirmations: bool = True
    email_enabled: bool = True
    sms_enabled: bool = True
    push_enabled: bool = False
    frequency: str = "realtime"  # realtime, hourly, daily

class NotificationPreferenceCreate(NotificationPreferenceBase):
    pass

class NotificationPreferenceUpdate(BaseModel):
    delay_notifications: Optional[bool] = None
    weather_alerts: Optional[bool] = None
    status_changes: Optional[bool] = None
    delivery_confirmations: Optional[bool] = None
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    frequency: Optional[str] = None

class NotificationPreferenceInDB(NotificationPreferenceBase):
    id: int
    
    class Config:
        orm_mode = True

class NotificationPreference(NotificationPreferenceInDB):
    class Config:
        orm_mode = True

# Stats schemas
class StatsBase(BaseModel):
    active_parcels: int = 0
    active_routes: int = 0
    delayed_parcels: int = 0
    on_time_rate: str = "0"
    road_transit_percentage: str = "0"
    rail_transit_percentage: str = "0"
    air_transit_percentage: str = "0"
    weather_impact_percentage: str = "0"
    traffic_congestion_percentage: str = "0"
    mechanical_issues_percentage: str = "0"

class StatsCreate(StatsBase):
    pass

class StatsUpdate(BaseModel):
    active_parcels: Optional[int] = None
    active_routes: Optional[int] = None
    delayed_parcels: Optional[int] = None
    on_time_rate: Optional[str] = None
    road_transit_percentage: Optional[str] = None
    rail_transit_percentage: Optional[str] = None
    air_transit_percentage: Optional[str] = None
    weather_impact_percentage: Optional[str] = None
    traffic_congestion_percentage: Optional[str] = None
    mechanical_issues_percentage: Optional[str] = None

class StatsInDB(StatsBase):
    id: int
    updated_at: datetime
    
    class Config:
        orm_mode = True

class Stats(StatsInDB):
    class Config:
        orm_mode = True