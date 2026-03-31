from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
import sqlite3

from app.database import get_connection
from app.models import (
    ActualRecord,
    DemandDriverRecord,
    DemandDriversResponse,
    ForecastRecord,
    ItemSummary,
    PreviousYearActualRecord,
)

router = APIRouter(prefix="/api/items", tags=["items"])


def _get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def _latest_inference_date(conn: sqlite3.Connection) -> str:
    row = conn.execute("SELECT MAX(inference_date) AS d FROM forecast_runs").fetchone()
    return row["d"]


@router.get("", response_model=List[ItemSummary])
def list_items(
    search: Optional[str] = Query(None, description="Filter item_id by substring"),
    db: sqlite3.Connection = Depends(_get_db),
):
    latest = _latest_inference_date(db)
    if search:
        pattern = f"%{search}%"
        rows = db.execute(
            """
            SELECT i.item_id,
                   CASE WHEN fr.item_id IS NOT NULL THEN 1 ELSE 0 END AS has_forecast
            FROM items i
            LEFT JOIN (
                SELECT DISTINCT item_id FROM forecast_runs WHERE inference_date = ?
            ) fr ON i.item_id = fr.item_id
            WHERE i.item_id LIKE ?
            ORDER BY i.item_id
            """,
            (latest, pattern),
        ).fetchall()
    else:
        rows = db.execute(
            """
            SELECT i.item_id,
                   CASE WHEN fr.item_id IS NOT NULL THEN 1 ELSE 0 END AS has_forecast
            FROM items i
            LEFT JOIN (
                SELECT DISTINCT item_id FROM forecast_runs WHERE inference_date = ?
            ) fr ON i.item_id = fr.item_id
            ORDER BY i.item_id
            """,
            (latest,),
        ).fetchall()

    return [
        ItemSummary(
            item_id=r["item_id"],
            has_forecast=bool(r["has_forecast"]),
            latest_inference_date=latest,
        )
        for r in rows
    ]


@router.get("/{item_id}/actuals", response_model=List[ActualRecord])
def get_actuals(
    item_id: str,
    weeks: Optional[int] = Query(None, ge=1, description="Limit to last N weeks"),
    db: sqlite3.Connection = Depends(_get_db),
):
    _assert_item_exists(db, item_id)
    if weeks:
        rows = db.execute(
            """
            SELECT timestamp, units_sold, avg_unit_price, cust_instock
            FROM historical_actuals
            WHERE item_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (item_id, weeks),
        ).fetchall()
        rows = list(reversed(rows))
    else:
        rows = db.execute(
            """
            SELECT timestamp, units_sold, avg_unit_price, cust_instock
            FROM historical_actuals
            WHERE item_id = ?
            ORDER BY timestamp
            """,
            (item_id,),
        ).fetchall()
    return [dict(r) for r in rows]


@router.get("/{item_id}/forecast", response_model=List[ForecastRecord])
def get_forecast(
    item_id: str,
    inference_date: Optional[str] = Query(None, description="Specific inference date (default: latest)"),
    db: sqlite3.Connection = Depends(_get_db),
):
    _assert_item_exists(db, item_id)
    target_date = inference_date or _latest_inference_date(db)

    rows = db.execute(
        """
        SELECT fv.timestamp, fv.mean,
               fv.p05, fv.p10, fv.p15, fv.p20, fv.p25,
               fv.p30, fv.p35, fv.p40, fv.p45, fv.p50,
               fv.p55, fv.p60, fv.p65, fv.p70, fv.p75,
               fv.p80, fv.p85, fv.p90, fv.p95
        FROM forecast_values fv
        JOIN forecast_runs fr ON fv.forecast_run_id = fr.id
        WHERE fr.item_id = ? AND fr.inference_date = ?
        ORDER BY fv.timestamp
        """,
        (item_id, target_date),
    ).fetchall()
    return [dict(r) for r in rows]


@router.get("/{item_id}/demand-drivers", response_model=DemandDriversResponse)
def get_demand_drivers(
    item_id: str,
    db: sqlite3.Connection = Depends(_get_db),
):
    _assert_item_exists(db, item_id)
    latest = _latest_inference_date(db)

    historical = db.execute(
        """
        SELECT timestamp, avg_unit_price, cust_instock
        FROM historical_actuals
        WHERE item_id = ?
        ORDER BY timestamp
        """,
        (item_id,),
    ).fetchall()

    projected = db.execute(
        """
        SELECT fdd.timestamp, fdd.avg_unit_price, fdd.cust_instock
        FROM forecast_demand_drivers fdd
        JOIN forecast_runs fr ON fdd.forecast_run_id = fr.id
        WHERE fr.item_id = ? AND fr.inference_date = ?
        ORDER BY fdd.timestamp
        """,
        (item_id, latest),
    ).fetchall()

    return DemandDriversResponse(
        historical=[dict(r) for r in historical],
        projected=[dict(r) for r in projected],
    )


@router.get("/{item_id}/previous-year-actuals", response_model=List[PreviousYearActualRecord])
def get_previous_year_actuals(
    item_id: str,
    db: sqlite3.Connection = Depends(_get_db),
):
    """Return actuals from ~52 weeks before each week in the current 52-week window.

    The current window: 13 weeks history + 39 weeks forward from the latest
    inference date. We shift that entire range back by 52 weeks and pull
    historical actuals that fall within that prior-year window.
    """
    _assert_item_exists(db, item_id)
    latest = _latest_inference_date(db)

    rows = db.execute(
        """
        SELECT timestamp, units_sold
        FROM historical_actuals
        WHERE item_id = ?
          AND timestamp >= DATE(?, '-455 days')
          AND timestamp <  DATE(?, '-84 days')
        ORDER BY timestamp
        """,
        (item_id, latest, latest),
    ).fetchall()
    return [dict(r) for r in rows]


def _assert_item_exists(db: sqlite3.Connection, item_id: str) -> None:
    row = db.execute("SELECT 1 FROM items WHERE item_id = ?", (item_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Item '{item_id}' not found")
