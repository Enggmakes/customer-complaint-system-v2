import json
import os
import re
import traceback
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from dotenv import load_dotenv
from .state import UniversalAgentState

load_dotenv()

# ─── LLM Clients ─────────────────────────────────────────────────────────────

def get_primary_llm():
    api_key = os.getenv("GROQ_API_KEY", "")
    model = os.getenv("PRIMARY_MODEL", "openai/gpt-oss-120b")
    return ChatGroq(
        model=model,
        api_key=api_key if api_key and api_key != "your_groq_api_key_here" else "dummy_key",
        temperature=0.1,
        max_tokens=2048,
    )

def get_fast_llm():
    api_key = os.getenv("GROQ_API_KEY", "")
    model = os.getenv("FAST_MODEL", "openai/gpt-oss-20b")
    return ChatGroq(
        model=model,
        api_key=api_key if api_key and api_key != "your_groq_api_key_here" else "dummy_key",
        temperature=0.0,
        max_tokens=1024,
    )


def _safe_json(text: str) -> dict:
    if not text:
        return {}

    match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    start = text.find('{')
    if start != -1:
        depth = 0
        for i, ch in enumerate(text[start:], start):
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    candidate = text[start:i + 1]
                    try:
                        return json.loads(candidate)
                    except json.JSONDecodeError:
                        cleaned = re.sub(r',\s*}', '}', candidate)
                        cleaned = re.sub(r',\s*]', ']', cleaned)
                        cleaned = re.sub(r'[\x00-\x1f\x7f]', ' ', cleaned)
                        try:
                            return json.loads(cleaned)
                        except json.JSONDecodeError:
                            pass
                    break

    return {}


def _invoke_with_retry(llm, messages, retries=1):
    fallback_models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b", "groq/compound"]
    api_key = os.getenv("GROQ_API_KEY", "")
    
    for attempt in range(retries + 1):
        try:
            response = llm.invoke(messages)
            return response.content
        except Exception as e:
            print(f"[ERROR] LLM invoke attempt {attempt+1} failed: {e}")
            if attempt < len(fallback_models) and api_key and api_key != "your_groq_api_key_here":
                alt_model = fallback_models[attempt]
                print(f"[RETRY] Attempting fallback model: {alt_model}")
                try:
                    alt_llm = ChatGroq(model=alt_model, api_key=api_key, temperature=0.1, max_tokens=2048)
                    response = alt_llm.invoke(messages)
                    return response.content
                except Exception as alt_err:
                    print(f"[RETRY ERROR] Fallback model {alt_model} failed: {alt_err}")
            if attempt == retries:
                raise
    return ""


# ─── Heuristic Pattern Extractors (Multi-Workspace Fallbacks) ────────────────

INVALID_BATCH_IDS = {
    "ber", "number", "numbers", "no", "num", "nums", "id", "ids", "code", "the",
    "a", "an", "is", "to", "for", "in", "of", "and", "or", "it", "correct",
    "fix", "change", "update", "set", "batch", "order", "ticket", "lot", "ref",
    "reference", "as", "check", "modify", "replace", "null", "none", "n/a"
}


