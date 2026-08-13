from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ─── Chat ────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    session_id: str
    message: str


class ChatMessageResponse(BaseModel):
    session_id: str
    role: str
    content: str
    extracted_data: Optional[dict] = None

    class Config:
        from_attributes = True


# ─── Complaint ────────────────────────────────────────────────────────────────

class ComplaintBase(BaseModel):
    session_id: str
    complaint_source: Optional[str] = None
    customer_name: Optional[str] = None
    product_name: Optional[str] = None
    product_strength: Optional[str] = None
    batch_lot_number: Optional[str] = None
    affected_quantity: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    originating_site: Optional[str] = None
    impacted_npm: Optional[str] = None
    defect_summary: Optional[str] = None
    complaint_category: Optional[str] = None
    complaint_description: Optional[str] = None
    severity: Optional[str] = None
    suggested_action: Optional[str] = None
    initial_risk_assessment: Optional[str] = None
    status: Optional[str] = "pending_triage"
    raw_input: Optional[str] = None


class ComplaintCreate(ComplaintBase):
    pass


class ComplaintUpdate(BaseModel):
    complaint_source: Optional[str] = None
    customer_name: Optional[str] = None
    product_name: Optional[str] = None
    product_strength: Optional[str] = None
    batch_lot_number: Optional[str] = None
    affected_quantity: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    originating_site: Optional[str] = None
    impacted_npm: Optional[str] = None
    defect_summary: Optional[str] = None
    complaint_category: Optional[str] = None
    complaint_description: Optional[str] = None
    severity: Optional[str] = None
    suggested_action: Optional[str] = None
    initial_risk_assessment: Optional[str] = None
    status: Optional[str] = None


class ComplaintResponse(ComplaintBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CommitComplaintRequest(BaseModel):
    session_id: str
    complaint_data: ComplaintUpdate
