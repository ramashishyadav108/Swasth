"""
Pharmacy CRM – FastAPI Application Entry Point
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import Base, engine
from routers import dashboard, inventory, sales, purchases

# ── App factory ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Pharmacy CRM API",
    description="Backend API for the Swastiq Pharmacy CRM application.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────────

_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
# Support comma-separated list of allowed origins for multi-env deploys
_allowed_origins = [u.strip() for u in _frontend_url.split(",") if u.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup ────────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def on_startup():
    """Create all database tables on application startup."""
    Base.metadata.create_all(bind=engine)


# ── Routers ────────────────────────────────────────────────────────────────────

app.include_router(dashboard.router)
app.include_router(inventory.router)
app.include_router(sales.router)
app.include_router(purchases.router)


# ── Health check ───────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Pharmacy CRM API is running."}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}


# ── Entrypoint ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
