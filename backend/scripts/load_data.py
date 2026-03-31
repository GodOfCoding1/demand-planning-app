"""
One-time script to parse CSV files and load normalised data into SQLite.

Usage:
    python -m scripts.load_data          (from the backend/ directory)
    python scripts/load_data.py          (from the backend/ directory)
"""

from __future__ import annotations

import csv
import json
import sqlite3
import sys
import time
from pathlib import Path
from typing import List, Tuple

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = PROJECT_ROOT / "Interview_takehomr_data"

sys.path.insert(0, str(BACKEND_DIR))
from app.database import DB_PATH, init_db, get_connection


def load_aggregated_data(conn: sqlite3.Connection) -> None:
    csv_path = DATA_DIR / "aggregated_data.csv"
    print(f"Loading {csv_path} ...")

    items: set = set()
    actuals_rows: List[Tuple] = []

    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            item_id = row["item_id"]
            items.add(item_id)

            drivers = json.loads(row["demand_drivers"])
            actuals_rows.append((
                item_id,
                row["timestamp"],
                int(row["units_sold"]),
                drivers.get("avg_unit_price"),
                drivers.get("cust_instock"),
            ))

    conn.executemany(
        "INSERT OR IGNORE INTO items (item_id) VALUES (?)",
        [(i,) for i in sorted(items)],
    )
    conn.executemany(
        "INSERT OR IGNORE INTO historical_actuals "
        "(item_id, timestamp, units_sold, avg_unit_price, cust_instock) "
        "VALUES (?, ?, ?, ?, ?)",
        actuals_rows,
    )
    conn.commit()
    print(f"  Inserted {len(items)} items, {len(actuals_rows)} historical_actuals rows.")


def load_forecast_data(conn: sqlite3.Connection) -> None:
    csv_path = DATA_DIR / "forecast_data.csv"
    print(f"Loading {csv_path} ...")

    forecast_val_rows: List[Tuple] = []
    demand_driver_rows: List[Tuple] = []
    auto_feature_rows: List[Tuple] = []
    run_count = 0

    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            item_id = row["item_id"]
            conn.execute("INSERT OR IGNORE INTO items (item_id) VALUES (?)", (item_id,))

            cursor = conn.execute(
                "INSERT INTO forecast_runs "
                "(inference_id, item_id, inference_date, model_id, run_id, client_id, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    row["inference_id"],
                    item_id,
                    row["inference_date"],
                    row["model_id"],
                    row["run_id"],
                    row["client_id"],
                    row["created_at"],
                ),
            )
            run_id = cursor.lastrowid
            run_count += 1

            for fc in json.loads(row["forecasts"]):
                v = fc["values"]
                forecast_val_rows.append((
                    run_id,
                    fc["timestamp"],
                    v.get("mean"),
                    v.get("p05"), v.get("p10"), v.get("p15"), v.get("p20"), v.get("p25"),
                    v.get("p30"), v.get("p35"), v.get("p40"), v.get("p45"), v.get("p50"),
                    v.get("p55"), v.get("p60"), v.get("p65"), v.get("p70"), v.get("p75"),
                    v.get("p80"), v.get("p85"), v.get("p90"), v.get("p95"),
                ))

            for dd in json.loads(row["demand_drivers"]):
                dv = dd["values"]
                demand_driver_rows.append((
                    run_id,
                    dd["timestamp"],
                    dv.get("avg_unit_price"),
                    dv.get("cust_instock"),
                ))

            for af in json.loads(row["auto_features"]):
                av = af["values"]
                auto_feature_rows.append((
                    run_id,
                    af["timestamp"],
                    av.get("week_of_year"),
                    av.get("week_of_month"),
                    av.get("month_of_year"),
                    av.get("days_to_christmas"),
                    av.get("days_to_thanksgiving"),
                ))

            if run_count % 200 == 0:
                _flush_forecast_batches(
                    conn, forecast_val_rows, demand_driver_rows, auto_feature_rows
                )
                forecast_val_rows.clear()
                demand_driver_rows.clear()
                auto_feature_rows.clear()
                print(f"  Processed {run_count} forecast runs ...")

    _flush_forecast_batches(conn, forecast_val_rows, demand_driver_rows, auto_feature_rows)
    conn.commit()
    print(
        f"  Inserted {run_count} forecast_runs, "
        f"~{run_count * 40} forecast_values, "
        f"~{run_count * 41} forecast_demand_drivers, "
        f"~{run_count * 41} forecast_auto_features."
    )


def _flush_forecast_batches(
    conn: sqlite3.Connection,
    fv: List[Tuple],
    dd: List[Tuple],
    af: List[Tuple],
) -> None:
    if fv:
        conn.executemany(
            "INSERT INTO forecast_values "
            "(forecast_run_id, timestamp, mean, "
            "p05, p10, p15, p20, p25, p30, p35, p40, p45, p50, "
            "p55, p60, p65, p70, p75, p80, p85, p90, p95) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            fv,
        )
    if dd:
        conn.executemany(
            "INSERT INTO forecast_demand_drivers "
            "(forecast_run_id, timestamp, avg_unit_price, cust_instock) "
            "VALUES (?, ?, ?, ?)",
            dd,
        )
    if af:
        conn.executemany(
            "INSERT INTO forecast_auto_features "
            "(forecast_run_id, timestamp, week_of_year, week_of_month, "
            "month_of_year, days_to_christmas, days_to_thanksgiving) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            af,
        )


def main() -> None:
    print(f"Database path: {DB_PATH}")
    if DB_PATH.exists():
        DB_PATH.unlink()
        print("Removed existing database.")

    init_db()
    conn = get_connection()

    t0 = time.time()
    load_aggregated_data(conn)
    load_forecast_data(conn)
    elapsed = time.time() - t0

    row_counts = conn.execute(
        "SELECT "
        "(SELECT COUNT(*) FROM items) AS items, "
        "(SELECT COUNT(*) FROM historical_actuals) AS actuals, "
        "(SELECT COUNT(*) FROM forecast_runs) AS runs, "
        "(SELECT COUNT(*) FROM forecast_values) AS fv, "
        "(SELECT COUNT(*) FROM forecast_demand_drivers) AS fdd, "
        "(SELECT COUNT(*) FROM forecast_auto_features) AS faf"
    ).fetchone()
    print(f"\nFinal row counts:")
    for key in row_counts.keys():
        print(f"  {key}: {row_counts[key]}")
    print(f"\nDone in {elapsed:.1f}s")
    conn.close()


if __name__ == "__main__":
    main()
