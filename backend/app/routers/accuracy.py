from __future__ import annotations

import sqlite3
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.database import get_connection
from app.models import (
    AccuracyOverviewResponse,
    AccuracyRunSummary,
    AccuracyWeekPoint,
    ItemAccuracyPoint,
    ItemAccuracyResponse,
)

router = APIRouter(prefix="/api/accuracy", tags=["accuracy"])


def _get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


@router.get("/overview", response_model=AccuracyOverviewResponse)
def accuracy_overview(db: sqlite3.Connection = Depends(_get_db)):
    """Compute model accuracy across ALL inference runs that overlap with actuals.

    Returns two views:
    1. by_run: MAPE / WMAPE per inference date (only runs with >=1 overlapping week)
    2. weekly: For each week with actuals, the predicted vs actual totals using the
       earliest inference run that covers that week (maximises horizon coverage).
    """

    by_run = db.execute(
        """
        SELECT
            fr.inference_date,
            AVG(ABS(fv.mean - ha.units_sold) / ha.units_sold) * 100  AS mape,
            SUM(ABS(fv.mean - ha.units_sold)) * 100.0 / SUM(ha.units_sold) AS wmape,
            (SUM(fv.mean - ha.units_sold) * 100.0 / SUM(ha.units_sold))  AS bias_pct,
            COUNT(DISTINCT fv.timestamp) AS overlap_weeks,
            COUNT(DISTINCT fr.item_id)   AS num_items
        FROM forecast_values fv
        JOIN forecast_runs fr ON fv.forecast_run_id = fr.id
        JOIN historical_actuals ha
            ON ha.item_id = fr.item_id AND ha.timestamp = fv.timestamp
        WHERE ha.units_sold > 0
        GROUP BY fr.inference_date
        HAVING overlap_weeks >= 1
        ORDER BY fr.inference_date
        """
    ).fetchall()

    run_summaries = [
        AccuracyRunSummary(
            inference_date=r["inference_date"],
            mape=round(r["mape"], 2),
            wmape=round(r["wmape"], 2),
            bias_pct=round(r["bias_pct"], 2),
            overlap_weeks=r["overlap_weeks"],
            num_items=r["num_items"],
        )
        for r in by_run
    ]

    # Weekly view: for each (item, week) pick the earliest inference run,
    # then aggregate across items per week.
    weekly_rows = db.execute(
        """
        WITH ranked AS (
            SELECT
                fr.item_id,
                fv.timestamp,
                fr.inference_date,
                fv.mean            AS predicted,
                ha.units_sold      AS actual,
                ROW_NUMBER() OVER (
                    PARTITION BY fr.item_id, fv.timestamp
                    ORDER BY fr.inference_date ASC
                ) AS rn
            FROM forecast_values fv
            JOIN forecast_runs fr ON fv.forecast_run_id = fr.id
            JOIN historical_actuals ha
                ON ha.item_id = fr.item_id AND ha.timestamp = fv.timestamp
            WHERE ha.units_sold > 0
        )
        SELECT
            timestamp,
            ROUND(SUM(predicted), 1) AS total_predicted,
            SUM(actual)              AS total_actual
        FROM ranked
        WHERE rn = 1
        GROUP BY timestamp
        ORDER BY timestamp
        """
    ).fetchall()

    weekly_points: List[AccuracyWeekPoint] = []
    for r in weekly_rows:
        act = r["total_actual"]
        pred = r["total_predicted"]
        wk_mape = abs(pred - act) / act * 100 if act else 0
        weekly_points.append(
            AccuracyWeekPoint(
                timestamp=r["timestamp"],
                total_actual=round(act, 1),
                total_predicted=round(pred, 1),
                mape=round(wk_mape, 2),
            )
        )

    total_actual = sum(w.total_actual for w in weekly_points)
    total_pred = sum(w.total_predicted for w in weekly_points)
    overall_wmape = (
        abs(total_pred - total_actual) / total_actual * 100 if total_actual else 0
    )
    overall_mape = (
        sum(w.mape for w in weekly_points) / len(weekly_points)
        if weekly_points
        else 0
    )

    return AccuracyOverviewResponse(
        by_run=run_summaries,
        weekly=weekly_points,
        overall_mape=round(overall_mape, 2),
        overall_wmape=round(overall_wmape, 2),
        total_weeks=len(weekly_points),
    )


@router.get("/items/{item_id}", response_model=ItemAccuracyResponse)
def item_accuracy(item_id: str, db: sqlite3.Connection = Depends(_get_db)):
    """Per-item accuracy: for each week with actuals, use the earliest inference
    forecast to maximise the number of comparable weeks."""

    row = db.execute("SELECT 1 FROM items WHERE item_id = ?", (item_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Item '{item_id}' not found")

    rows = db.execute(
        """
        WITH ranked AS (
            SELECT
                fv.timestamp,
                fr.inference_date,
                fv.mean        AS predicted,
                ha.units_sold  AS actual,
                ROW_NUMBER() OVER (
                    PARTITION BY fv.timestamp
                    ORDER BY fr.inference_date ASC
                ) AS rn
            FROM forecast_values fv
            JOIN forecast_runs fr ON fv.forecast_run_id = fr.id
            JOIN historical_actuals ha
                ON ha.item_id = fr.item_id AND ha.timestamp = fv.timestamp
            WHERE fr.item_id = ? AND ha.units_sold > 0
        )
        SELECT timestamp, predicted, actual
        FROM ranked
        WHERE rn = 1
        ORDER BY timestamp
        """,
        (item_id,),
    ).fetchall()

    points: List[ItemAccuracyPoint] = []
    for r in rows:
        act = r["actual"]
        pred = r["predicted"]
        mape = abs(pred - act) / act * 100 if act else 0
        points.append(
            ItemAccuracyPoint(
                timestamp=r["timestamp"],
                actual=round(act, 1),
                predicted=round(pred, 1),
                mape=round(mape, 2),
            )
        )

    total_actual = sum(p.actual for p in points)
    total_pred = sum(p.predicted for p in points)
    overall_wmape = (
        abs(total_pred - total_actual) / total_actual * 100 if total_actual else 0
    )
    overall_mape = (
        sum(p.mape for p in points) / len(points) if points else 0
    )

    return ItemAccuracyResponse(
        points=points,
        overall_mape=round(overall_mape, 2),
        overall_wmape=round(overall_wmape, 2),
        total_weeks=len(points),
    )
