from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Complaint
from schemas import ComplaintCreate, ComplaintResponse, ComplaintUpdate, CommitComplaintRequest

router = APIRouter(prefix="/api/complaints", tags=["complaints"])


@router.post("", response_model=ComplaintResponse)
@router.post("/", response_model=ComplaintResponse)
def create_complaint(payload: ComplaintCreate, db: Session = Depends(get_db)):
    """Create a new complaint record."""
    existing = db.query(Complaint).filter(Complaint.session_id == payload.session_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Complaint with this session_id already exists. Use PATCH to update.")
    complaint = Complaint(**payload.model_dump())
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.get("", response_model=List[ComplaintResponse])
@router.get("/", response_model=List[ComplaintResponse])
def list_complaints(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all complaints in the QMS ledger."""
    return db.query(Complaint).order_by(Complaint.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(complaint_id: int, db: Session = Depends(get_db)):
    """Get a single complaint by ID."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint


@router.get("/session/{session_id}", response_model=ComplaintResponse)
def get_complaint_by_session(session_id: str, db: Session = Depends(get_db)):
    """Get complaint by session ID."""
    complaint = db.query(Complaint).filter(Complaint.session_id == session_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found for this session")
    return complaint


@router.patch("/{complaint_id}", response_model=ComplaintResponse)
def update_complaint(complaint_id: int, payload: ComplaintUpdate, db: Session = Depends(get_db)):
    """Update complaint fields (e.g., after user edits in the form)."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(complaint, k, v)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/commit", response_model=ComplaintResponse)
def commit_complaint(payload: CommitComplaintRequest, db: Session = Depends(get_db)):
    """Commit a complaint to the QMS ledger (status → committed)."""
    complaint = db.query(Complaint).filter(Complaint.session_id == payload.session_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="No complaint found for this session. Create it first.")

    # Apply any final edits from the form
    update_data = payload.complaint_data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(complaint, k, v)

    complaint.status = "committed"
    db.commit()
    db.refresh(complaint)
    return complaint


@router.delete("/{complaint_id}")
def delete_complaint(complaint_id: int, db: Session = Depends(get_db)):
    """Delete a complaint record."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    db.delete(complaint)
    db.commit()
    return {"detail": "Complaint deleted successfully"}
