from sqlalchemy import Column, Integer, String, Text, DateTime, func
from database import Base


class Complaint(Base):
    """
    Universal Operations & Record Model (OmniFlow AI)
    Supports both issues/complaints and services/proposals across all industries.
    """
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), unique=True, index=True, nullable=False)

    # Universal Workspace & Classification
    workspace = Column(String(100), default="general", index=True)  # ecommerce | tech_saas | services_freelance | healthcare_pharma | manufacturing | general
    record_type = Column(String(100), default="issue", index=True)  # issue | service_request | proposal | inquiry
    title = Column(String(300), nullable=True)

    # Origin & Customer / Client Details
    complaint_source = Column(String(100), nullable=True)  # e.g., Web Form, Email, Client Portal, Pharmacy, App
    customer_name = Column(String(200), nullable=True)     # Client / Customer / Stakeholder name

    # Subject / Item / Service Identification
    product_name = Column(String(200), nullable=True)      # Product / Project / Service name
    product_strength = Column(String(100), nullable=True)  # Version / Spec / Strength
    batch_lot_number = Column(String(100), nullable=True)  # Batch # / Order ID / Ticket ID / Invoice #
    affected_quantity = Column(String(100), nullable=True) # Quantity / Scope / Hours
    manufacturing_date = Column(String(100), nullable=True)# Start Date / Mfg Date / Delivery Date
    expiry_date = Column(String(100), nullable=True)       # Deadline / Expiry Date / Due Date

    # Facility / Department / Technology Impact
    originating_site = Column(String(200), nullable=True)  # Department / Server / Site / Tech Stack
    impacted_npm = Column(String(500), nullable=True)      # Sub-components / Dependencies / Deliverables

    # Details & Analysis
    defect_summary = Column(Text, nullable=True)           # Executive Summary / Deliverable Scope
    complaint_category = Column(String(200), nullable=True)# Category (Defect, Bug, Feature Request, Quote, etc.)
    complaint_description = Column(Text, nullable=True)    # Detailed description / Client Brief

    # AI Evaluation & Recommendations
    severity = Column(String(50), nullable=True)           # Critical / High / Major / Moderate / Low / Minor
    suggested_action = Column(Text, nullable=True)         # Recommended Next Steps / SLA Action / Workflow
    initial_risk_assessment = Column(Text, nullable=True)  # AI Analysis / Risk / Feasibility / Scope Evaluation
    response_draft = Column(Text, nullable=True)           # Auto-generated Email or Client Proposal Draft

    # Dynamic JSON Storage for Custom Domain Attributes
    custom_data = Column(Text, nullable=True)              # JSON string for dynamic key-value pairs

    # Status & Timestamps
    status = Column(String(50), default="pending_triage")  # pending_triage | ready_to_commit | committed | in_progress | resolved
    raw_input = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), index=True, nullable=False)
    role = Column(String(20), nullable=False)   # "user" | "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
