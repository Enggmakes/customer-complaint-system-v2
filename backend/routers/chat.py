from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from langchain_core.messages import HumanMessage
import uuid
import traceback
import io
import re
import pypdf
from PIL import Image

try:
    import pytesseract
    HAS_TESSERACT = True
except Exception:
    HAS_TESSERACT = False

from database import get_db
from models import Complaint, ChatSession
from schemas import ChatMessage, ChatMessageResponse
from agent.graph import complaint_graph

router = APIRouter(prefix="/api/chat", tags=["chat"])


EASYOCR_READER = None

def get_easyocr_reader():
    global EASYOCR_READER
    if EASYOCR_READER is None:
        try:
            import easyocr
            EASYOCR_READER = easyocr.Reader(['en'], gpu=False, verbose=False)
            print("[OCR] EasyOCR engine initialized successfully.")
        except Exception as e:
            print(f"[OCR WARN] Could not initialize EasyOCR: {e}")
    return EASYOCR_READER


def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    fname_lower = filename.lower()
    extracted_text = ""

    if fname_lower.endswith(".pdf"):
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text_parts = []
            for page in reader.pages:
                txt = page.extract_text()
                if txt:
                    text_parts.append(txt)
            extracted_text = "\n".join(text_parts).strip()
        except Exception as e:
            print(f"[PDF READ ERR] {e}")

    elif any(fname_lower.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".bmp", ".tiff"]):
        # 1. Try EasyOCR for camera photos and document images
        try:
            reader = get_easyocr_reader()
            if reader:
                results = reader.readtext(file_bytes, detail=0)
                extracted_text = " ".join(results).strip()
                print(f"[EASYOCR SUCCESS] Extracted {len(extracted_text)} chars from image.")
        except Exception as e:
            print(f"[EASYOCR ERR] {e}")

        # 2. Fallback to Tesseract if EasyOCR failed
        if not extracted_text and HAS_TESSERACT:
            try:
                image = Image.open(io.BytesIO(file_bytes))
                extracted_text = pytesseract.image_to_string(image).strip()
            except Exception as e:
                print(f"[OCR TESSERACT WARN] Tesseract binary not configured: {e}")
                extracted_text = ""

    elif fname_lower.endswith(".txt") or fname_lower.endswith(".csv"):
        try:
            extracted_text = file_bytes.decode("utf-8", errors="ignore").strip()
        except Exception as e:
            print(f"[TXT READ ERR] {e}")

    return extracted_text


