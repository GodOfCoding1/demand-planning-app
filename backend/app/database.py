from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Optional, Union

DB_PATH = Path(__file__).resolve().parent.parent / "demand_planning.db"

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS items (
    item_id TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS historical_actuals (
    item_id        TEXT    NOT NULL REFERENCES items(item_id),
    timestamp      TEXT    NOT NULL,
    units_sold     INTEGER NOT NULL,
    avg_unit_price REAL,
    cust_instock   REAL,
    PRIMARY KEY (item_id, timestamp)
);

CREATE TABLE IF NOT EXISTS forecast_runs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    inference_id    TEXT    NOT NULL,
    item_id         TEXT    NOT NULL REFERENCES items(item_id),
    inference_date  TEXT    NOT NULL,
    model_id        TEXT,
    run_id          TEXT,
    client_id       TEXT,
    created_at      TEXT,
    UNIQUE (inference_id, item_id)
);

CREATE TABLE IF NOT EXISTS forecast_values (
    forecast_run_id INTEGER NOT NULL REFERENCES forecast_runs(id),
    timestamp       TEXT    NOT NULL,
    mean REAL,
    p05  REAL, p10 REAL, p15 REAL, p20 REAL, p25 REAL,
    p30  REAL, p35 REAL, p40 REAL, p45 REAL, p50 REAL,
    p55  REAL, p60 REAL, p65 REAL, p70 REAL, p75 REAL,
    p80  REAL, p85 REAL, p90 REAL, p95 REAL,
    PRIMARY KEY (forecast_run_id, timestamp)
);

CREATE TABLE IF NOT EXISTS forecast_demand_drivers (
    forecast_run_id INTEGER NOT NULL REFERENCES forecast_runs(id),
    timestamp       TEXT    NOT NULL,
    avg_unit_price  REAL,
    cust_instock    REAL,
    PRIMARY KEY (forecast_run_id, timestamp)
);

CREATE TABLE IF NOT EXISTS forecast_auto_features (
    forecast_run_id    INTEGER NOT NULL REFERENCES forecast_runs(id),
    timestamp          TEXT    NOT NULL,
    week_of_year       INTEGER,
    week_of_month      INTEGER,
    month_of_year      INTEGER,
    days_to_christmas  INTEGER,
    days_to_thanksgiving INTEGER,
    PRIMARY KEY (forecast_run_id, timestamp)
);
"""

INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_ha_item ON historical_actuals(item_id);
CREATE INDEX IF NOT EXISTS idx_ha_timestamp ON historical_actuals(timestamp);
CREATE INDEX IF NOT EXISTS idx_fr_item ON forecast_runs(item_id);
CREATE INDEX IF NOT EXISTS idx_fr_item_date ON forecast_runs(item_id, inference_date);
CREATE INDEX IF NOT EXISTS idx_fv_run ON forecast_values(forecast_run_id);
CREATE INDEX IF NOT EXISTS idx_fdd_run ON forecast_demand_drivers(forecast_run_id);
CREATE INDEX IF NOT EXISTS idx_faf_run ON forecast_auto_features(forecast_run_id);
"""


def get_connection(db_path: Optional[Union[str, Path]] = None) -> sqlite3.Connection:
    path = str(db_path or DB_PATH)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db(db_path: Optional[Union[str, Path]] = None) -> None:
    conn = get_connection(db_path)
    conn.executescript(SCHEMA_SQL)
    conn.executescript(INDEX_SQL)
    conn.commit()
    conn.close()
