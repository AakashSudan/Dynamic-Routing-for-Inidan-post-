from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import models
import schemas
from database import get_db
from auth_utils import (
    get_current_active_user,
    get_staff_or_admin_user
)

router = APIRouter()

@router.get("/issues", response_model=List[schemas.Issue])
async def get_issues(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all issues."""
    # All users can view issues, but in a real application you might want to filter by role
    issues = db.query(models.Issue).order_by(models.Issue.created_at.desc()).all()
    return issues

@router.get("/issues/active", response_model=List[schemas.Issue])
async def get_active_issues(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get active issues."""
    issues = db.query(models.Issue).filter(
        models.Issue.status == "active"
    ).order_by(models.Issue.created_at.desc()).all()
    return issues

@router.get("/issues/{issue_id}", response_model=schemas.Issue)
async def get_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get a specific issue by ID."""
    issue = db.query(models.Issue).filter(models.Issue.id == issue_id).first()
    
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )
        
    return issue

@router.post("/issues", response_model=schemas.Issue, status_code=status.HTTP_201_CREATED)
async def create_issue(
    issue_data: schemas.IssueCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_staff_or_admin_user)
):
    """Create a new issue (staff/admin only)."""
    # Create the issue
    new_issue = models.Issue(**issue_data.dict())
    
    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)
    
    # If the issue affects parcels, update their status
    if issue_data.affected_parcels:
        for parcel_id in issue_data.affected_parcels:
            parcel = db.query(models.Parcel).filter(models.Parcel.id == parcel_id).first()
            if parcel and parcel.status != "delayed":
                parcel.status = "delayed"
                parcel.delay_reason = f"Issue: {issue_data.title}"
                db.commit()
                
                # Update stats
                stats = db.query(models.Stats).first()
                if stats:
                    stats.delayed_parcels += 1
                    db.commit()
    
    return new_issue

@router.put("/issues/{issue_id}", response_model=schemas.Issue)
async def update_issue(
    issue_id: int,
    issue_data: schemas.IssueUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_staff_or_admin_user)
):
    """Update an issue (staff/admin only)."""
    issue = db.query(models.Issue).filter(models.Issue.id == issue_id).first()
    
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )
    
    # Check if status is being updated to 'resolved'
    was_active = issue.status == "active"
    is_now_resolved = issue_data.status == "resolved" if issue_data.status else False
    
    # If issue is being resolved, set the resolved_at timestamp
    if is_now_resolved and was_active:
        issue_data.resolved_at = datetime.utcnow()
    
    # Update issue fields
    for field, value in issue_data.dict(exclude_unset=True).items():
        setattr(issue, field, value)
    
    db.commit()
    db.refresh(issue)
    
    # If the issue was resolved, update affected parcels
    if is_now_resolved and issue.affected_parcels:
        for parcel_id in issue.affected_parcels:
            parcel = db.query(models.Parcel).filter(
                models.Parcel.id == parcel_id,
                models.Parcel.status == "delayed",
                models.Parcel.delay_reason == f"Issue: {issue.title}"
            ).first()
            
            if parcel:
                parcel.status = "in_transit"
                parcel.delay_reason = None
                db.commit()
                
                # Update stats
                stats = db.query(models.Stats).first()
                if stats and stats.delayed_parcels > 0:
                    stats.delayed_parcels -= 1
                    db.commit()
    
    return issue