def _detect_workspace_and_type(text: str, default_ws: str = None, default_type: str = None):
    t_lower = text.lower()
    ws = default_ws or "general"
    rtype = default_type or "issue"

    # Workspace detection
    if any(k in t_lower for k in ["order", "shipping", "refund", "return", "package", "tracking", "amazon", "shopify", "ecommerce", "cart", "courier", "fedex", "ups"]):
        ws = "ecommerce"
    elif any(k in t_lower for k in ["bug", "crash", "error", "api", "latency", "server", "code", "database", "stack", "frontend", "backend", "deploy", "ui", "login failure", "endpoint"]):
        ws = "tech_saas"
    elif any(k in t_lower for k in ["proposal", "quote", "freelance", "develop website", "design logo", "hourly", "consulting", "brief", "milestone", "client project", "scope of work"]):
        ws = "services_freelance"
    elif any(k in t_lower for k in ["capsule", "tablet", "pharma", "batch", "mg", "expiry", "dosage", "adverse", "patient", "clinic", "hospital", "doctor", "prescription"]):
        ws = "healthcare_pharma"
    elif any(k in t_lower for k in ["machine", "raw material", "assembly", "factory", "warehouse", "supply chain", "conveyor", "defect in batch", "manufacturing site"]):
        ws = "manufacturing"

    # Record type detection
    if any(k in t_lower for k in ["proposal", "quotation", "quote", "estimate", "scope of work", "project cost", "how much for", "pricing for"]):
        rtype = "proposal"
    elif any(k in t_lower for k in ["service", "need", "request", "build", "hire", "schedule", "book", "consultation", "feature request"]):
        rtype = "service_request"
    elif any(k in t_lower for k in ["inquiry", "question", "how does", "information regarding", "status check"]):
        rtype = "inquiry"
    elif any(k in t_lower for k in ["complaint", "issue", "bug", "broken", "damaged", "failed", "discolor", "leak", "problem", "defect", "error"]):
        rtype = "issue"

    return ws, rtype


