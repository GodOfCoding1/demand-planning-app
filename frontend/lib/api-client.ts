import type {
  ItemSummary,
  ActualRecord,
  ForecastRecord,
  DemandDriversResponse,
  PreviousYearActualRecord,
  AggregateChartResponse,
  AlertItem,
  AccuracyOverviewResponse,
  ItemAccuracyResponse,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`API ${path} returned ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchItems(search?: string): Promise<ItemSummary[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return get<ItemSummary[]>(`/api/items${qs}`);
}

export function fetchActuals(
  itemId: string,
  weeks?: number,
): Promise<ActualRecord[]> {
  const qs = weeks ? `?weeks=${weeks}` : "";
  return get<ActualRecord[]>(`/api/items/${encodeURIComponent(itemId)}/actuals${qs}`);
}

export function fetchForecast(
  itemId: string,
  inferenceDate?: string,
): Promise<ForecastRecord[]> {
  const qs = inferenceDate
    ? `?inference_date=${encodeURIComponent(inferenceDate)}`
    : "";
  return get<ForecastRecord[]>(
    `/api/items/${encodeURIComponent(itemId)}/forecast${qs}`,
  );
}

export function fetchDemandDrivers(
  itemId: string,
): Promise<DemandDriversResponse> {
  return get<DemandDriversResponse>(
    `/api/items/${encodeURIComponent(itemId)}/demand-drivers`,
  );
}

export function fetchPreviousYearActuals(
  itemId: string,
): Promise<PreviousYearActualRecord[]> {
  return get<PreviousYearActualRecord[]>(
    `/api/items/${encodeURIComponent(itemId)}/previous-year-actuals`,
  );
}

export function fetchAggregateChart(
  inferenceDate?: string,
): Promise<AggregateChartResponse> {
  const qs = inferenceDate
    ? `?inference_date=${encodeURIComponent(inferenceDate)}`
    : "";
  return get<AggregateChartResponse>(`/api/aggregate/chart${qs}`);
}

export function fetchAlerts(
  threshold?: number,
  limit?: number,
): Promise<AlertItem[]> {
  const params = new URLSearchParams();
  if (threshold !== undefined) params.set("threshold", String(threshold));
  if (limit !== undefined) params.set("limit", String(limit));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return get<AlertItem[]>(`/api/alerts${qs}`);
}

export function fetchInferenceDates(): Promise<string[]> {
  return get<string[]>("/api/meta/inference-dates");
}

export function fetchAccuracyOverview(): Promise<AccuracyOverviewResponse> {
  return get<AccuracyOverviewResponse>("/api/accuracy/overview");
}

export function fetchItemAccuracy(
  itemId: string,
): Promise<ItemAccuracyResponse> {
  return get<ItemAccuracyResponse>(
    `/api/accuracy/items/${encodeURIComponent(itemId)}`,
  );
}
