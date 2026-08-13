from typing import TypedDict, Annotated, Sequence, Optional
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class ComplaintAgentState(TypedDict):
    # Conversation history
    messages: Annotated[Sequence[BaseMessage], add_messages]

    # Session tracking
    session_id: str
    raw_input: str

    # Section 1: Origin & Customer Details
    complaint_source: Optional[str]
    customer_name: Optional[str]

    # Section 2: Product & Batch Identification
    product_name: Optional[str]
    product_strength: Optional[str]
    batch_lot_number: Optional[str]
    affected_quantity: Optional[str]
    manufacturing_date: Optional[str]
    expiry_date: Optional[str]

    # Section 3: Facility & Material Impact
    originating_site: Optional[str]
    impacted_npm: Optional[str]

    # Section 4: Defect Analysis
    defect_summary: Optional[str]
    complaint_category: Optional[str]
    complaint_description: Optional[str]

    # AI Risk Assessment
    severity: Optional[str]
    suggested_action: Optional[str]
    initial_risk_assessment: Optional[str]

    # Workflow state
    status: str   # pending_triage | ready_to_commit | committed
    processing_step: Optional[str]
    error: Optional[str]
