from sqlalchemy import Column, Integer, String, Text, DateTime, func
from database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), unique=True, index=True, nullable=False)

    # Origin & Customer
    complaint_source = Column(String(100), nullable=True)
    customer_name = Column(String(200), nullable=True)

    # Product & Batch
    product_name = Column(String(200), nullable=True)
    product_strength = Column(String(100), nullable=True)
    batch_lot_number = Column(String(100), nullable=True)
    affected_quantity = Column(String(100), nullable=True)
    manufacturing_date = Column(String(100), nullable=True)
    expiry_date = Column(String(100), nullable=True)

    # Facility & Material
    originating_site = Column(String(200), nullable=True)
    impacted_npm = Column(String(500), nullable=True)

    # Defect Analysis
    defect_summary = Column(Text, nullable=True)
    complaint_category = Column(String(200), nullable=True)
    complaint_description = Column(Text, nullable=True)

    # AI Risk Assessment
    severity = Column(String(50), nullable=True)
    suggested_action = Column(Text, nullable=True)
    initial_risk_assessment = Column(Text, nullable=True)

    # Status & Timestamps
    status = Column(String(50), default="pending_triage")
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
