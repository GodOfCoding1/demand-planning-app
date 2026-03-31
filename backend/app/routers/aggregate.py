from __future__ import annotations

import sqlite3
from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from app.database import get_connection
from app.models import AggregateChartResponse

router = APIRouter(prefix="/api/aggregate", tags=["aggregate"])


def _get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def _latest_inference_date(conn: sqlite3.Connection) -> str:
    row = conn.execute("SELECT MAX(inference_date) AS d FROM forecast_runs").fetchone()
    return row["d"]


@router.get("/chart", response_model=AggregateChartResponse)
def aggregate_chart(
    inference_date: Optional[str] = Query(None, description="Specific inference date (default: latest)"),
    db: sqlite3.Connection = Depends(_get_db),
):
    """Aggregated view for the home page.

    Returns the last 13 weeks of total historical units_sold across all SKUs
    and the next 39 weeks of total forecasted mean (from the given inference).
    """
    target = inference_date or _latest_inference_date(db)

    historical = db.execute(
        """
        SELECT timestamp, SUM(units_sold) AS total_units_sold
        FROM historical_actuals
        WHERE timestamp > DATE(?, '-91 days')
          AND timestamp <= ?
        GROUP BY timestamp
        ORDER BY timestamp
        """,
        (target, target),
    ).fetchall()

    forecast = db.execute(
        """
        SELECT fv.timestamp, SUM(fv.mean) AS total_mean
        FROM forecast_values fv
        JOIN forecast_runs fr ON fv.forecast_run_id = fr.id
        WHERE fr.inference_date = ?
        GROUP BY fv.timestamp
        ORDER BY fv.timestamp
        LIMIT 39
        """,
        (target,),
    ).fetchall()

    return AggregateChartResponse(
        historical=[dict(r) for r in historical],
        forecast=[dict(r) for r in forecast],
    )
