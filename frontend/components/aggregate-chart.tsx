"use client";

import { useEffect, useState } from "react";
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
import { fetchAggregateChart, fetchInferenceDates } from "@/lib/api-client";
import { formatWeek, formatNumber } from "@/lib/format";

interface ChartPoint {
  timestamp: string;
  actual?: number;
  forecast?: number;
  prev_inference?: number;
  is_bridge?: boolean;
}

export function AggregateChart() {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [boundary, setBoundary] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [res, dates] = await Promise.all([
        fetchAggregateChart(),
        fetchInferenceDates(),
      ]);

      const points: ChartPoint[] = [];
      for (const h of res.historical) {
        points.push({ timestamp: h.timestamp, actual: h.total_units_sold });
      }

      const lastHistorical = res.historical[res.historical.length - 1];
      setBoundary(lastHistorical?.timestamp ?? "");

      // Bridge: connect the lines visually
      if (lastHistorical && res.forecast.length > 0) {
        const lastPoint = points[points.length - 1];
        if (lastPoint) {
          lastPoint.forecast = lastHistorical.total_units_sold;
          lastPoint.is_bridge = true;
        }
      }

      for (const f of res.forecast) {
        points.push({ timestamp: f.timestamp, forecast: Math.round(f.total_mean) });
      }

      // Fetch previous inference's forecast to show overlap comparison
      if (dates.length >= 2) {
        const secondLatest = dates[dates.length - 2];
        const prevRes = await fetchAggregateChart(secondLatest);
        const actualTimestamps = new Set(res.historical.map((h) => h.timestamp));
        for (const pf of prevRes.forecast) {
          if (!actualTimestamps.has(pf.timestamp)) continue;
          const match = points.find((p) => p.timestamp === pf.timestamp);
          if (match) {
            match.prev_inference = Math.round(pf.total_mean);
          }
        }
      }

      setData(points);
    }

    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const hasPrevInference = data.some((d) => d.prev_inference != null);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aggregate Demand</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Aggregate Demand</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Failed to load chart: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aggregate Demand Overview</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total demand across all SKUs — last 13 weeks of actual sales + next 39 weeks from the latest forecast run (Apr 20)
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={340}>
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
                const point = data.find((d) => d.timestamp === label);
                const items = payload.filter((p) => {
                  if (p.value == null) return false;
                  if (p.dataKey === "forecast" && point?.is_bridge) return false;
                  return true;
                });
                if (items.length === 0) return null;

                const labels: Record<string, string> = {
                  actual: "Historical",
                  forecast: "Forecast",
                  prev_inference: "Prev. Inference Forecast",
                };

                const actualEntry = items.find((i) => i.dataKey === "actual");
                const prevInfEntry = items.find((i) => i.dataKey === "prev_inference");
                let mapeNote: string | null = null;
                if (actualEntry?.value != null && prevInfEntry?.value != null) {
                  const act = Number(actualEntry.value);
                  const pred = Number(prevInfEntry.value);
                  if (act !== 0) {
                    const mape = Math.abs((pred - act) / act) * 100;
                    mapeNote = `MAPE: ${mape.toFixed(1)}%`;
                  }
                }

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
                    {mapeNote && (
                      <div className="mt-1 pt-1 border-t text-xs font-medium text-amber-600">
                        {mapeNote}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Legend
              formatter={(value) => {
                const labels: Record<string, string> = {
                  actual: "Historical Actuals",
                  forecast: "Forecast (Mean)",
                  prev_inference: "Prev. Inference Forecast",
                };
                return labels[value] ?? value;
              }}
            />
            {boundary && (
              <ReferenceLine
                x={boundary}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{ value: "Today", position: "top", fontSize: 11, fill: "#64748b" }}
              />
            )}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="forecast"
              stroke="#0d9488"
              strokeWidth={2}
              strokeDasharray="6 3"
              fill="#0d948820"
              dot={false}
              connectNulls={false}
            />
            {hasPrevInference && (
              <Line
                type="monotone"
                dataKey="prev_inference"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
