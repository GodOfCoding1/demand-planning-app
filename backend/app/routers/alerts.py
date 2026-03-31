from __future__ import annotations

import sqlite3
from typing import List

from fastapi import APIRouter, Depends, Query

from app.database import get_connection
from app.models import AlertItem

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


def _get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


@router.get("", response_model=List[AlertItem])
def get_alerts(
    threshold: float = Query(20.0, description="MAPE threshold (%) to flag an item"),
    limit: int = Query(50, ge=1, le=200, description="Max alerts to return"),
    db: sqlite3.Connection = Depends(_get_db),
):
    """Compute forecast accuracy alerts using MAPE.

    Strategy: take the second-to-latest inference run for each item and compare
    its forecasted mean values against the actual units_sold for overlapping
    weeks. Items whose MAPE exceeds the threshold are returned sorted by
    worst accuracy.
    """
    latest = _latest_inference_date(db)
    second_latest = _second_latest_inference_date(db)
    if not second_latest:
        return []

    rows = db.execute(
        """
        SELECT
            fr.item_id,
            AVG(ABS(fv.mean - ha.units_sold) / NULLIF(ha.units_sold, 0)) * 100 AS mape,
            SUM(fv.mean - ha.units_sold) AS total_bias,
            AVG(ha.units_sold) AS avg_actual,
            AVG(fv.mean) AS avg_forecast
        FROM forecast_values fv
        JOIN forecast_runs fr ON fv.forecast_run_id = fr.id
        JOIN historical_actuals ha
            ON ha.item_id = fr.item_id AND ha.timestamp = fv.timestamp
        WHERE fr.inference_date = ?
          AND ha.units_sold > 0
        GROUP BY fr.item_id
        HAVING mape >= ?
        ORDER BY mape DESC
        LIMIT ?
        """,
        (second_latest, threshold, limit),
    ).fetchall()

    return [
        AlertItem(
            item_id=r["item_id"],
            mape=round(r["mape"], 2),
            direction="over-forecast" if r["total_bias"] > 0 else "under-forecast",
            recent_actual=round(r["avg_actual"], 1),
            recent_forecast=round(r["avg_forecast"], 1),
        )
        for r in rows
    ]


def _latest_inference_date(conn: sqlite3.Connection) -> str:
    row = conn.execute("SELECT MAX(inference_date) AS d FROM forecast_runs").fetchone()
    return row["d"]


def _second_latest_inference_date(conn: sqlite3.Connection):
    row = conn.execute(
        """
        SELECT DISTINCT inference_date
        FROM forecast_runs
        ORDER BY inference_date DESC
        LIMIT 1 OFFSET 1
        """
    ).fetchone()
    return row["inference_date"] if row else None
