from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

import models
from database import engine, Base, auto_migrate_db
from routers import chat, complaints, tools

# Create all DB tables & run auto migrations on startup
Base.metadata.create_all(bind=engine)
auto_migrate_db()

app = FastAPI(
    title="ahsi AI — Universal Operations & Business Hub",
    description="Multi-functional AI operations hub for any business, any industry, services, proposals, and issue triage.",
    version="2.0.0",
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
app.include_router(tools.router)


@app.get("/")
def root():
    return {
        "name": "ahsi AI API",
        "version": "2.0.0",
        "docs": "/docs",
        "workspaces": [
            "ecommerce",
            "tech_saas",
            "services_freelance",
            "healthcare_pharma",
            "manufacturing",
            "general"
        ],
        "status": "running"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
