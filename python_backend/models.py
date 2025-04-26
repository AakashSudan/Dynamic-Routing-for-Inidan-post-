from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    role = Column(String, nullable=False, default="sender")  # sender, staff, admin
    full_name = Column(String, nullable=False)
    
    # Relationships
    parcels = relationship("Parcel", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    notification_preferences = relationship("NotificationPreference", back_populates="user", uselist=False)


class Parcel(Base):
    __tablename__ = "parcels"
    
    id = Column(Integer, primary_key=True, index=True)
    tracking_number = Column(String, unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    status = Column(String, nullable=False, default="preparing")  # preparing, in_transit, delayed, delivered, customs_check
    transport_mode = Column(String, nullable=False)  # road, rail, air, multimodal
    created_at = Column(DateTime, default=func.now(), nullable=False)
    estimated_delivery = Column(DateTime, nullable=True)
    actual_delivery = Column(DateTime, nullable=True)
    weight = Column(String, nullable=False)
    dimensions = Column(String, nullable=True)
    current_location = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    delay_reason = Column(String, nullable=True)
    delay_duration = Column(String, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="parcels")
    routes = relationship("Route", back_populates="parcel")
    notifications = relationship("Notification", back_populates="parcel")


class Route(Base):
    __tablename__ = "routes"
    
    id = Column(Integer, primary_key=True, index=True)
    parcel_id = Column(Integer, ForeignKey("parcels.id"), nullable=False)
    route_path = Column(JSON, nullable=False)  # Array of locations
    transport_mode = Column(String, nullable=False)  # road, rail, air
    duration = Column(String, nullable=False)
    distance = Column(String, nullable=False)
    weather = Column(JSON, nullable=True)  # Weather conditions
    traffic = Column(JSON, nullable=True)  # Traffic conditions
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    parcel = relationship("Parcel", back_populates="routes")


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parcel_id = Column(Integer, ForeignKey("parcels.id"), nullable=False)
    type = Column(String, nullable=False)  # delay, status_change, delivery, weather
    message = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    read = Column(Boolean, nullable=False, default=False)
    sent = Column(Boolean, nullable=False, default=False)
    channel = Column(String, nullable=False)  # email, sms, push
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    parcel = relationship("Parcel", back_populates="notifications")


class Issue(Base):
    __tablename__ = "issues"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # low, medium, high
    status = Column(String, nullable=False, default="active")  # active, resolved
    created_at = Column(DateTime, default=func.now(), nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    affected_parcels = Column(JSON, nullable=True)  # Array of parcel IDs
    location = Column(String, nullable=True)
    issue_type = Column(String, nullable=False)  # weather, traffic, mechanical, system


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    delay_notifications = Column(Boolean, nullable=False, default=True)
    weather_alerts = Column(Boolean, nullable=False, default=True)
    status_changes = Column(Boolean, nullable=False, default=True)
    delivery_confirmations = Column(Boolean, nullable=False, default=True)
    email_enabled = Column(Boolean, nullable=False, default=True)
    sms_enabled = Column(Boolean, nullable=False, default=True)
    push_enabled = Column(Boolean, nullable=False, default=False)
    frequency = Column(String, nullable=False, default="realtime")  # realtime, hourly, daily
    
    # Relationships
    user = relationship("User", back_populates="notification_preferences")


class Stats(Base):
    __tablename__ = "stats"
    
    id = Column(Integer, primary_key=True, index=True)
    active_parcels = Column(Integer, nullable=False, default=0)
    active_routes = Column(Integer, nullable=False, default=0)
    delayed_parcels = Column(Integer, nullable=False, default=0)
    on_time_rate = Column(String, nullable=False, default="0")
    road_transit_percentage = Column(String, nullable=False, default="0")
    rail_transit_percentage = Column(String, nullable=False, default="0")
    air_transit_percentage = Column(String, nullable=False, default="0")
    weather_impact_percentage = Column(String, nullable=False, default="0")
    traffic_congestion_percentage = Column(String, nullable=False, default="0")
    mechanical_issues_percentage = Column(String, nullable=False, default="0")
    updated_at = Column(DateTime, default=func.now(), nullable=False)