def _heuristic_universal_extract(text: str, existing: dict = None, workspace: str = "general", record_type: str = "issue") -> dict:
    res = dict(existing) if existing else {}
    t_lower = text.lower()

    # Sanitize existing invalid batch number artifacts
    if res.get("batch_lot_number") and str(res.get("batch_lot_number")).strip().lower() in INVALID_BATCH_IDS:
        res.pop("batch_lot_number", None)

    # 1. Detect Customer / Client
    cust_match = re.search(r"(?:customer|client|from|reported by|user|buyer|patient)\s*(?:is|to|[:=])?\s*([A-Za-z0-9\s\.\-']{2,40})", text, re.IGNORECASE)
    if cust_match:
        val = cust_match.group(1).strip().split('\n')[0].split('.')[0].strip()
        if val.lower() not in ["the", "a", "an", "is", "to", "from"]:
            res["customer_name"] = val
    elif not res.get("customer_name"):
        if workspace == "ecommerce":
            res["customer_name"] = "Online Shopper"
        elif workspace == "services_freelance":
            res["customer_name"] = "Prospective Client"
        elif workspace == "tech_saas":
            res["customer_name"] = "SaaS Enterprise User"
        elif workspace == "healthcare_pharma":
            res["customer_name"] = "Apollo Pharmacy"
        else:
            res["customer_name"] = "General Client"

    # 2. Detect Product / Service / Project Title
    prod_match = re.search(r"(?:product|item|service|project|software|system)\s*(?:is|to|[:=])?\s*([A-Za-z0-9\s\.\-']{2,50})", text, re.IGNORECASE)
    if prod_match:
        val = prod_match.group(1).strip().split('\n')[0].split('.')[0].strip()
        if val.lower() not in ["the", "a", "an", "is", "to"]:
            res["product_name"] = val
    elif not res.get("product_name"):
        if workspace == "ecommerce":
            res["product_name"] = "Wireless Earbuds Pro"
        elif workspace == "services_freelance":
            res["product_name"] = "Full-Stack Web App Development"
        elif workspace == "tech_saas":
            res["product_name"] = "Authentication & Billing Module"
        elif workspace == "healthcare_pharma":
            res["product_name"] = "Amoxicillin Capsules 500mg"
        else:
            res["product_name"] = "Operations Workflow Request"

    # 3. Detect Order ID / Batch / Ticket ID / Direct Correction
    extracted_batch = None

    # 3a. Direct correction pattern (e.g. "correct batch number amx56584", "change batch to amx56584", "update batch #AMX-102")
    corr_match = re.search(
        r"(?:correct|change|update|fix|set|modify|replace)\s+(?:the\s+)?(?:batch|order|ticket|lot|reference|ref|work\s*order)?\s*(?:number|no\b|num\b|id\b|#)?\s*(?:to|is|as|[:=])?\s*([A-Za-z0-9\-_]+)",
        text,
        re.IGNORECASE
    )
    if corr_match:
        val = corr_match.group(1).strip()
        if val.lower() not in INVALID_BATCH_IDS and len(val) >= 2:
            extracted_batch = val.upper() if len(val) <= 14 else val

    # 3b. Standard labeled pattern (e.g. "batch number AMX240602", "batch #AMX240602", "order #ORD-991", "ticket TK-1234")
    if not extracted_batch:
        id_match = re.search(
            r"(?:order|batch|ticket|invoice|tracking|lot|work\s*order|ref|reference)\s*(?:(?:number|no\b|num\b|id\b|#)\s*)?(?:is|to|[:=#])?\s*([A-Za-z0-9\-_]+)",
            text,
            re.IGNORECASE
        )
        if id_match:
            val = id_match.group(1).strip()
            if val.lower() not in INVALID_BATCH_IDS and len(val) >= 2:
                extracted_batch = val.upper() if len(val) <= 14 else val

    # 3c. Standalone alphanumeric identifier pattern (e.g. "AMX56584", "AMX240602", "ORD-2026-9041", "#88201")
    if not extracted_batch:
        standalone_id = re.search(r"\b([A-Za-z]{2,6}[-_]?\d{3,8}|#\d{4,8})\b", text)
        if standalone_id:
            val = standalone_id.group(1).strip()
            if val.lower() not in INVALID_BATCH_IDS:
                extracted_batch = val.upper()

    if extracted_batch:
        res["batch_lot_number"] = extracted_batch
    elif not res.get("batch_lot_number"):
        res["batch_lot_number"] = "ORD-2026-9041" if workspace == "ecommerce" else "AMX240602" if workspace == "healthcare_pharma" else "TK-8820"

    # 4. Detect Quantity / Budget / Scope
    qty_match = re.search(r"(\d+)\s*(capsules|tablets|units|items|hours|days|pages|licenses|pcs)\b", text, re.IGNORECASE)
    budget_match = re.search(r"(\$\s*[\d,]+|\b\d+\s*USD|\b\d+\s*EUR|\bINR\s*[\d,]+|\bRs\.\s*[\d,]+)", text, re.IGNORECASE)
    if qty_match:
        res["affected_quantity"] = f"{qty_match.group(1)} {qty_match.group(2)}"
    elif budget_match:
        res["affected_quantity"] = budget_match.group(1).strip()
    elif not res.get("affected_quantity"):
        res["affected_quantity"] = "1 unit" if record_type == "issue" else "30 Estimated Hours"

    # 5. Detect Dates (Mfg / Start Date / Deadline)
    date_match = re.search(r"\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b", text, re.IGNORECASE)
    if date_match:
        res["manufacturing_date"] = date_match.group(0).capitalize()
    if not res.get("manufacturing_date"):
        res["manufacturing_date"] = "March 2026"
    if not res.get("expiry_date"):
        res["expiry_date"] = "December 2027" if workspace == "healthcare_pharma" else "Within 14 Days"

    # 6. Severity / Priority
    if any(k in t_lower for k in ["critical", "urgent", "emergency", "blocker", "p0", "p1"]):
        res["severity"] = "Critical"
    elif any(k in t_lower for k in ["major", "high", "important", "p2"]):
        res["severity"] = "Major"
    elif any(k in t_lower for k in ["minor", "low", "trivial", "p4"]):
        res["severity"] = "Minor"
    elif not res.get("severity"):
        res["severity"] = "Major"

    # 7. Category
    if workspace == "ecommerce":
        res["complaint_category"] = "Shipping Delay & Damage" if "delay" in t_lower or "damag" in t_lower else "Return & Refund Request"
    elif workspace == "services_freelance":
        res["complaint_category"] = "Web & Mobile Development Quote" if "web" in t_lower or "app" in t_lower else "Custom Consulting & Scope"
    elif workspace == "tech_saas":
        res["complaint_category"] = "Application Crash / API Error" if "crash" in t_lower or "api" in t_lower else "Feature Request & Enhancement"
    elif workspace == "healthcare_pharma":
        res["complaint_category"] = "Product Quality / Discoloration" if "discolor" in t_lower or "defect" in t_lower else "Quality Assurance & Supply"
    else:
        res["complaint_category"] = "Operations Request"

    # 8. Description & Summary
    is_field_correction = any(k in t_lower for k in ["correct", "change", "update", "fix", "set batch", "batch number"])
    if not res.get("complaint_description") or (is_field_correction and len(res.get("complaint_description", "")) < 20):
        if not is_field_correction:
            res["complaint_description"] = text.strip() or f"{res.get('customer_name')} submitted a {record_type} for {res.get('product_name')}."

    if not res.get("defect_summary"):
        res["defect_summary"] = f"[{workspace.upper()}] {record_type.title()}: {res.get('customer_name')} regarding '{res.get('product_name')}' ({res.get('batch_lot_number')}). Category: {res.get('complaint_category')}."

    if not res.get("originating_site"):
        sites = {
            "ecommerce": "Fulfillment Center East (Warehouse 4)",
            "tech_saas": "Production Cloud Cluster (US-East-1)",
            "services_freelance": "Digital Solutions & Engineering Unit",
            "healthcare_pharma": "Block A - Primary Manufacturing",
            "manufacturing": "Assembly Line 3 - Precision Plant",
            "general": "Corporate Operations Hub"
        }
        res["originating_site"] = sites.get(workspace, "Operations Hub")

    if not res.get("impacted_npm"):
        npms = {
            "ecommerce": "Secondary Packaging & Courier Box",
            "tech_saas": "REST API Gateway & Postgres DB",
            "services_freelance": "Frontend React UI & Stripe Payment Integration",
            "healthcare_pharma": "Primary packaging (HDPE bottle)",
            "manufacturing": "Hydraulic Pressure Seal",
            "general": "Core Deliverables & Specifications"
        }
        res["impacted_npm"] = npms.get(workspace, "Core Deliverables")

    return res


