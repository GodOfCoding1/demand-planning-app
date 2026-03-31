"use client";

import { useEffect, useState } from "react";
import { InfoBadge } from "@/components/info-badge";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchItemAccuracy } from "@/lib/api-client";
import type { ItemAccuracyResponse } from "@/lib/types";
import { formatWeek, formatNumber } from "@/lib/format";

interface Props {
  itemId: string;
}

export function ItemAccuracyChart({ itemId }: Props) {
  const [data, setData] = useState<ItemAccuracyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchItemAccuracy(itemId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [itemId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Forecast Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Forecast Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Failed to load accuracy data.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (data.points.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Forecast Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-6 text-center">
            No overlapping forecast-vs-actual data for this SKU.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle>Forecast Accuracy</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              How accurate was the model for this SKU? Comparing predictions from
              the earliest forecast run (Jan 5) against actual sales across {data.total_weeks} weeks
              where both exist
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <InfoBadge
              label="MAPE"
              value={`${data.overall_mape.toFixed(1)}%`}
              tooltip="Mean Absolute Percentage Error — average weekly % difference between predicted and actual sales for this SKU. Lower is better. Under 10% is excellent, 10–20% is good."
            />
            <InfoBadge
              label="WMAPE"
              value={`${data.overall_wmape.toFixed(1)}%`}
              tooltip="Weighted MAPE — same as MAPE but weighted by volume, so high-sales weeks count more. More reliable when sales vary a lot week to week."
            />
            <InfoBadge
              label="Weeks"
              value={`${data.total_weeks}`}
              tooltip="Number of weeks where both a forecast prediction and actual sales data exist for this SKU."
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={data.points}
            margin={{ top: 4, right: 12, bottom: 4, left: 12 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatWeek}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="units"
              tickFormatter={formatNumber}
              tick={{ fontSize: 11 }}
              width={48}
            />
            <YAxis
              yAxisId="mape"
              orientation="right"
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 11 }}
              width={44}
              domain={[0, "auto"]}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const pt = data.points.find((p) => p.timestamp === label);
                if (!pt) return null;
                return (
                  <div className="rounded-md border bg-background px-3 py-2 shadow-md text-sm">
                    <p className="font-medium mb-1">Week of {label}</p>
                    <div className="flex justify-between gap-4">
                      <span className="text-[#2563eb]">Actual</span>
                      <span className="font-mono tabular-nums">
                        {formatNumber(pt.actual)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-[#f59e0b]">Predicted</span>
                      <span className="font-mono tabular-nums">
                        {formatNumber(pt.predicted)}
                      </span>
                    </div>
                    <div className="mt-1 pt-1 border-t flex justify-between gap-4">
                      <span className="text-[#ef4444]">MAPE</span>
                      <span className="font-mono tabular-nums font-medium">
                        {pt.mape.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              content={() => (
                <div className="flex flex-wrap justify-center gap-4 text-xs mt-2">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-5 h-0.5 bg-[#2563eb]" />{" "}
                    Actual
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-5 h-0.5 bg-[#f59e0b]" />{" "}
                    Predicted
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 bg-[#ef4444] opacity-40 rounded-sm" />{" "}
                    MAPE %
                  </span>
                </div>
              )}
            />
            <Bar
              yAxisId="mape"
              dataKey="mape"
              fill="#ef4444"
              fillOpacity={0.2}
              stroke="#ef4444"
              strokeOpacity={0.4}
              barSize={14}
              name="MAPE %"
            />
            <Line
              yAxisId="units"
              type="monotone"
              dataKey="actual"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#2563eb" }}
              name="Actual"
            />
            <Line
              yAxisId="units"
              type="monotone"
              dataKey="predicted"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#f59e0b" }}
              name="Predicted"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
