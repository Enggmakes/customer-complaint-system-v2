from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from .state import UniversalAgentState
from .nodes import (
    parse_complaint_node,
    classify_facility_node,
    defect_analysis_node,
    risk_assessment_node,
    format_response_node,
)


def build_universal_graph():
    """Build and compile the LangGraph universal operations pipeline."""

    builder = StateGraph(UniversalAgentState)

    # Register nodes
    builder.add_node("parse_complaint", parse_complaint_node)
    builder.add_node("classify_facility", classify_facility_node)
    builder.add_node("defect_analysis", defect_analysis_node)
    builder.add_node("risk_assessment", risk_assessment_node)
    builder.add_node("format_response", format_response_node)

    # Define sequential edges
    builder.set_entry_point("parse_complaint")
    builder.add_edge("parse_complaint", "classify_facility")
    builder.add_edge("classify_facility", "defect_analysis")
    builder.add_edge("defect_analysis", "risk_assessment")
    builder.add_edge("risk_assessment", "format_response")
    builder.add_edge("format_response", END)

    # Use in-memory checkpointer for session persistence
    memory = MemorySaver()
    graph = builder.compile(checkpointer=memory)
    return graph


# Singleton instance
complaint_graph = build_universal_graph()
universal_graph = complaint_graph
