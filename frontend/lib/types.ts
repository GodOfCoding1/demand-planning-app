export interface ItemSummary {
  item_id: string;
  has_forecast: boolean;
  latest_inference_date: string | null;
}

export interface ActualRecord {
  timestamp: string;
  units_sold: number;
  avg_unit_price: number | null;
  cust_instock: number | null;
}

export interface ForecastRecord {
  timestamp: string;
  mean: number | null;
  p05: number | null;
  p10: number | null;
  p15: number | null;
  p20: number | null;
  p25: number | null;
  p30: number | null;
  p35: number | null;
  p40: number | null;
  p45: number | null;
  p50: number | null;
  p55: number | null;
  p60: number | null;
  p65: number | null;
  p70: number | null;
  p75: number | null;
  p80: number | null;
  p85: number | null;
  p90: number | null;
  p95: number | null;
}

export interface DemandDriverRecord {
  timestamp: string;
  avg_unit_price: number | null;
  cust_instock: number | null;
}

export interface DemandDriversResponse {
  historical: DemandDriverRecord[];
  projected: DemandDriverRecord[];
}

export interface AggregateHistoricalPoint {
  timestamp: string;
  total_units_sold: number;
}

export interface AggregateForecastPoint {
  timestamp: string;
  total_mean: number;
}

export interface AggregateChartResponse {
  historical: AggregateHistoricalPoint[];
  forecast: AggregateForecastPoint[];
}

export interface AlertItem {
  item_id: string;
  mape: number;
  direction: string;
  recent_actual: number;
  recent_forecast: number;
}

export interface PreviousYearActualRecord {
  timestamp: string;
  units_sold: number;
}

export interface AccuracyRunSummary {
  inference_date: string;
  mape: number;
  wmape: number;
  bias_pct: number;
  overlap_weeks: number;
  num_items: number;
}

export interface AccuracyWeekPoint {
  timestamp: string;
  total_actual: number;
  total_predicted: number;
  mape: number;
}

export interface AccuracyOverviewResponse {
  by_run: AccuracyRunSummary[];
  weekly: AccuracyWeekPoint[];
  overall_mape: number;
  overall_wmape: number;
  total_weeks: number;
}

export interface ItemAccuracyPoint {
  timestamp: string;
  actual: number;
  predicted: number;
  mape: number;
}

export interface ItemAccuracyResponse {
  points: ItemAccuracyPoint[];
  overall_mape: number;
  overall_wmape: number;
  total_weeks: number;
}
