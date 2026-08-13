from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

import models
from database import engine, Base
from routers import chat, complaints

# Create all DB tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CCMS — Customer Complaint Management System",
    description="AI-powered QMS complaint management for pharmaceutical manufacturing",
    version="1.0.0",
    redirect_slashes=False,
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(chat.router)
app.include_router(complaints.router)


@app.get("/")
def root():
    return {
        "name": "CCMS API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
