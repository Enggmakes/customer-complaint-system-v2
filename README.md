# Customer Complaint Management System (CCMS)
## AI-Powered Pharmaceutical QMS

---

## 🏗️ Architecture

```
Frontend (React + Redux)  ──→  Backend (FastAPI)  ──→  LangGraph Agent  ──→  Groq LLM
                                      ↕
                               SQLite Database
```

---

## 🚀 Setup & Running

### 1. Backend Setup

```bash
cd backend

# Copy & fill in your Groq API key
# Edit .env and replace: GROQ_API_KEY=your_groq_api_key_here
# Get your key from: https://console.groq.com/keys

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend runs at: **http://localhost:8000**
API Docs: **http://localhost:8000/docs**

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 🔑 Getting Your Groq API Key

1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up / Log in (free, no credit card required)
3. Navigate to **API Keys** → **Create API Key**
4. Copy the key into `backend/.env`:
   ```
   GROQ_API_KEY=gsk_your_actual_key_here
   ```

---

## 🤖 AI Models Used

| Model | Use Case |
|---|---|
| `llama-3.3-70b-versatile` | Primary: Complaint parsing, defect analysis, risk assessment |
| `llama-3.1-8b-instant` | Secondary: Fast facility/NPM classification |

---

## 🧠 LangGraph Agent Pipeline

```
User Input → parse_complaint → classify_facility → defect_analysis → risk_assessment → format_response
```

Each node uses a specialized LLM prompt to extract different aspects of the complaint.

---

## 📁 Project Structure

```
Customer Complaint Management System/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── database.py          # SQLite + SQLAlchemy
│   ├── models.py            # ORM models
│   ├── schemas.py           # Pydantic schemas
│   ├── .env                 # ← PUT YOUR GROQ API KEY HERE
│   ├── requirements.txt
│   ├── agent/
│   │   ├── state.py         # LangGraph state
│   │   ├── nodes.py         # 5 processing nodes
│   │   └── graph.py         # Graph assembly
│   └── routers/
│       ├── chat.py          # POST /api/chat/message
│       └── complaints.py    # CRUD /api/complaints/
└── frontend/
    └── src/
        ├── store/           # Redux slices
        ├── pages/           # Dashboard, LogComplaint, QMSLedger
        └── components/      # Sidebar, AICopilot, ComplaintForm
```

---

## 💡 Sample Complaint to Test

Paste this into the AIVOA Copilot:

> Apollo Pharmacy reported discolored capsules in Amoxicillin Capsules 500 mg. Batch number AMX240602. Manufacturing date March 2026. Expiry date February 2028. 12 capsules affected in a sealed bottle. Please log this complaint.
