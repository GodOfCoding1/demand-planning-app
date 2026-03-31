from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import List

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.database import get_connection, DB_PATH, init_db
from app.routers import items, aggregate, alerts, accuracy

app = FastAPI(title="Demand Planning Dashboard API", version="1.0.0")

_default_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
_env_origins = os.getenv("CORS_ORIGINS", "")
_origins = [o.strip() for o in _env_origins.split(",") if o.strip()] if _env_origins else _default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(items.router)
app.include_router(aggregate.router)
app.include_router(alerts.router)
app.include_router(accuracy.router)


@app.on_event("startup")
def _ensure_db():
    """Auto-load CSV data into SQLite if the DB doesn't exist yet.

    This makes the service self-healing on ephemeral filesystems (e.g. Render
    free tier) -- every cold start rebuilds the DB from the bundled CSV files.
    """
    if DB_PATH.exists():
        return
    import sys, time

    backend_dir = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(backend_dir))
    from scripts.load_data import main as load_main

    print("Database not found — loading data from CSV …")
    t0 = time.time()
    load_main()
    print(f"Data loaded in {time.time() - t0:.1f}s")


def _get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


@app.get("/api/meta/inference-dates", response_model=List[str])
def get_inference_dates(db: sqlite3.Connection = Depends(_get_db)):
    rows = db.execute(
        "SELECT DISTINCT inference_date FROM forecast_runs ORDER BY inference_date"
    ).fetchall()
    return [r["inference_date"] for r in rows]


@app.get("/api/health")
def health():
    return {"status": "ok"}