# ─── Node 1: Universal Intake & Intent Router ─────────────────────────────────

def parse_complaint_node(state: UniversalAgentState) -> dict:
    """Dynamically parses and extracts structured operational data across any workspace & record type."""
    raw_input = state.get("raw_input", "")
    if not raw_input:
        messages = list(state.get("messages", []))
        if messages:
            last = messages[-1]
            raw_input = last.content if hasattr(last, "content") else str(last)

    active_ws = state.get("workspace") or "general"
    active_type = state.get("record_type") or "issue"

    detected_ws, detected_type = _detect_workspace_and_type(raw_input, active_ws, active_type)
    if active_ws == "general" and detected_ws != "general":
        active_ws = detected_ws
    if active_type == "issue" and detected_type != "issue":
        active_type = detected_type

    print(f"\n[NODE 1] Universal Intake — Workspace: {active_ws}, Record Type: {active_type}")

    existing_batch = state.get("batch_lot_number")
    if existing_batch and str(existing_batch).strip().lower() in INVALID_BATCH_IDS:
        existing_batch = None

    existing_fields = {
        "workspace": active_ws,
        "record_type": active_type,
        "title": state.get("title"),
        "complaint_source": state.get("complaint_source"),
        "customer_name": state.get("customer_name"),
        "product_name": state.get("product_name"),
        "product_strength": state.get("product_strength"),
        "batch_lot_number": existing_batch,
        "affected_quantity": state.get("affected_quantity"),
        "manufacturing_date": state.get("manufacturing_date"),
        "expiry_date": state.get("expiry_date"),
        "originating_site": state.get("originating_site"),
        "impacted_npm": state.get("impacted_npm"),
        "defect_summary": state.get("defect_summary"),
        "complaint_category": state.get("complaint_category"),
        "complaint_description": state.get("complaint_description"),
        "severity": state.get("severity"),
        "suggested_action": state.get("suggested_action"),
        "initial_risk_assessment": state.get("initial_risk_assessment"),
        "response_draft": state.get("response_draft"),
    }
    existing_clean = {k: v for k, v in existing_fields.items() if v is not None}

    system_prompt = f"""You are ahsi AI, an intelligent Operations & Workflow assistant.
ACTIVE WORKSPACE: {active_ws}
RECORD TYPE: {active_type}

Extract or update all relevant structured fields from the user input.
CRITICAL INSTRUCTIONS FOR CORRECTIONS & UPDATES:
1. If the user is providing a field correction or update (e.g. 'correct batch number amx56584' or 'change client name to Apollo'):
   - Set that exact field accurately (e.g. batch_lot_number = 'AMX56584').
   - KEEP and PRESERVE all existing fields from Current State unchanged!
2. Never extract word fragments like 'ber', 'number', 'num', or 'id' as the batch_lot_number.
3. Return ONLY a valid JSON object matching:
{{
  "workspace": "{active_ws}",
  "record_type": "{active_type}",
  "title": "Descriptive title",
  "complaint_source": "Source channel",
  "customer_name": "Customer / Client name",
  "product_name": "Product / Service name",
  "product_strength": "Version / Strength / Tier",
  "batch_lot_number": "Batch # / Order ID / Reference #",
  "affected_quantity": "Quantity / Budget / Hours",
  "manufacturing_date": "Date",
  "expiry_date": "Deadline",
  "complaint_category": "Category",
  "complaint_description": "Full description",
  "severity": "Critical | Major | Moderate | Minor"
}}"""

    human_prompt = f"User Input:\n{raw_input}\nCurrent State:\n{json.dumps(existing_clean, indent=2)}"

    data = {}
    llm_success = False

    api_key = os.getenv("GROQ_API_KEY", "")
    if api_key and api_key != "your_groq_api_key_here":
        try:
            llm = get_primary_llm()
            content = _invoke_with_retry(llm, [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ])
            data = _safe_json(content)
            if data and (data.get("product_name") or data.get("customer_name") or data.get("batch_lot_number")):
                llm_success = True
        except Exception as e:
            print(f"[NODE 1] LLM call failed: {e}. Falling back to universal heuristic parser.")

    if not llm_success:
        data = _heuristic_universal_extract(raw_input, existing=existing_clean, workspace=active_ws, record_type=active_type)

    merged = dict(existing_clean)
    for k, v in data.items():
        if v is not None and v != "":
            # Avoid overwriting with invalid placeholder fragments
            if k == "batch_lot_number" and (str(v).strip().lower() in INVALID_BATCH_IDS or len(str(v).strip()) < 2):
                continue
            merged[k] = v

    # Final sanity check on batch_lot_number
    final_batch = merged.get("batch_lot_number")
    if not final_batch or str(final_batch).strip().lower() in INVALID_BATCH_IDS:
        final_batch = "AMX240602" if active_ws == "healthcare_pharma" else "ORD-2026-9041" if active_ws == "ecommerce" else "TK-8820"
        merged["batch_lot_number"] = final_batch

    title = merged.get("title") or f"{merged.get('product_name', 'Request')} - {merged.get('customer_name', 'Client')}"

    return {
        "workspace": active_ws,
        "record_type": active_type,
        "title": title,
        "complaint_source": merged.get("complaint_source") or "ahsi Portal",
        "customer_name": merged.get("customer_name") or "Valued Client",
        "product_name": merged.get("product_name") or "General Business Service",
        "product_strength": merged.get("product_strength") or "Standard Tier",
        "batch_lot_number": merged.get("batch_lot_number") or final_batch,
        "affected_quantity": merged.get("affected_quantity") or "1 unit",
        "manufacturing_date": merged.get("manufacturing_date") or "March 2026",
        "expiry_date": merged.get("expiry_date") or "Within 14 Days",
        "originating_site": merged.get("originating_site"),
        "impacted_npm": merged.get("impacted_npm"),
        "complaint_category": merged.get("complaint_category") or "Operations Request",
        "complaint_description": merged.get("complaint_description") or raw_input,
        "severity": merged.get("severity") or "Major",
        "suggested_action": merged.get("suggested_action"),
        "initial_risk_assessment": merged.get("initial_risk_assessment"),
        "response_draft": merged.get("response_draft"),
        "processing_step": "parsed",
    }



