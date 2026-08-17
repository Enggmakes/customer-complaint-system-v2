from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ─── Base / Shared ────────────────────────────────────────────────────────────

class ComplaintBase(BaseModel):
    # Universal multi-industry identifiers
    workspace: Optional[str] = "general"
    record_type: Optional[str] = "issue"  # issue | service_request | proposal | inquiry
    title: Optional[str] = None

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
    response_draft: Optional[str] = None
    custom_data: Optional[Dict[str, Any]] = None
    status: Optional[str] = "pending_triage"
    raw_input: Optional[str] = None


ComplaintCreate = ComplaintBase


# ─── Form Input / Update (Partial) ────────────────────────────────────────────

class ComplaintUpdate(BaseModel):
    workspace: Optional[str] = None
    record_type: Optional[str] = None
    title: Optional[str] = None
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
    response_draft: Optional[str] = None
    custom_data: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    raw_input: Optional[str] = None


# ─── Full Response Model ──────────────────────────────────────────────────────

class ComplaintResponse(ComplaintBase):
    id: int
    session_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Chat Request / Response ──────────────────────────────────────────────────

class ChatMessageRequest(BaseModel):
    session_id: str
    message: str
    workspace: Optional[str] = "general"
    record_type: Optional[str] = "issue"


ChatMessage = ChatMessageRequest


class ChatMessageResponse(BaseModel):
    session_id: str
    ai_response: str
    extracted_data: Optional[Dict[str, Any]] = None
    status: str = "pending_triage"


class CommitComplaintRequest(BaseModel):
    session_id: str
    complaint_data: ComplaintUpdate


# ─── AI Tools Schemas ────────────────────────────────────────────────────────

class ProposalGenerateRequest(BaseModel):
    service_title: str
    client_name: Optional[str] = "Client"
    service_description: str
    target_timeline: Optional[str] = "2 weeks"
    budget_range: Optional[str] = "$1,000 - $3,000"
    deliverables: Optional[List[str]] = None
    workspace: Optional[str] = "services_freelance"


class ProposalGenerateResponse(BaseModel):
    proposal_title: str
    executive_summary: str
    technical_approach: Optional[str] = ""
    deliverables: List[Dict[str, Any]]
    estimated_timeline: str
    estimated_pricing: str
    payment_terms: str
    key_milestones: Optional[List[str]] = []
    markdown_content: str


class EmailDraftRequest(BaseModel):
    recipient_name: Optional[str] = "Valued Customer"
    recipient_role: Optional[str] = "Customer / Client"
    context_type: str = "complaint_resolution"  # complaint_resolution | service_quote | project_update | inquiry_response
    subject_matter: str
    tone: Optional[str] = "empathetic_professional"  # empathetic_professional | formal | friendly | urgent
    key_points: Optional[List[str]] = None
    workspace: Optional[str] = "general"


class EmailDraftResponse(BaseModel):
    subject_line: str
    email_body: str
    suggested_followup_days: int
