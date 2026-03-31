"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActualRecord, ForecastRecord, PreviousYearActualRecord } from "@/lib/types";
import { formatWeek, formatNumber } from "@/lib/format";

interface ForecastChartProps {
  actuals: ActualRecord[];
  forecast: ForecastRecord[];
  prevYear: PreviousYearActualRecord[];
  loading: boolean;
}

interface ChartPoint {
  timestamp: string;
  actual?: number;
  forecast_mean?: number;
  is_bridge?: boolean;
  band_base?: number;
  band_width?: number;
  prev_year?: number;
}

export function ForecastChart({
  actuals,
  forecast,
  prevYear,
  loading,
}: ForecastChartProps) {
  const { data, boundary } = useMemo(() => {
    const pointMap = new Map<string, ChartPoint>();

    for (const a of actuals) {
      pointMap.set(a.timestamp, {
        ...(pointMap.get(a.timestamp) || { timestamp: a.timestamp }),
        timestamp: a.timestamp,
        actual: a.units_sold,
      });
    }

    const boundaryTs = actuals[actuals.length - 1]?.timestamp ?? "";

    // Bridge: add the last actual as the first forecast point so the lines connect
    if (actuals.length > 0 && forecast.length > 0) {
      const lastActual = actuals[actuals.length - 1];
      const existing = pointMap.get(lastActual.timestamp);
      if (existing) {
        existing.forecast_mean = lastActual.units_sold;
        existing.is_bridge = true;
      }
    }

    for (const f of forecast) {
      const p10 = f.p10 != null ? Math.round(f.p10) : undefined;
      const p90 = f.p90 != null ? Math.round(f.p90) : undefined;
      const existing = pointMap.get(f.timestamp) || { timestamp: f.timestamp };
      pointMap.set(f.timestamp, {
        ...existing,
        forecast_mean: f.mean != null ? Math.round(f.mean) : undefined,
        band_base: p10,
        band_width: p10 != null && p90 != null ? p90 - p10 : undefined,
      });
    }

    // Sort all points chronologically
    const points = Array.from(pointMap.values()).sort(
      (a, b) => a.timestamp.localeCompare(b.timestamp),
    );

    if (prevYear.length > 0 && points.length > 0) {
      const prevSorted = [...prevYear].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      const windowStart = new Date(points[0].timestamp + "T00:00:00").getTime();
      const prevStart = new Date(prevSorted[0].timestamp + "T00:00:00").getTime();
      const offsetMs = windowStart - prevStart;

      for (const py of prevSorted) {
        const shiftedTime = new Date(new Date(py.timestamp + "T00:00:00").getTime() + offsetMs);
        const shiftedStr = shiftedTime.toISOString().slice(0, 10);
        const match = points.find((p) => p.timestamp === shiftedStr);
        if (match) {
          match.prev_year = py.units_sold;
        }
      }
    }

    return { data: points, boundary: boundaryTs };
  }, [actuals, forecast, prevYear]);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Forecast & Historicals</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-80 w-full" /></CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Forecast & Historicals</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-12 text-center">
            No data available for this SKU.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forecast & Historicals</CardTitle>
        <p className="text-sm text-muted-foreground">
          Last 13 weeks of actual sales + next 39 weeks from the latest forecast run (Apr 20) with P10–P90 confidence band
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatWeek}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis tickFormatter={formatNumber} tick={{ fontSize: 11 }} width={56} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const hidden = new Set(["band_base", "band_width"]);
                const currentPoint = data.find((d) => d.timestamp === label);
                const items = payload.filter(
                  (p) => {
                    if (hidden.has(String(p.dataKey))) return false;
                    if (p.value == null) return false;
                    if (p.dataKey === "forecast_mean" && currentPoint?.is_bridge) return false;
                    return true;
                  },
                );
                if (items.length === 0) return null;
                const labels: Record<string, string> = {
                  actual: "Historical Actual",
                  forecast_mean: "Forecast (Mean)",
                  prev_year: "Previous Year",
                };

                return (
                  <div className="rounded-md border bg-background px-3 py-2 shadow-md text-sm">
                    <p className="font-medium mb-1">Week of {label}</p>
                    {items.map((entry) => (
                      <div key={String(entry.dataKey)} className="flex justify-between gap-4">
                        <span style={{ color: entry.color }}>
                          {labels[String(entry.dataKey)] ?? String(entry.dataKey)}
                        </span>
                        <span className="font-mono tabular-nums">
                          {formatNumber(Number(entry.value))}
                        </span>
                      </div>
                    ))}
                    {payload.some((p) => p.dataKey === "band_width" && p.value != null) && (
                      <div className="flex justify-between gap-4 text-muted-foreground">
                        <span>P10-P90</span>
                        <span className="font-mono tabular-nums">
                          {(() => {
                            const base = payload.find((p) => p.dataKey === "band_base");
                            const width = payload.find((p) => p.dataKey === "band_width");
                            if (!base?.value || !width?.value) return "—";
                            const p10 = Number(base.value);
                            const p90 = p10 + Number(width.value);
                            return `${formatNumber(p10)} – ${formatNumber(p90)}`;
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Legend
              content={() => (
                <div className="flex flex-wrap justify-center gap-4 text-xs mt-2">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-5 h-0.5 bg-[#2563eb]" /> Historical Actuals
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-5 h-0.5" style={{ backgroundImage: "repeating-linear-gradient(90deg, #2563eb 0, #2563eb 4px, transparent 4px, transparent 8px)", height: 2 }} /> Forecast (Mean)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-3 bg-[#93c5fd] opacity-50 rounded-sm" /> P10-P90 Band
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-5 h-0.5" style={{ backgroundImage: "repeating-linear-gradient(90deg, #94a3b8 0, #94a3b8 3px, transparent 3px, transparent 6px)", height: 2 }} /> Previous Year
                  </span>
                </div>
              )}
            />
            {boundary && (
              <ReferenceLine
                x={boundary}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{ value: "Today", position: "top", fontSize: 11, fill: "#64748b" }}
              />
            )}
            {/* Stacked areas: invisible base (p10) + visible band (p90-p10) */}
            <Area
              type="monotone"
              dataKey="band_base"
              stackId="band"
              stroke="none"
              fill="transparent"
              dot={false}
              connectNulls={false}
              legendType="none"
            />
            <Area
              type="monotone"
              dataKey="band_width"
              stackId="band"
              stroke="none"
              fill="#93c5fd"
              fillOpacity={0.3}
              dot={false}
              connectNulls={false}
              legendType="none"
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
              legendType="none"
            />
            <Line
              type="monotone"
              dataKey="forecast_mean"
              stroke="#2563eb"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              connectNulls={false}
              legendType="none"
            />
            <Line
              type="monotone"
              dataKey="prev_year"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              connectNulls={false}
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