# ─── Node 2: Department & Resource Mapping ───────────────────────────────────

def classify_facility_node(state: UniversalAgentState) -> dict:
    """Maps originating department, facility, tech stack, and impacted deliverables."""
    workspace = state.get("workspace") or "general"
    product = state.get("product_name") or "Service"
    rec_type = state.get("record_type") or "issue"

    facility_map = {
        "ecommerce": "Fulfillment Center East (Warehouse 4)",
        "tech_saas": "Production Cloud Cluster (US-East-1)",
        "services_freelance": "Digital Solutions & Engineering Unit",
        "healthcare_pharma": "Block A - Primary Manufacturing",
        "manufacturing": "Assembly Line 3 - Precision Plant",
        "general": "Corporate Operations Hub",
    }

    deliverable_map = {
        "ecommerce": "Secondary Packaging & Courier Box",
        "tech_saas": "REST API Gateway & Postgres DB",
        "services_freelance": "Frontend React UI & Stripe Payment Integration",
        "healthcare_pharma": "Primary packaging (HDPE bottle)",
        "manufacturing": "Hydraulic Pressure Seal",
        "general": "Core Deliverables & Specifications",
    }

    originating_site = state.get("originating_site") or facility_map.get(workspace, "Operations Hub")
    impacted_npm = state.get("impacted_npm") or deliverable_map.get(workspace, "Core Deliverables")

    return {
        "originating_site": originating_site,
        "impacted_npm": impacted_npm,
        "processing_step": "classified",
    }


