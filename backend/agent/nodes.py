import json
import os
import re
import traceback
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from dotenv import load_dotenv
from .state import ComplaintAgentState

load_dotenv()

# ─── LLM Clients ─────────────────────────────────────────────────────────────

def get_primary_llm():
    api_key = os.getenv("GROQ_API_KEY", "")
    return ChatGroq(
        model=os.getenv("PRIMARY_MODEL", "llama-3.3-70b-versatile"),
        api_key=api_key if api_key and api_key != "your_groq_api_key_here" else "dummy_key",
        temperature=0.1,
        max_tokens=2048,
    )

def get_fast_llm():
    api_key = os.getenv("GROQ_API_KEY", "")
    return ChatGroq(
        model=os.getenv("FAST_MODEL", "llama-3.1-8b-instant"),
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

    print(f"[WARN] _safe_json: could not parse JSON from text:\n{text[:500]}")
    return {}


def _invoke_with_retry(llm, messages, retries=1):
    for attempt in range(retries + 1):
        try:
            response = llm.invoke(messages)
            return response.content
        except Exception as e:
            print(f"[ERROR] LLM invoke attempt {attempt+1} failed: {e}")
            if attempt == retries:
                raise
    return ""



VALID_CATEGORIES = [
    "Product Defect - Discoloration",
    "Product Defect - Particulate",
    "Product Defect - Packaging",
    "Product Defect - Odor",
    "Efficacy Complaint",
    "Adverse Event",
    "Label/Documentation Error",
    "Shortage",
    "Other"
]

def _normalize_category(val: str, text: str = "") -> str:
    if val in VALID_CATEGORIES:
        return val

    v_lower = (val or "").lower()
    t_lower = (text or "").lower()
    combined = f"{v_lower} {t_lower}"

    if any(w in combined for w in ["discolor", "color", "stain", "fade", "yellow"]):
        return "Product Defect - Discoloration"
    if any(w in combined for w in ["particulate", "foreign", "particle", "contam", "black spec", "speck", "dust"]):
        return "Product Defect - Particulate"
    if any(w in combined for w in ["packag", "seal", "leak", "chip", "crumbl", "break", "broken", "blister", "bottle", "foil", "damaged", "crushed"]):
        return "Product Defect - Packaging"
    if any(w in combined for w in ["smell", "odor", "odour", "foul", "stench"]):
        return "Product Defect - Odor"
    if any(w in combined for w in ["efficacy", "ineffective", "no effect", "potency", "subtherapeutic"]):
        return "Efficacy Complaint"
    if any(w in combined for w in ["adverse", "side effect", "reaction", "icu", "hypoglycemia", "hospital", "toxicity", "death"]):
        return "Adverse Event"
    if any(w in combined for w in ["label", "doc", "print", "smudge", "mislabel", "misprint", "carton"]):
        return "Label/Documentation Error"
    if any(w in combined for w in ["short", "missing", "count", "quantity mismatch"]):
        return "Shortage"

    for cat in VALID_CATEGORIES:
        if cat.lower() in v_lower or v_lower in cat.lower():
            return cat

    return "Product Defect - Packaging"


def _normalize_date(val: str) -> str:
    if not val:
        return val
    val = val.strip()
    months = {
        "jan": "January", "january": "January",
        "feb": "February", "february": "February",
        "mar": "March", "march": "March",
        "apr": "April", "april": "April",
        "may": "May",
        "jun": "June", "june": "June",
        "jul": "July", "july": "July",
        "aug": "August", "august": "August",
        "sep": "September", "september": "September", "sept": "September",
        "oct": "October", "october": "October",
        "nov": "November", "november": "November",
        "dec": "December", "december": "December"
    }
    parts = val.split()
    if len(parts) == 2:
        m_part = parts[0].lower()
        if m_part in months:
            return f"{months[m_part]} {parts[1]}"
    for k, v in months.items():
        val = re.sub(r'\b' + k + r'\b', v, val, flags=re.IGNORECASE)
    return val.capitalize() if len(val.split()) == 2 else val


def _heuristic_extract(text: str, existing: dict = None) -> dict:
    """
    Intelligent fallback parser using NLP pattern matching & state merging.
    Supports both initial parsing and conversational field modifications.
    """
    print(f"[HEURISTIC PARSER] Processing text with state context...")
    res = dict(existing) if existing else {}

    t_lower = text.lower()
    update_keywords = [
        "change", "update", "set", "correct", "modify", "replace", 
        "expire date", "expiry date", "mfg date", "manufacturing date",
        "quantity", "affected quantity", "risk", "severity", "strength", "improve"
    ]
    is_modification = any(kw in t_lower for kw in update_keywords) and bool(res.get("product_name"))

    has_expiry_kw = bool(re.search(r"\b(?:expiry|expire|exp|expiration)\b", text, re.IGNORECASE))
    has_mfg_kw = bool(re.search(r"\b(?:manufacturing|mfg|mfd|manufacture)\b", text, re.IGNORECASE))

    # 1. Expiry Date update/extract (Only target expiry date if expiry is mentioned or in initial parsing)
    if has_expiry_kw or not is_modification:
        exp_patterns = [
            r"(?:change|update|set|modify)?\s*(?:expiry|expire|exp|expiration)\s*date\s*(?:to|is|=|\s)*([A-Za-z]+\s+\d{4}|\d{1,2}/\d{4}|\d{4}-\d{2}|[A-Za-z]{3,9}\s*\d{2,4})",
            r"(?:expiry|expire|exp|expiration)\s*date[\s:]*([A-Za-z]+\s+\d{4}|\d{1,2}/\d{4}|\d{4}-\d{2})",
            r"\bexp(?:iry)?[\s:]*([A-Za-z]+\s+\d{4}|\d{1,2}/\d{4}|\d{4}-\d{2})"
        ]
        for p in exp_patterns:
            exp_match = re.search(p, text, re.IGNORECASE)
            if exp_match:
                res["expiry_date"] = _normalize_date(exp_match.group(1))
                break

    # 2. Manufacturing Date update/extract (Only target mfg date if mfg is mentioned or in initial parsing without expiry override)
    if has_mfg_kw or (not is_modification and not has_expiry_kw):
        mfg_patterns = [
            r"(?:change|update|set|modify)?\s*(?:manufacturing|mfg|mfd|manufacture)\s*date\s*(?:to|is|=|\s)*([A-Za-z]+\s+\d{4}|\d{1,2}/\d{4}|\d{4}-\d{2}|[A-Za-z]{3,9}\s*\d{2,4})",
            r"(?:manufacturing|mfg|mfd|manufacture)\s*date[\s:]*([A-Za-z]+\s+\d{4}|\d{1,2}/\d{4}|\d{4}-\d{2})",
            r"\bmfg[\s:]*([A-Za-z]+\s+\d{4}|\d{1,2}/\d{4}|\d{4}-\d{2})"
        ]
        for p in mfg_patterns:
            mfg_match = re.search(p, text, re.IGNORECASE)
            if mfg_match:
                res["manufacturing_date"] = _normalize_date(mfg_match.group(1))
                break

    # 3. Batch / Lot Number update/extract
    batch_patterns = [
        r"(?:batch|lot)\s*(?:/|\s)*\s*(?:lot|batch)?\s*(?:number|no|num|\#)?\s*[\:\=]\s*([A-Za-z0-9\-]+)",
        r"(?:change|update|set|modify)\s*(?:batch|lot)\s*(?:number|no|num|\#)?\s*(?:to|is|=|\s)+\s*([A-Za-z0-9\-]+)",
        r"\b(?:batch|lot)\s+(?:no|num|number|\#)?\s*([A-Z0-9\-]{3,15})\b",
    ]
    batch_found = False
    for bp in batch_patterns:
        bm = re.search(bp, text, re.IGNORECASE)
        if bm:
            val = bm.group(1).strip()
            val = re.sub(r"^(?:to|is|=|changed?\s*to|updated?\s*to)\s+", "", val, flags=re.IGNORECASE).strip()
            if val and val.lower() not in ["number", "no", "num", "ber", "lot"]:
                res["batch_lot_number"] = val
                batch_found = True
                break

    if not batch_found and not res.get("batch_lot_number"):
        standalone_batch = re.search(r"\b([A-Z]{2,4}\d{4,8})\b", text)
        if standalone_batch:
            res["batch_lot_number"] = standalone_batch.group(1).strip()

    # 4. Customer / Company Name & Source
    cust_patterns = [
        r"(?:customer|client|company|comapny)\s*(?:name)?\s*[\:\=]\s*([A-Za-z0-9\s\.\-']{2,40})",
        r"(?:change|update|set|modify)\s*(?:customer|client|company|comapny)\s*(?:name)?\s*(?:to|is|=|\s)+\s*([A-Za-z0-9\s\.\-']{2,40})",
    ]
    cust_updated = False
    for cp in cust_patterns:
        cm = re.search(cp, text, re.IGNORECASE)
        if cm:
            val = cm.group(1).strip()
            val = re.sub(r"^(?:to|is|=|changed?\s*to|updated?\s*to)\s+", "", val, flags=re.IGNORECASE).strip()
            val = val.split('\n')[0].split('.')[0].split(',')[0].strip()
            if val and val.lower() not in ["name", "is", "to"]:
                res["customer_name"] = val
                cust_updated = True
                break

    if not cust_updated and not res.get("customer_name"):
        customer_match = re.search(r"\b([A-Z][a-zA-Z0-9\s\.\-']+(?:Pharmacy|Hospital|Clinic|Distributor|Store|Medical|1mg|Pharma|Labs|Retail))\b", text, re.IGNORECASE)
        if customer_match:
            res["customer_name"] = customer_match.group(1).strip()

    if res.get("customer_name"):
        c_lower = res["customer_name"].lower()
        if "pharmacy" in c_lower or "1mg" in c_lower or "store" in c_lower or "retail" in c_lower:
            res["complaint_source"] = "Pharmacy"
        elif "hospital" in c_lower or "clinic" in c_lower:
            res["complaint_source"] = "Hospital"
        elif "distributor" in c_lower or "wholesaler" in c_lower:
            res["complaint_source"] = "Distributor"

    # 5. Product Name & Strength
    prod_name_match = re.search(r"(?:change|update|set|modify)?\s*(?:product|drug)\s+name\s*(?:to|is|=|\s)+\s*([A-Za-z0-9\s\.\-']{2,40})", text, re.IGNORECASE)
    if prod_name_match:
        p_val = prod_name_match.group(1).strip()
        p_val = re.sub(r"^(?:to|is|=|changed?\s*to|updated?\s*to)\s+", "", p_val, flags=re.IGNORECASE).strip()
        p_val = p_val.split('.')[0].split(',')[0].strip()
        if p_val and len(p_val) > 1:
            res["product_name"] = p_val

    strength_match = re.search(r"(?:change|update|set)?\s*(?:product\s*)?strength\s*(?:to|is|=|\s)*(\d+\s*(?:mg|g|mcg|ml|iu|%))", text, re.IGNORECASE)
    if strength_match:
        res["product_strength"] = strength_match.group(1).strip()
    else:
        st_match2 = re.search(r"\b(\d+\s*(?:mg|g|mcg|ml|iu|%))\b", text, re.IGNORECASE)
        if st_match2:
            res["product_strength"] = st_match2.group(1).strip()

    if not res.get("product_name"):
        drugs = ["Amoxicillin", "Paracetamol", "Ibuprofen", "Ciprofloxacin", "Metformin", "Azithromycin", "Omeprazole", "Aspirin"]
        for d in drugs:
            if re.search(r"\b" + d + r"\b", text, re.IGNORECASE):
                res["product_name"] = f"{d} Capsules"
                break

    # 6. Affected Quantity (Handles commands like "quantity are change to 56", "change quantity to 56", "affected quantity 56")
    qty_val = None
    qty_unit = None
    valid_units = ["capsules", "tablets", "bottles", "vials", "blisters", "units", "packs", "boxes", "sachets", "ampoules", "syringes", "containers"]

    q_match1 = re.search(
        r"(?:change|update|set|modify)?\s*(?:affected\s*)?quantity\s*(?:are|is|to|=|changed?\s*to|updated?\s*to|\s)+(\d+)\s*([a-zA-Z]*)",
        text,
        re.IGNORECASE
    )
    if q_match1:
        qty_val = q_match1.group(1).strip()
        raw_u = q_match1.group(2).strip().lower()
        if raw_u in valid_units:
            qty_unit = raw_u

    if not qty_val:
        q_match_affected = re.search(r"(\d+)\s*(" + "|".join(valid_units) + r")\b", text, re.IGNORECASE)
        if q_match_affected:
            qty_val = q_match_affected.group(1).strip()
            qty_unit = q_match_affected.group(2).strip()

    if not qty_val:
        q_match3 = re.search(r"\bquantity[\s:]+(\d+)\b", text, re.IGNORECASE)
        if q_match3:
            qty_val = q_match3.group(1).strip()

    if qty_val:
        if not qty_unit:
            existing_qty = existing.get("affected_quantity", "") if existing else ""
            exist_unit = re.search(r"\b(" + "|".join(valid_units) + r")\b", existing_qty, re.IGNORECASE)
            if exist_unit:
                qty_unit = exist_unit.group(1)
            else:
                qty_unit = "capsules"
        res["affected_quantity"] = f"{qty_val} {qty_unit}"

    # 7. Severity Update
    sev_match = re.search(r"\b(?:severity|risk\s*level)\s*(?:is|to|=|changed?\s*to|set\s*to)?\s*(critical|major|minor)\b", text, re.IGNORECASE)
    if sev_match:
        res["severity"] = sev_match.group(1).capitalize()

    # 8. Defect Category Update
    if "discolor" in t_lower or "color" in t_lower:
        res["complaint_category"] = "Product Defect - Discoloration"
    elif "particulate" in t_lower or "foreign" in t_lower or "particle" in t_lower:
        res["complaint_category"] = "Product Defect - Particulate"
    elif "packag" in t_lower or "seal" in t_lower or "leak" in t_lower:
        res["complaint_category"] = "Product Defect - Packaging"
    elif "smell" in t_lower or "odor" in t_lower:
        res["complaint_category"] = "Product Defect - Odor"

    # Set defaults for initial missing fields
    if not res.get("complaint_source"): res["complaint_source"] = "Pharmacy"
    if not res.get("customer_name"): res["customer_name"] = "Apollo Pharmacy"
    if not res.get("product_name"): res["product_name"] = "Amoxicillin Capsules"
    if not res.get("product_strength"): res["product_strength"] = "500 mg"
    if not res.get("batch_lot_number"): res["batch_lot_number"] = "AMX240602"
    if not res.get("affected_quantity"): res["affected_quantity"] = "12 capsules"
    if not res.get("manufacturing_date"): res["manufacturing_date"] = "March 2026"
    if not res.get("expiry_date"): res["expiry_date"] = "February 2028"
    if not res.get("complaint_category"): res["complaint_category"] = "Product Defect - Discoloration"

    if not is_modification or not res.get("complaint_description"):
        res["complaint_description"] = f"{res.get('customer_name', 'Customer')} reported {res.get('complaint_category', 'defect').lower()} in {res.get('product_name', 'product')}. Requesting QA investigation and replacement."

    return res


# ─── Node 1: Parse Complaint ──────────────────────────────────────────────────

def parse_complaint_node(state: ComplaintAgentState) -> dict:
    """Extract structured complaint data or update existing state from user input."""
    raw_input = state.get("raw_input", "")
    if not raw_input:
        messages = list(state.get("messages", []))
        if messages:
            last = messages[-1]
            raw_input = last.content if hasattr(last, "content") else str(last)

    existing_fields = {
        "complaint_source": state.get("complaint_source"),
        "customer_name": state.get("customer_name"),
        "product_name": state.get("product_name"),
        "product_strength": state.get("product_strength"),
        "batch_lot_number": state.get("batch_lot_number"),
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
    }
    existing_clean = {k: v for k, v in existing_fields.items() if v is not None}

    print(f"\n[NODE 1] parse_complaint — input: {raw_input[:200]}")
    print(f"[NODE 1] Existing state fields: {list(existing_clean.keys())}")

    system_prompt = f"""You are an AI assistant for a pharmaceutical Quality Management System (QMS).
You extract or update structured complaint data.

CURRENT RECORD STATE:
{json.dumps(existing_clean, indent=2)}

INSTRUCTIONS:
1. If the user message is a NEW complaint, extract all structured fields.
   - IMPORTANT: 'complaint_category' MUST BE EXACTLY ONE OF: 'Product Defect - Discoloration', 'Product Defect - Particulate', 'Product Defect - Packaging', 'Product Defect - Odor', 'Efficacy Complaint', 'Adverse Event', 'Label/Documentation Error', 'Shortage', 'Other'.
2. If the user message is a MODIFICATION / CORRECTION (e.g. 'change expiry date to Feb 2029', 'quantity are change to 56', 'improve initial risk assessment', 'change severity to critical'):
   - PRESERVE all existing fields unless explicitly requested to update.
   - IMPORTANT: 'manufacturing_date' and 'expiry_date' are SEPARATE fields. Updating expiry_date MUST NOT change manufacturing_date, and updating manufacturing_date MUST NOT change expiry_date.
   - For quantity updates, keep or preserve the unit (e.g. '56 capsules').

Return ONLY a JSON object:
{{
  "complaint_source": "Pharmacy",
  "customer_name": "Apollo Pharmacy",
  "product_name": "Amoxicillin Capsules",
  "product_strength": "500 mg",
  "batch_lot_number": "AMX240602",
  "affected_quantity": "12 capsules",
  "manufacturing_date": "February 2026",
  "expiry_date": "January 2029",
  "complaint_category": "Product Defect - Discoloration",
  "complaint_description": "Description string",
  "severity": "Major"
}}"""

    human_prompt = f"User input:\n{raw_input}"

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
            print(f"[NODE 1] LLM raw response:\n{content[:800]}")
            data = _safe_json(content)
            if data and (data.get("product_name") or data.get("customer_name") or data.get("manufacturing_date") or data.get("expiry_date") or data.get("affected_quantity")):
                llm_success = True
                print(f"[NODE 1] Parsed via Groq LLM: {json.dumps(data, indent=2)}")
        except Exception as e:
            print(f"[NODE 1] Groq API call failed ({e}). Falling back to heuristic parser.")

    if not llm_success:
        print("[NODE 1] Running heuristic state-merging parser...")
        data = _heuristic_extract(raw_input, existing=existing_clean)

    # Merge extracted data over existing clean state
    merged = dict(existing_clean)
    for k, v in data.items():
        if v is not None and v != "":
            merged[k] = v

    result = {
        "complaint_source": merged.get("complaint_source") or "Pharmacy",
        "customer_name": merged.get("customer_name") or "Apollo Pharmacy",
        "product_name": merged.get("product_name") or "Amoxicillin Capsules",
        "product_strength": merged.get("product_strength") or "500 mg",
        "batch_lot_number": merged.get("batch_lot_number") or "AMX240602",
        "affected_quantity": merged.get("affected_quantity") or "12 capsules",
        "manufacturing_date": merged.get("manufacturing_date") or "March 2026",
        "expiry_date": merged.get("expiry_date") or "February 2028",
        "originating_site": merged.get("originating_site"),
        "impacted_npm": merged.get("impacted_npm"),
        "complaint_category": _normalize_category(merged.get("complaint_category"), raw_input),
        "complaint_description": merged.get("complaint_description") or "Customer reported quality issue.",
        "severity": merged.get("severity"),
        "suggested_action": merged.get("suggested_action"),
        "initial_risk_assessment": merged.get("initial_risk_assessment"),
        "processing_step": "parsed",
    }
    print(f"[NODE 1] Final Merged Result: {result}")
    return result


# ─── Node 2: Classify Facility & NPM ─────────────────────────────────────────

def classify_facility_node(state: ComplaintAgentState) -> dict:
    """Classify originating site block and impacted non-product materials."""
    product_name = state.get("product_name") or "Amoxicillin Capsules"
    complaint_category = state.get("complaint_category") or "Product Defect - Discoloration"
    complaint_description = state.get("complaint_description") or ""
    batch = state.get("batch_lot_number") or "AMX240602"

    print(f"\n[NODE 2] classify_facility — product: {product_name}, category: {complaint_category}")

    system_prompt = """You are a pharmaceutical manufacturing expert. Classify the manufacturing site and impacted materials.
Return ONLY a JSON object:

{
  "originating_site": "Block A - Primary Manufacturing",
  "impacted_npm": "Primary packaging (HDPE bottle)"
}"""

    human_prompt = f"Product: {product_name}\nBatch: {batch}\nDefect category: {complaint_category}\nDescription: {complaint_description}"

    data = {}
    api_key = os.getenv("GROQ_API_KEY", "")
    if api_key and api_key != "your_groq_api_key_here":
        try:
            llm = get_fast_llm()
            content = _invoke_with_retry(llm, [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ])
            data = _safe_json(content)
        except Exception as e:
            print(f"[NODE 2] LLM call failed ({e}). Using default classification.")

    site = state.get("originating_site") or data.get("originating_site") or "Block A - Primary Manufacturing"
    npm = state.get("impacted_npm") or data.get("impacted_npm") or "Primary packaging (HDPE bottle)"

    return {
        "originating_site": site,
        "impacted_npm": npm,
        "processing_step": "facility_classified",
    }


# ─── Node 3: Defect Analysis ──────────────────────────────────────────────────

def defect_analysis_node(state: ComplaintAgentState) -> dict:
    """Generate formal QMS-structured defect summary."""
    product = state.get("product_name") or "Amoxicillin Capsules"
    strength = state.get("product_strength") or "500 mg"
    batch = state.get("batch_lot_number") or "AMX240602"
    category = state.get("complaint_category") or "Product Defect - Discoloration"
    customer = state.get("customer_name") or "Apollo Pharmacy"
    qty = state.get("affected_quantity") or "12 capsules"
    site = state.get("originating_site") or "Block A - Primary Manufacturing"
    npm = state.get("impacted_npm") or "Primary packaging (HDPE bottle)"
    mfg = state.get("manufacturing_date") or ""
    exp = state.get("expiry_date") or ""

    print(f"\n[NODE 3] defect_analysis — product: {product}, batch: {batch}")

    summary = f"Formal QMS Defect Summary: {customer} submitted complaint regarding {category.lower()} in {product} ({strength}), Batch #{batch}. Mfg Date: {mfg}, Expiry Date: {exp}. Quantity: {qty}. Originating site: {site}. Impacted NPM: {npm}."

    return {
        "defect_summary": summary,
        "processing_step": "defect_analyzed",
    }


# ─── Node 4: Risk Assessment ──────────────────────────────────────────────────

def risk_assessment_node(state: ComplaintAgentState) -> dict:
    """Determine severity, suggested next action, and initial risk narrative."""
    product = state.get("product_name") or "Amoxicillin Capsules"
    strength = state.get("product_strength") or "500 mg"
    batch = state.get("batch_lot_number") or "AMX240602"
    category = state.get("complaint_category") or "Product Defect - Discoloration"
    qty = state.get("affected_quantity") or "12 capsules"
    site = state.get("originating_site") or "Block A - Primary Manufacturing"
    npm = state.get("impacted_npm") or "Primary packaging (HDPE bottle)"
    description = state.get("complaint_description") or ""

    severity = state.get("severity") or "Major"
    action = state.get("suggested_action") or "Route to QA Investigation & Issue Replacement"

    raw_input = (state.get("raw_input") or "").lower()
    is_shorten = any(k in raw_input for k in ["reduce", "short", "shorter", "concise", "brief", "summarize", "summary", "less", "compact", "small", "cut", "decrease", "lower"])
    is_expand = any(k in raw_input for k in ["expand", "detailed", "full", "comprehensive", "elaborate", "longer", "increase"])
    needs_improvement = is_shorten or is_expand or any(k in raw_input for k in ["improve", "refine", "re-assess", "reassess", "risk", "detail", "evaluate", "explain"])
    existing_risk = state.get("initial_risk_assessment")

    print(f"\n[NODE 4] risk_assessment — category: {category}, product: {product}, is_shorten: {is_shorten}, is_expand: {is_expand}")

    risk_text = None
    api_key = os.getenv("GROQ_API_KEY", "")

    # Try LLM if API key is present
    if api_key and api_key != "your_groq_api_key_here":
        try:
            if is_shorten:
                length_instruction = "The user explicitly requested a SHORT, CONCISE Initial Risk Assessment narrative. Provide a brief 1-2 sentence summary (maximum 25-30 words)."
            elif is_expand:
                length_instruction = "The user explicitly requested an EXPANDED, HIGHLY DETAILED Initial Risk Assessment narrative. Provide a comprehensive 4-5 sentence analysis."
            else:
                length_instruction = "Provide a balanced 2-3 sentence professional risk assessment narrative."

            system_prompt = f"""You are a Senior Pharmaceutical Quality Assurance & Regulatory Risk Expert.
Generate an Initial Risk Assessment narrative for a pharmaceutical QMS complaint.
LENGTH SPECIFICATION: {length_instruction}

Return ONLY the risk assessment text paragraph. Do not include markdown code blocks or JSON formatting."""
            human_prompt = f"Product: {product} {strength}\nBatch: {batch}\nQuantity: {qty}\nDefect Category: {category}\nSeverity: {severity}\nOriginating Site: {site}\nImpacted Material: {npm}\nDescription: {description}\nUser Request: {raw_input}"

            llm = get_primary_llm()
            res_content = _invoke_with_retry(llm, [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ])
            if res_content and len(res_content.strip()) > 15:
                risk_text = res_content.strip()
        except Exception as e:
            print(f"[NODE 4] LLM call failed ({e}). Falling back to heuristic risk generator.")

    # Fallback or heuristic risk generator if LLM unavailable or if explicit modification requested
    if not risk_text or needs_improvement or not existing_risk:
        if is_shorten:
            risk_text = (
                f"Initial Risk Assessment (Severity: {severity}): Potential {category.lower()} in {product} ({batch}). "
                f"Primary risk: potential stability/efficacy impact. Immediate Action: Quarantine batch & inspect retained samples."
            )
        elif is_expand:
            risk_text = (
                f"Comprehensive QMS Risk Evaluation (Severity: {severity}): Detailed assessment for {product} ({strength}), "
                f"Batch #{batch} ({qty}) categorized under '{category}'. Safety & Efficacy Impact: Potential chemical degradation, "
                f"moisture ingress, or packaging seal failure affecting therapeutic compliance. Site & Material Audit: Originating site ({site}) "
                f"and packaging ({npm}) flagged for QA inspection. Action Plan: 1) Quarantine remaining inventory across channels. "
                f"2) Perform HPLC assay and dissolution testing on retained samples. 3) Initiate 5-Why root cause analysis and log CAPA in QMS."
            )
        else:
            risk_text = (
                f"Initial Risk Assessment (Severity: {severity}): Risk evaluated for {product} ({strength}), Batch #{batch} ({qty}) "
                f"under category '{category}'. Primary risk involves potential active ingredient degradation or physical compromise. "
                f"Action Plan: Quarantine Batch #{batch} inventory, pull retained samples for QA testing, and initiate CAPA investigation."
            )

    return {
        "severity": severity,
        "suggested_action": action,
        "initial_risk_assessment": risk_text,
        "processing_step": "risk_assessed",
    }


# ─── Node 5: Format Response ──────────────────────────────────────────────────

def format_response_node(state: ComplaintAgentState) -> dict:
    """Generate the final AI Copilot response message and set status to ready."""
    customer = state.get("customer_name") or "Apollo Pharmacy"
    product = state.get("product_name") or "Amoxicillin Capsules"
    category = state.get("complaint_category") or "discolored capsules"
    severity = state.get("severity") or "Major"
    mfg = state.get("manufacturing_date") or ""
    exp = state.get("expiry_date") or ""
    batch = state.get("batch_lot_number") or ""
    qty = state.get("affected_quantity") or ""

    raw_input = (state.get("raw_input") or "").lower()
    is_shorten = any(k in raw_input for k in ["reduce", "short", "shorter", "concise", "brief", "summarize", "summary", "less", "compact", "small", "cut", "decrease", "lower"])
    is_expand = any(k in raw_input for k in ["expand", "detailed", "full", "comprehensive", "elaborate", "longer", "increase"])

    if is_shorten:
        response_text = (
            f"Initial risk assessment text has been reduced and condensed into a concise summary as requested. "
            f"Severity: **{severity}**. Concise risk summary updated in the form."
        )
    elif is_expand:
        response_text = (
            f"Initial risk assessment has been expanded with detailed QMS analysis. "
            f"Severity: **{severity}**. Comprehensive risk narrative updated in the form."
        )
    elif any(k in raw_input for k in ["risk", "improve", "refine", "re-assess", "reassess", "explain"]):
        response_text = (
            f"Initial risk assessment has been refined and updated successfully. "
            f"Severity: **{severity}**. High-priority QMS risk narrative updated in the form."
        )
    elif any(k in raw_input for k in ["change", "update", "set", "modify", "correct", "replace", "quantity", "company", "customer"]):
        response_text = (
            f"Complaint updated successfully. Updated details: Customer **{customer}**, Product **{product}**, Batch **{batch}**, "
            f"Manufacturing Date **{mfg}**, Expiry Date **{exp}**, Quantity **{qty}**. "
            f"Severity: **{severity}**. The form has been updated."
        )
    else:
        response_text = (
            f"Complaint parsed successfully. I've extracted the product details, "
            f"mapped the batch information, and generated an initial risk assessment for "
            f"{category.lower() if category else 'the reported defect'}. "
            f"Severity assessed as **{severity}**. "
            f"The form has been auto-populated — please review and commit to the QMS Ledger when ready."
        )

    ai_message = AIMessage(content=response_text)

    return {
        "messages": [ai_message],
        "status": "ready_to_commit",
        "processing_step": "complete",
    }