@router.post("/message", response_model=dict)
async def send_message(payload: ChatMessage, db: Session = Depends(get_db)):
    """Send a message to the AIVOA Copilot. Returns extracted complaint data + AI response."""
    session_id = payload.session_id
    user_message = payload.message.strip()

    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    print(f"\n{'='*60}")
    print(f"[CHAT] New message for session: {session_id}")
    print(f"[CHAT] Message: {user_message[:300]}")

    # Persist user message in chat session
    db.add(ChatSession(session_id=session_id, role="user", content=user_message))
    db.commit()

    # Load existing complaint record from DB to pass current state into graph
    existing = db.query(Complaint).filter(Complaint.session_id == session_id).first()

    run_thread_id = f"{session_id}_{uuid.uuid4().hex[:8]}"

    initial_state = {
        "messages": [HumanMessage(content=user_message)],
        "session_id": session_id,
        "raw_input": user_message,
        "status": existing.status if existing and existing.status else "pending_triage",
        "processing_step": None,
        "error": None,
        "complaint_source": existing.complaint_source if existing else None,
        "customer_name": existing.customer_name if existing else None,
        "product_name": existing.product_name if existing else None,
        "product_strength": existing.product_strength if existing else None,
        "batch_lot_number": existing.batch_lot_number if existing else None,
        "affected_quantity": existing.affected_quantity if existing else None,
        "manufacturing_date": existing.manufacturing_date if existing else None,
        "expiry_date": existing.expiry_date if existing else None,
        "originating_site": existing.originating_site if existing else None,
        "impacted_npm": existing.impacted_npm if existing else None,
        "defect_summary": existing.defect_summary if existing else None,
        "complaint_category": existing.complaint_category if existing else None,
        "complaint_description": existing.complaint_description if existing else None,
        "severity": existing.severity if existing else None,
        "suggested_action": existing.suggested_action if existing else None,
        "initial_risk_assessment": existing.initial_risk_assessment if existing else None,
    }

    config = {"configurable": {"thread_id": run_thread_id}}

    try:
        result = await complaint_graph.ainvoke(initial_state, config=config)
        print(f"\n[CHAT] Graph completed.")
    except Exception as e:
        print(f"[CHAT] Agent error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

    # Get AI response text from the last AI message
    ai_messages = result.get("messages", [])
    ai_content = ""
    for msg in reversed(ai_messages):
        cls_name = msg.__class__.__name__
        if "AI" in cls_name or "Assistant" in cls_name:
            ai_content = msg.content
            break
        if hasattr(msg, "type") and msg.type in ("ai", "assistant"):
            ai_content = msg.content
            break

    print(f"[CHAT] AI response: {ai_content[:200]}")

    if ai_content:
        db.add(ChatSession(session_id=session_id, role="assistant", content=ai_content))
        db.commit()

    # Build extracted fields dict from graph result
    extracted = {
        "complaint_source": result.get("complaint_source"),
        "customer_name": result.get("customer_name"),
        "product_name": result.get("product_name"),
        "product_strength": result.get("product_strength"),
        "batch_lot_number": result.get("batch_lot_number"),
        "affected_quantity": result.get("affected_quantity"),
        "manufacturing_date": result.get("manufacturing_date"),
        "expiry_date": result.get("expiry_date"),
        "originating_site": result.get("originating_site"),
        "impacted_npm": result.get("impacted_npm"),
        "defect_summary": result.get("defect_summary"),
        "complaint_category": result.get("complaint_category"),
        "complaint_description": result.get("complaint_description"),
        "severity": result.get("severity"),
        "suggested_action": result.get("suggested_action"),
        "initial_risk_assessment": result.get("initial_risk_assessment"),
        "status": result.get("status", "ready_to_commit"),
        "raw_input": user_message,
    }

    print(f"[CHAT] Extracted fields returned:")
    for k, v in extracted.items():
        if v is not None:
            print(f"  {k}: {str(v)[:80]}")

    # Upsert complaint record in DB
    complaint = db.query(Complaint).filter(Complaint.session_id == session_id).first()
    if complaint:
        for k, v in extracted.items():
            if v is not None:
                setattr(complaint, k, v)
    else:
        clean = {k: v for k, v in extracted.items() if v is not None}
        clean["session_id"] = session_id
        complaint = Complaint(**clean)
        db.add(complaint)

    db.commit()
    db.refresh(complaint)

    return {
        "session_id": session_id,
        "ai_response": ai_content,
        "extracted_data": extracted,
        "status": result.get("status", "ready_to_commit"),
    }


@router.post("/upload", response_model=dict)
async def upload_document(
    session_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a PDF, paper image, or document file. Extracts text via PyPDF/OCR engine and parses complaint."""
    filename = file.filename or "uploaded_document"
    contents = await file.read()

    print(f"\n{'='*60}")
    print(f"[UPLOAD] File '{filename}' ({len(contents)} bytes) received for session: {session_id}")

    extracted_text = extract_text_from_file(contents, filename)

    if not extracted_text:
        extracted_text = f"Customer submitted defect document '{filename}'. Processing complaint details for QA triage."

    print(f"[UPLOAD] Extracted text ({len(extracted_text)} chars): {extracted_text[:200]}...")

    # Persist user document upload message
    user_display_msg = f"📄 Uploaded Document: **{filename}**\n\nExtracted Text Content:\n{extracted_text[:300]}..."
    db.add(ChatSession(session_id=session_id, role="user", content=user_display_msg))
    db.commit()

    existing = db.query(Complaint).filter(Complaint.session_id == session_id).first()
    run_thread_id = f"{session_id}_{uuid.uuid4().hex[:8]}"

    initial_state = {
        "messages": [HumanMessage(content=extracted_text)],
        "session_id": session_id,
        "raw_input": extracted_text,
        "status": "pending_triage",
        "processing_step": None,
        "error": None,
        "complaint_source": None,
        "customer_name": None,
        "product_name": None,
        "product_strength": None,
        "batch_lot_number": None,
        "affected_quantity": None,
        "manufacturing_date": None,
        "expiry_date": None,
        "originating_site": None,
        "impacted_npm": None,
        "defect_summary": None,
        "complaint_category": None,
        "complaint_description": None,
        "severity": None,
        "suggested_action": None,
        "initial_risk_assessment": None,
    }

    config = {"configurable": {"thread_id": run_thread_id}}

    try:
        result = await complaint_graph.ainvoke(initial_state, config=config)
    except Exception as e:
        print(f"[UPLOAD] Agent error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Agent error processing file: {str(e)}")

    ai_messages = result.get("messages", [])
    ai_content = ""
    for msg in reversed(ai_messages):
        if hasattr(msg, "content") and msg.content:
            ai_content = msg.content
            break

    if ai_content:
        db.add(ChatSession(session_id=session_id, role="assistant", content=ai_content))
        db.commit()

    extracted = {
        "complaint_source": result.get("complaint_source"),
        "customer_name": result.get("customer_name"),
        "product_name": result.get("product_name"),
        "product_strength": result.get("product_strength"),
        "batch_lot_number": result.get("batch_lot_number"),
        "affected_quantity": result.get("affected_quantity"),
        "manufacturing_date": result.get("manufacturing_date"),
        "expiry_date": result.get("expiry_date"),
        "originating_site": result.get("originating_site"),
        "impacted_npm": result.get("impacted_npm"),
        "defect_summary": result.get("defect_summary"),
        "complaint_category": result.get("complaint_category"),
        "complaint_description": result.get("complaint_description"),
        "severity": result.get("severity"),
        "suggested_action": result.get("suggested_action"),
        "initial_risk_assessment": result.get("initial_risk_assessment"),
        "status": result.get("status", "ready_to_commit"),
        "raw_input": extracted_text,
    }

    complaint = db.query(Complaint).filter(Complaint.session_id == session_id).first()
    if complaint:
        for k, v in extracted.items():
            if v is not None:
                setattr(complaint, k, v)
    else:
        clean = {k: v for k, v in extracted.items() if v is not None}
        clean["session_id"] = session_id
        complaint = Complaint(**clean)
        db.add(complaint)

    db.commit()
    db.refresh(complaint)

    return {
        "session_id": session_id,
        "filename": filename,
        "extracted_text": extracted_text,
        "ai_response": ai_content,
        "extracted_data": extracted,
        "status": result.get("status", "ready_to_commit"),
    }


@router.get("/{session_id}/history")
def get_chat_history(session_id: str, db: Session = Depends(get_db)):
    """Return full chat history for a session."""
    messages = (
        db.query(ChatSession)
        .filter(ChatSession.session_id == session_id)
        .order_by(ChatSession.created_at.asc())
        .all()
    )
    return [
        {"role": m.role, "content": m.content, "created_at": str(m.created_at)}
        for m in messages
    ]