# ─── Node 3: Defect & Scope Summarizer ─────────────────────────────────────────

def summarize_complaint_node(state: UniversalAgentState) -> dict:
    """Produces high-impact executive summaries for issues, proposals, or service requests."""
    workspace = state.get("workspace") or "general"
    rec_type = state.get("record_type") or "issue"
    product = state.get("product_name") or "Service"
    customer = state.get("customer_name") or "Client"
    category = state.get("complaint_category") or "Operations"
    batch = state.get("batch_lot_number") or "N/A"
    desc = state.get("complaint_description") or ""

    if rec_type in ["service_request", "proposal"]:
        summary = (
            f"[{workspace.upper()}] {rec_type.replace('_', ' ').title()}: Request for '{product}' from {customer}. "
            f"Engagement Category: {category}. Ref: {batch}."
        )
    else:
        summary = (
            f"[{workspace.upper()}] Operational Issue: Defect logged for '{product}' ({batch}) by {customer}. "
            f"Category: {category}. Scope: {desc[:120]}..."
        )

    return {
        "defect_summary": summary,
        "processing_step": "summarized",
    }


# ─── Node 4: Universal Evaluator & Action Generator ───────────────────────────

def generate_response_node(state: UniversalAgentState) -> dict:
    """Generates next steps, impact evaluation, and executive communication drafts."""
    workspace = state.get("workspace") or "general"
    rec_type = state.get("record_type") or "issue"
    product = state.get("product_name") or "Service"
    customer = state.get("customer_name") or "Valued Client"
    category = state.get("complaint_category") or "Operations"
    severity = state.get("severity") or "Major"
    batch = state.get("batch_lot_number") or "N/A"
    qty = state.get("affected_quantity") or "1 unit"
    description = state.get("complaint_description") or ""

    if rec_type in ["service_request", "proposal"]:
        suggested_action = (
            f"1) Confirm scope deliverables with {customer}. "
            f"2) Issue formal proposal and milestone estimate. "
            f"3) Schedule kickoff discovery call."
        )
        assessment_text = (
            f"Service Feasibility Evaluation (Priority: {severity}): The scope for '{product}' ({qty}) in category '{category}' is achievable. "
            f"Resource allocation required for {state.get('impacted_npm', 'core deliverables')}. Target timeline SLA: within agreed milestone window."
        )
        draft_response = (
            f"Hi {customer},\n\n"
            f"Thank you for reaching out regarding '{product}'. We have reviewed your request and prepared a preliminary scope estimate:\n"
            f"• Scope / Deliverables: {state.get('impacted_npm', 'Custom specifications')}\n"
            f"• Reference / Work Order: {batch}\n"
            f"• Estimated Timeline: {state.get('expiry_date', 'Within 2 weeks')}\n"
            f"• Next Steps: We'd love to schedule a brief 15-minute call to finalize the milestones.\n\n"
            f"Best regards,\nOperations Team"
        )
    else:
        suggested_action = (
            f"1) Immediate triage and customer resolution. "
            f"2) Coordinate with {state.get('originating_site', 'Operations')} for root-cause inspection. "
            f"3) Issue replacement, refund, or patch update."
        )
        assessment_text = (
            f"Risk & Impact Evaluation (Severity: {severity}): Issue categorized under '{category}' affecting {product} (Ref: {batch}). "
            f"Impact profile: Potential SLA breach or client dissatisfaction. Action Plan: Rapid mitigation initiated with {state.get('originating_site')}."
        )
        draft_response = (
            f"Dear {customer},\n\n"
            f"Thank you for contacting us regarding your experience with '{product}' (Reference #{batch}). "
            f"We sincerely apologize for any inconvenience caused by the {category.lower()}.\n\n"
            f"Our team has flagged this with high priority ({severity}) and is taking immediate action to rectify the situation. "
            f"We will provide you with a resolution update shortly.\n\n"
            f"Warm regards,\nCustomer Care & Operations"
        )

    return {
        "severity": severity,
        "suggested_action": suggested_action,
        "initial_risk_assessment": assessment_text,
        "response_draft": draft_response,
        "processing_step": "evaluated",
    }


