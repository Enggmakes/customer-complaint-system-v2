from typing import TypedDict, Annotated, Sequence, Optional, Dict, Any
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class UniversalAgentState(TypedDict):
    # Conversation history
    messages: Annotated[Sequence[BaseMessage], add_messages]

    # Session & Scope tracking
    session_id: str
    raw_input: str
    workspace: Optional[str]        # ecommerce | tech_saas | services_freelance | healthcare_pharma | manufacturing | general
    record_type: Optional[str]      # issue | service_request | proposal | inquiry
    title: Optional[str]

    # Client / Customer Details
    complaint_source: Optional[str]
    customer_name: Optional[str]

    # Item / Product / Service Details
    product_name: Optional[str]
    product_strength: Optional[str]
    batch_lot_number: Optional[str]
    affected_quantity: Optional[str]
    manufacturing_date: Optional[str]
    expiry_date: Optional[str]

    # Facility / Department / Tech Stack
    originating_site: Optional[str]
    impacted_npm: Optional[str]

    # Analysis & Scope
    defect_summary: Optional[str]
    complaint_category: Optional[str]
    complaint_description: Optional[str]

    # AI Evaluation & Output Drafts
    severity: Optional[str]
    suggested_action: Optional[str]
    initial_risk_assessment: Optional[str]
    response_draft: Optional[str]
    custom_data: Optional[Dict[str, Any]]

    # Workflow state
    status: str   # pending_triage | ready_to_commit | committed
    processing_step: Optional[str]
    error: Optional[str]


# Backward-compatible alias
ComplaintAgentState = UniversalAgentState
