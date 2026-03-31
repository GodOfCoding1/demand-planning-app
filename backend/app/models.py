from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel


class ItemSummary(BaseModel):
    item_id: str
    has_forecast: bool
    latest_inference_date: Optional[str]


class ActualRecord(BaseModel):
    timestamp: str
    units_sold: int
    avg_unit_price: Optional[float]
    cust_instock: Optional[float]


class ForecastRecord(BaseModel):
    timestamp: str
    mean: Optional[float]
    p05: Optional[float]
    p10: Optional[float]
    p15: Optional[float]
    p20: Optional[float]
    p25: Optional[float]
    p30: Optional[float]
    p35: Optional[float]
    p40: Optional[float]
    p45: Optional[float]
    p50: Optional[float]
    p55: Optional[float]
    p60: Optional[float]
    p65: Optional[float]
    p70: Optional[float]
    p75: Optional[float]
    p80: Optional[float]
    p85: Optional[float]
    p90: Optional[float]
    p95: Optional[float]


class DemandDriverRecord(BaseModel):
    timestamp: str
    avg_unit_price: Optional[float]
    cust_instock: Optional[float]


class DemandDriversResponse(BaseModel):
    historical: List[DemandDriverRecord]
    projected: List[DemandDriverRecord]


class AggregateHistoricalPoint(BaseModel):
    timestamp: str
    total_units_sold: int


class AggregateForecastPoint(BaseModel):
    timestamp: str
    total_mean: float


class AggregateChartResponse(BaseModel):
    historical: List[AggregateHistoricalPoint]
    forecast: List[AggregateForecastPoint]


class AlertItem(BaseModel):
    item_id: str
    mape: float
    direction: str
    recent_actual: float
    recent_forecast: float


class PreviousYearActualRecord(BaseModel):
    timestamp: str
    units_sold: int


class AccuracyRunSummary(BaseModel):
    inference_date: str
    mape: float
    wmape: float
    bias_pct: float
    overlap_weeks: int
    num_items: int


class AccuracyWeekPoint(BaseModel):
    timestamp: str
    total_actual: float
    total_predicted: float
    mape: float


class AccuracyOverviewResponse(BaseModel):
    by_run: List[AccuracyRunSummary]
    weekly: List[AccuracyWeekPoint]
    overall_mape: float
    overall_wmape: float
    total_weeks: int


class ItemAccuracyPoint(BaseModel):
    timestamp: str
    actual: float
    predicted: float
    mape: float


class ItemAccuracyResponse(BaseModel):
    points: List[ItemAccuracyPoint]
    overall_mape: float
    overall_wmape: float
    total_weeks: int