# ─── Node 5: Format Final Omniflow Response ───────────────────────────────────

def format_response_node(state: UniversalAgentState) -> dict:
    """Generates the final AI Copilot assistant message with clean formatting."""
    customer = state.get("customer_name") or "Valued Client"
    product = state.get("product_name") or "Service"
    category = state.get("complaint_category") or "Operations"
    severity = state.get("severity") or "Major"
    rec_type = state.get("record_type") or "issue"
    batch = state.get("batch_lot_number") or ""
    raw_input = (state.get("raw_input") or "").strip()
    t_lower = raw_input.lower()

    # Check if this message was a field correction or update command
    corr_keywords = ["correct", "change", "update", "fix", "modify", "replace", "set batch", "set product", "set client", "set customer", "set date"]
    is_correction = any(k in t_lower for k in corr_keywords) and len(raw_input) < 100

    if is_correction and batch:
        msg = (
            f"⚡ **Field Updated Successfully!** Set **Batch / Reference #** to `{batch}` for **{product}** ({customer}). "
            f"The form fields and resolution plan have been updated."
        )
    elif rec_type in ["service_request", "proposal"]:
        msg = (
            f"⚡ **Service Request Processed!** Analyzed requirements for **{product}** ({customer}), "
            f"Reference: `{batch}`, structured scope deliverables, evaluated feasibility (Priority: **{severity}**), "
            f"and prepared an auto-draft proposal response. The form has been updated for your review."
        )
    else:
        msg = (
            f"⚡ **Operational Issue Triaged!** Extracted details for **{product}** (Ref: `{batch}`), "
            f"categorized under **{category}** with severity assessed as **{severity}**. "
            f"Action plan and customer resolution draft have been updated in the form."
        )

    ai_message = AIMessage(content=msg)

    return {
        "messages": [ai_message],
        "status": "ready_to_commit",
        "processing_step": "complete",
    }


# Node aliases for LangGraph and external module compatibility
defect_analysis_node = summarize_complaint_node
risk_assessment_node = generate_response_node

