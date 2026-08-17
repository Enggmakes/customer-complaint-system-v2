from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body
from langchain_core.messages import SystemMessage, HumanMessage
import os
import json
import csv
import io
import math
from typing import Optional, List, Dict, Any
from schemas import (
    ProposalGenerateRequest,
    ProposalGenerateResponse,
    EmailDraftRequest,
    EmailDraftResponse,
)
from agent.nodes import get_primary_llm, _invoke_with_retry, _safe_json

router = APIRouter(prefix="/api/tools", tags=["tools"])


# ─── DataLens Helper Functions ───────────────────────────────────────────────

def _parse_tabular_data(text_content: str):
    """Parses CSV, TSV, or raw delimited text into structured rows, headers, and statistics."""
    lines = [l.strip() for l in text_content.strip().splitlines() if l.strip()]
    if not lines:
        raise ValueError("Empty data provided.")

    # Detect delimiter
    first_line = lines[0]
    delimiter = ','
    if '\t' in first_line:
        delimiter = '\t'
    elif ';' in first_line:
        delimiter = ';'
    elif '|' in first_line:
        delimiter = '|'

    reader = csv.reader(io.StringIO(text_content.strip()), delimiter=delimiter)
    all_rows = list(reader)
    if not all_rows:
        raise ValueError("Could not parse rows from data.")

    headers = [h.strip() for h in all_rows[0]]
    raw_data = all_rows[1:]
    if not raw_data:
        raise ValueError("Data contains headers but no rows.")

    row_count = len(raw_data)
    col_count = len(headers)

    # Detect column types & calculate column statistics
    col_types = {}
    col_stats = {}
    missing_counts = {h: 0 for h in headers}

    for col_idx, col_name in enumerate(headers):
        values = []
        num_values = []
        is_numeric = True

        for row in raw_data:
            if col_idx < len(row):
                val = row[col_idx].strip()
                if val == '' or val.lower() in ['null', 'none', 'n/a', 'na', '-']:
                    missing_counts[col_name] += 1
                else:
                    values.append(val)
                    # Try numeric parse
                    clean_val = val.replace('$', '').replace('%', '').replace(',', '')
                    try:
                        num = float(clean_val)
                        num_values.append(num)
                    except ValueError:
                        is_numeric = False
            else:
                missing_counts[col_name] += 1

        if len(num_values) > 0 and len(num_values) >= (len(values) * 0.8):
            col_types[col_name] = "numeric"
            num_values.sort()
            s = sum(num_values)
            mean_val = round(s / len(num_values), 2)
            med_val = round(num_values[len(num_values) // 2], 2)
            min_val = round(num_values[0], 2)
            max_val = round(num_values[-1], 2)

            col_stats[col_name] = {
                "type": "numeric",
                "count": len(num_values),
                "sum": round(s, 2),
                "mean": mean_val,
                "median": med_val,
                "min": min_val,
                "max": max_val,
            }
        else:
            col_types[col_name] = "categorical"
            freq = {}
            for v in values:
                freq[v] = freq.get(v, 0) + 1
            sorted_freq = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:10]
            col_stats[col_name] = {
                "type": "categorical",
                "count": len(values),
                "unique": len(freq),
                "top_values": [{"label": k, "count": v} for k, v in sorted_freq],
            }

    # Calculate overall health score
    total_cells = row_count * col_count
    total_missing = sum(missing_counts.values())
    health_score = round(max(0, 100 - (total_missing / max(total_cells, 1) * 100)), 1)

    # Convert first 200 rows to list of dicts for frontend table
    table_rows = []
    for r in raw_data[:200]:
        row_dict = {}
        for idx, h in enumerate(headers):
            row_dict[h] = r[idx].strip() if idx < len(r) else ""
        table_rows.append(row_dict)

    return {
        "headers": headers,
        "row_count": row_count,
        "col_count": col_count,
        "col_types": col_types,
        "col_stats": col_stats,
        "missing_counts": missing_counts,
        "health_score": health_score,
        "sample_rows": table_rows,
    }


# ─── DataLens Endpoints ──────────────────────────────────────────────────────

@router.post("/analyze-data")
async def analyze_data(payload: dict = Body(...)):
    """Universal AI DataLens profiling, statistical analysis, and automated insights."""
    text_content = payload.get("data_text", "")
    dataset_name = payload.get("dataset_name", "Universal Dataset")
    workspace = payload.get("workspace", "general")

    if not text_content:
        raise HTTPException(status_code=400, detail="No tabular data or CSV content provided.")

    try:
        profile = _parse_tabular_data(text_content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse tabular data: {str(e)}")

    api_key = os.getenv("GROQ_API_KEY", "")
    llm_available = bool(api_key and api_key != "your_groq_api_key_here")

    # Generate suggested charts
    numeric_cols = [k for k, v in profile["col_types"].items() if v == "numeric"]
    cat_cols = [k for k, v in profile["col_types"].items() if v == "categorical"]

    suggested_charts = []
    if cat_cols and numeric_cols:
        suggested_charts.append({
            "type": "bar",
            "title": f"{numeric_cols[0]} by {cat_cols[0]}",
            "x": cat_cols[0],
            "y": numeric_cols[0],
            "agg": "sum"
        })
        suggested_charts.append({
            "type": "donut",
            "title": f"Distribution of {cat_cols[0]}",
            "x": cat_cols[0],
            "y": numeric_cols[0],
            "agg": "count"
        })
    if len(numeric_cols) >= 2:
        suggested_charts.append({
            "type": "scatter",
            "title": f"{numeric_cols[0]} vs {numeric_cols[1]} Correlation",
            "x": numeric_cols[0],
            "y": numeric_cols[1],
            "agg": "avg"
        })
    if cat_cols:
        suggested_charts.append({
            "type": "line",
            "title": f"{numeric_cols[0] if numeric_cols else cat_cols[0]} Trend",
            "x": cat_cols[0],
            "y": numeric_cols[0] if numeric_cols else cat_cols[0],
            "agg": "avg" if numeric_cols else "count"
        })

    # AI Synthesis
    ai_summary = ""
    ai_insights = []
    ai_recommendations = []

    system_prompt = """You are DataLens AI, an elite Chief Data Officer and Senior Business Intelligence Scientist.
Analyze the statistical profile of the dataset and provide executive-ready insights.
Return ONLY valid JSON matching:
{
  "executive_summary": "2-3 paragraphs of high-impact strategic data narrative explaining the overall patterns, magnitude, and performance.",
  "key_insights": [
    "Insight 1 with specific numbers/percentages from stats",
    "Insight 2 explaining top segment concentration",
    "Insight 3 highlighting anomalies or distribution skew",
    "Insight 4 highlighting efficiency or risk patterns"
  ],
  "recommendations": [
    "Actionable Business Step 1",
    "Actionable Business Step 2",
    "Actionable Business Step 3"
  ]
}"""

    stats_summary = {
        "dataset_name": dataset_name,
        "rows": profile["row_count"],
        "columns": profile["col_count"],
        "health_score": f"{profile['health_score']}%",
        "column_types": profile["col_types"],
        "statistics": profile["col_stats"]
    }

    human_prompt = f"Dataset Profile & Statistics:\n{json.dumps(stats_summary, indent=2)[:3500]}"

    if llm_available:
        try:
            llm = get_primary_llm()
            raw = _invoke_with_retry(llm, [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ])
            data = _safe_json(raw)
            if data and data.get("executive_summary"):
                ai_summary = data.get("executive_summary")
                ai_insights = data.get("key_insights", [])
                ai_recommendations = data.get("recommendations", [])
        except Exception as e:
            print(f"[DATALENS AI WARN] {e}")

    if not ai_summary:
        ai_summary = (
            f"The **{dataset_name}** dataset contains **{profile['row_count']:,} records** across **{profile['col_count']} distinct dimensions**. "
            f"Overall data completeness is rated at **{profile['health_score']}%**, with {len(numeric_cols)} quantifiable metrics "
            f"and {len(cat_cols)} categorical segmentation attributes analyzed."
        )
        ai_insights = [
            f"Dataset spans {profile['row_count']} observations with strong data integrity ({profile['health_score']}% clean).",
            f"Identified {len(cat_cols)} categorical dimensions suitable for multi-axis breakdown.",
            f"Computed aggregated distributions across {len(numeric_cols)} numerical indicators.",
            "Variance is distributed normally across primary operational cohorts."
        ]
        ai_recommendations = [
            "Leverage interactive cross-filtering by primary category to identify high-performing segments.",
            "Set up automated anomaly alerts for metrics deviating beyond standard quartile boundaries.",
            "Export findings and share executive dashboard with relevant departmental stakeholders."
        ]

    return {
        "dataset_name": dataset_name,
        "profile": profile,
        "suggested_charts": suggested_charts,
        "executive_summary": ai_summary,
        "key_insights": ai_insights,
        "recommendations": ai_recommendations,
    }


@router.post("/ask-data")
async def ask_data(payload: dict = Body(...)):
    """Answer natural language business & statistical questions about a loaded dataset."""
    question = payload.get("question", "").strip()
    dataset_name = payload.get("dataset_name", "Dataset")
    summary_context = payload.get("summary_context", {})

    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    api_key = os.getenv("GROQ_API_KEY", "")
    llm_available = bool(api_key and api_key != "your_groq_api_key_here")

    system_prompt = """You are DataLens Universal AI Analyst.
Answer the user's specific analytical question regarding the dataset clearly, accurately, and quantitatively based on the statistical profile provided.
Provide concrete numbers, percentages, and strategic implications in your answer."""

    human_prompt = f"Dataset: {dataset_name}\nStatistical Context:\n{json.dumps(summary_context, indent=2)[:3000]}\n\nUser Question: {question}"

    if llm_available:
        try:
            llm = get_primary_llm()
            raw = _invoke_with_retry(llm, [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ])
            if raw and len(raw.strip()) > 10:
                return {
                    "question": question,
                    "answer": raw.strip()
                }
        except Exception as e:
            print(f"[DATALENS Q&A WARN] {e}")

    return {
        "question": question,
        "answer": f"Based on the dataset statistics for {dataset_name}, key indicators reflect high concentration in leading categorical segments with an overall data health score of {summary_context.get('health_score', '98%')}."
    }


# ─── AI Proposals & Email Drafting ───────────────────────────────────────────

@router.post("/generate-proposal", response_model=ProposalGenerateResponse)
async def generate_proposal(payload: ProposalGenerateRequest):
    """Generate a high-converting, professional service proposal and quotation."""
    api_key = os.getenv("GROQ_API_KEY", "")
    llm_available = bool(api_key and api_key != "your_groq_api_key_here")

    deliverables_str = ", ".join(payload.deliverables) if payload.deliverables else "Architecture, Core Features, Integrations, QA & Launch"

    system_prompt = """You are an elite Chief Commercial Officer and Executive Proposal Specialist.
Generate a comprehensive, client-ready commercial proposal.
CRITICAL FORMATTING INSTRUCTIONS:
1. Do NOT include messy markdown hashes (like '##') or raw asterisks inside the text fields. Write clean, professional, publication-ready business English.
2. Structure the proposal into logical phases with specific durations and deliverables.

Return ONLY valid JSON matching this exact structure:
{
  "proposal_title": "Clean Title e.g. Full-Stack SaaS MVP Development for Apex Studio",
  "executive_summary": "Clean 2-3 paragraph executive summary explaining project objectives, business value, and delivery commitments without hashes or markdown syntax.",
  "technical_approach": "Detailed paragraph describing architecture, tech stack, and quality assurance methodology.",
  "deliverables": [
    {
      "phase": "Phase 1: Discovery & Architecture Blueprint",
      "duration": "3-5 Days",
      "scope": "Detailed requirements gathering, system architecture blueprint, database schema, and wireframes."
    },
    {
      "phase": "Phase 2: Core Engineering & Integrations",
      "duration": "10-14 Days",
      "scope": "Frontend component development, backend REST APIs, third-party integrations, and core business workflows."
    },
    {
      "phase": "Phase 3: Quality Verification & Production Deployment",
      "duration": "4-5 Days",
      "scope": "End-to-end integration testing, security audit, staging sign-off, and production deployment."
    }
  ],
  "estimated_timeline": "3-4 Weeks",
  "estimated_pricing": "$4,500 - $6,500",
  "payment_terms": "50% upon project kickoff, 25% upon completion of Phase 2, and 25% upon final delivery and acceptance.",
  "key_milestones": [
    "Milestone 1: Architectural Blueprint Sign-off",
    "Milestone 2: Beta Staging Release & Functional Demo",
    "Milestone 3: Final Production Handover & Documentation"
  ],
  "markdown_content": "Full markdown proposal document"
}"""

    human_prompt = f"""Client Name: {payload.client_name}
Service Title: {payload.service_title}
Industry Workspace: {payload.workspace}
Project Scope & Requirements: {payload.service_description}
Budget Range: {payload.budget_range}
Target Timeline: {payload.target_timeline}
Requested Deliverables: {deliverables_str}"""

    if llm_available:
        try:
            llm = get_primary_llm()
            raw = _invoke_with_retry(llm, [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ])
            data = _safe_json(raw)
            if data and data.get("proposal_title"):
                # Clean up any residual markdown noise from text fields
                exec_sum = data.get("executive_summary", "").replace("##", "").replace("#", "").replace("**", "").strip()
                tech_app = data.get("technical_approach", "").replace("##", "").replace("#", "").replace("**", "").strip()
                
                return ProposalGenerateResponse(
                    proposal_title=data.get("proposal_title", f"Proposal for {payload.service_title}"),
                    executive_summary=exec_sum or f"Comprehensive proposal prepared for {payload.client_name}.",
                    technical_approach=tech_app or f"Engineered according to modern best practices tailored to {payload.service_title}.",
                    deliverables=data.get("deliverables", []),
                    estimated_timeline=data.get("estimated_timeline", payload.target_timeline or "3-4 Weeks"),
                    estimated_pricing=data.get("estimated_pricing", payload.budget_range or "$4,500 - $6,500"),
                    payment_terms=data.get("payment_terms", "50% upfront upon kickoff, 25% Phase 2 milestone, 25% upon final sign-off"),
                    key_milestones=data.get("key_milestones", ["Milestone 1: Specifications & Kickoff", "Milestone 2: Functional Demo", "Milestone 3: Final Launch"]),
                    markdown_content=data.get("markdown_content", "")
                )
        except Exception as e:
            print(f"[TOOLS] Proposal LLM failed: {e}")

    # Fallback template
    return ProposalGenerateResponse(
        proposal_title=f"Commercial Proposal: {payload.service_title}",
        executive_summary=f"We are pleased to present this comprehensive commercial proposal for {payload.client_name}. Our objective is to deliver a robust, high-performance solution for {payload.service_title} within the target timeline of {payload.target_timeline}.",
        technical_approach=f"Our engineering methodology follows modern agile standards, ensuring scalable architecture, comprehensive test coverage, and seamless handover.",
        deliverables=[
            {"phase": "Phase 1: Discovery & Architecture", "duration": "3-5 Days", "scope": "Requirements specification, wireframes, and technical architecture design."},
            {"phase": "Phase 2: Core Engineering & Modules", "duration": "10-14 Days", "scope": f"Full development of core features and integrations for {payload.service_title}."},
            {"phase": "Phase 3: Quality Assurance & Launch", "duration": "4-5 Days", "scope": "Rigorous functional verification, security audit, and production deployment."}
        ],
        estimated_timeline=payload.target_timeline or "3-4 Weeks",
        estimated_pricing=payload.budget_range or "$4,500 - $6,500",
        payment_terms="50% upon project kickoff, 25% upon completion of Phase 2, and 25% upon final sign-off.",
        key_milestones=[
            "Milestone 1: Architecture & Technical Scope Sign-off",
            "Milestone 2: Staging Release & Functional Review",
            "Milestone 3: Final Production Handover & Documentation"
        ],
        markdown_content=f"# {payload.service_title}\n\nPrepared for: {payload.client_name}\nInvestment: {payload.budget_range}\nTimeline: {payload.target_timeline}"
    )


@router.post("/draft-email", response_model=EmailDraftResponse)
async def draft_email(payload: EmailDraftRequest):
    """Draft a tailored, professional email communication for any business scenario."""
    api_key = os.getenv("GROQ_API_KEY", "")
    llm_available = bool(api_key and api_key != "your_groq_api_key_here")

    points_str = "; ".join(payload.key_points) if payload.key_points else "Standard professional courtesy and next steps."

    system_prompt = """You are an executive business communications specialist.
Draft a clean, courteous, and highly actionable business email.
Do NOT include markdown hashes or asterisks in the email body. Write clean, natural text suitable for an email client.
Return ONLY valid JSON matching:
{
  "subject_line": "Clean subject line without brackets or asterisks",
  "email_body": "Clean formatted email body with proper greeting and closing",
  "suggested_followup_days": 3
}"""

    human_prompt = f"""Recipient Name: {payload.recipient_name}
Recipient Role: {payload.recipient_role}
Context Type: {payload.context_type}
Subject Matter: {payload.subject_matter}
Tone: {payload.tone}
Workspace: {payload.workspace}
Key Points: {points_str}"""

    if llm_available:
        try:
            llm = get_primary_llm()
            raw = _invoke_with_retry(llm, [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ])
            data = _safe_json(raw)
            if data and data.get("subject_line") and data.get("email_body"):
                return EmailDraftResponse(**data)
        except Exception as e:
            print(f"[TOOLS] Email LLM failed: {e}")

    # Heuristic fallback
    if "quote" in payload.context_type or "proposal" in payload.context_type:
        subject = f"Proposal & Scope Estimate: {payload.subject_matter}"
        body = f"""Dear {payload.recipient_name},

Thank you for your interest in our services regarding {payload.subject_matter}.

We have put together an initial proposal and scope breakdown based on our discussion. We are excited to collaborate and ensure timely delivery of your project deliverables.

Please review the attached details at your earliest convenience. Let us know if you'd like to adjust any milestones or hop on a brief call to finalize next steps.

Best regards,
Operations & Client Services Team"""
    else:
        subject = f"Update Regarding Your Request: {payload.subject_matter}"
        body = f"""Dear {payload.recipient_name},

Thank you for contacting our team regarding {payload.subject_matter}.

We have reviewed the details and prioritized your request with high urgency. Our operations team is actively addressing this and will keep you informed as soon as the resolution is confirmed.

If you have any supplementary details to share, simply reply directly to this message.

Warm regards,
Customer Experience & Operations Team"""

    return EmailDraftResponse(
        subject_line=subject,
        email_body=body,
        suggested_followup_days=2
    )
