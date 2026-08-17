from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import or_

from database import get_db
from models import Complaint
from schemas import ComplaintCreate, ComplaintResponse, ComplaintUpdate, CommitComplaintRequest

router = APIRouter(prefix="/api/complaints", tags=["operations_records"])


@router.post("", response_model=ComplaintResponse)
@router.post("/", response_model=ComplaintResponse)
def create_complaint(payload: ComplaintCreate, db: Session = Depends(get_db)):
    """Create a new operation / issue / service record."""
    existing = db.query(Complaint).filter(Complaint.session_id == payload.session_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Record with this session_id already exists. Use PATCH to update.")
    complaint = Complaint(**payload.model_dump())
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.get("", response_model=List[ComplaintResponse])
@router.get("/", response_model=List[ComplaintResponse])
def list_complaints(
    skip: int = 0,
    limit: int = 200,
    workspace: Optional[str] = None,
    record_type: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List operational records with optional multi-workspace filters."""
    query = db.query(Complaint)

    if workspace and workspace != "all":
        query = query.filter(Complaint.workspace == workspace)
    if record_type and record_type != "all":
        query = query.filter(Complaint.record_type == record_type)
    if status and status != "all":
        query = query.filter(Complaint.status == status)
    if severity and severity != "all":
        query = query.filter(Complaint.severity == severity)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Complaint.customer_name.ilike(search_fmt),
                Complaint.product_name.ilike(search_fmt),
                Complaint.batch_lot_number.ilike(search_fmt),
                Complaint.complaint_category.ilike(search_fmt),
                Complaint.title.ilike(search_fmt),
            )
        )

    return query.order_by(Complaint.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(complaint_id: int, db: Session = Depends(get_db)):
    """Get a single record by ID."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Record not found")
    return complaint


@router.get("/session/{session_id}", response_model=ComplaintResponse)
def get_complaint_by_session(session_id: str, db: Session = Depends(get_db)):
    """Get record by session ID."""
    complaint = db.query(Complaint).filter(Complaint.session_id == session_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Record not found for this session")
    return complaint


@router.patch("/{complaint_id}", response_model=ComplaintResponse)
def update_complaint(complaint_id: int, payload: ComplaintUpdate, db: Session = Depends(get_db)):
    """Update record fields."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Record not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(complaint, k, v)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/commit", response_model=ComplaintResponse)
def commit_complaint(payload: CommitComplaintRequest, db: Session = Depends(get_db)):
    """Commit a record to the universal operations ledger (status → committed)."""
    complaint = db.query(Complaint).filter(Complaint.session_id == payload.session_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="No record found for this session. Create it first.")

    update_data = payload.complaint_data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(complaint, k, v)

    complaint.status = "committed"
    db.commit()
    db.refresh(complaint)
    return complaint


@router.delete("/{complaint_id}")
def delete_complaint(complaint_id: int, db: Session = Depends(get_db)):
    """Delete a record."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(complaint)
    db.commit()
    return {"detail": "Record deleted successfully"}
