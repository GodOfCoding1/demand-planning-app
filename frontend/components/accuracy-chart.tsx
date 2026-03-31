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
import { fetchAccuracyOverview } from "@/lib/api-client";
import type { AccuracyOverviewResponse } from "@/lib/types";
import { formatWeek, formatNumber } from "@/lib/format";

type Tab = "weekly" | "by_run";

export function AccuracyChart() {
  const [data, setData] = useState<AccuracyOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("weekly");

  useEffect(() => {
    fetchAccuracyOverview()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Model Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Model Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Failed to load accuracy data{error ? `: ${error}` : ""}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (data.weekly.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Model Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">
            No overlapping forecast-vs-actual data available.
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
            <CardTitle>Model Accuracy</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              How accurate were past forecasts? Comparing predictions from the earliest
              forecast run (Jan 5) against actual sales across all {data.total_weeks} weeks
              where both exist, summed across all SKUs
            </p>
          </div>

          {/* Summary badges */}
          <div className="flex gap-3 flex-shrink-0">
            <InfoBadge
              label="MAPE"
              value={`${data.overall_mape.toFixed(1)}%`}
              tooltip="Mean Absolute Percentage Error — average weekly % difference between predicted and actual demand. Lower is better. Under 10% is excellent, 10–20% is good."
            />
            <InfoBadge
              label="WMAPE"
              value={`${data.overall_wmape.toFixed(1)}%`}
              tooltip="Weighted MAPE — same as MAPE but weighted by volume, so high-demand weeks count more. More reliable when demand varies a lot week to week."
            />
            <InfoBadge
              label="Weeks"
              value={`${data.total_weeks}`}
              tooltip="Number of weeks where both a forecast prediction and actual sales data exist, used to compute the accuracy metrics."
            />
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex gap-1 mt-3 bg-muted rounded-lg p-0.5 w-fit">
          <button
            onClick={() => setTab("weekly")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              tab === "weekly"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Weekly: Predicted vs Actual
          </button>
          <button
            onClick={() => setTab("by_run")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              tab === "by_run"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Accuracy per Forecast Run
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {tab === "weekly" ? (
          <WeeklyChart weekly={data.weekly} />
        ) : (
          <ByRunChart byRun={data.by_run} />
        )}
      </CardContent>
    </Card>
  );
}

function WeeklyChart({
  weekly,
}: {
  weekly: AccuracyOverviewResponse["weekly"];
}) {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <ComposedChart
        data={weekly}
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
          width={56}
        />
        <YAxis
          yAxisId="mape"
          orientation="right"
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 11 }}
          width={48}
          domain={[0, "auto"]}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const pt = weekly.find((w) => w.timestamp === label);
            if (!pt) return null;
            return (
              <div className="rounded-md border bg-background px-3 py-2 shadow-md text-sm">
                <p className="font-medium mb-1">Week of {label}</p>
                <div className="flex justify-between gap-4">
                  <span className="text-[#2563eb]">Actual</span>
                  <span className="font-mono tabular-nums">
                    {formatNumber(pt.total_actual)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#f59e0b]">Predicted</span>
                  <span className="font-mono tabular-nums">
                    {formatNumber(pt.total_predicted)}
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
                Actual Demand
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-5 h-0.5 bg-[#f59e0b]" />{" "}
                Predicted Demand
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
          barSize={16}
          name="MAPE %"
        />
        <Line
          yAxisId="units"
          type="monotone"
          dataKey="total_actual"
          stroke="#2563eb"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#2563eb" }}
          name="Actual"
        />
        <Line
          yAxisId="units"
          type="monotone"
          dataKey="total_predicted"
          stroke="#f59e0b"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#f59e0b" }}
          name="Predicted"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function ByRunChart({
  byRun,
}: {
  byRun: AccuracyOverviewResponse["by_run"];
}) {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <ComposedChart
        data={byRun}
        margin={{ top: 4, right: 12, bottom: 4, left: 12 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="inference_date"
          tickFormatter={formatWeek}
          tick={{ fontSize: 11 }}
          interval={0}
          angle={-35}
          textAnchor="end"
          height={50}
        />
        <YAxis
          yAxisId="mape"
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 11 }}
          width={48}
        />
        <YAxis
          yAxisId="weeks"
          orientation="right"
          tick={{ fontSize: 11 }}
          width={40}
          label={{
            value: "Overlap wks",
            angle: 90,
            position: "insideRight",
            fontSize: 10,
            fill: "#94a3b8",
          }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const pt = payload[0]?.payload;
            if (!pt) return null;
            return (
              <div className="rounded-md border bg-background px-3 py-2 shadow-md text-sm">
                <p className="font-medium mb-1">
                  Inference: {pt.inference_date}
                </p>
                <div className="space-y-0.5">
                  <div className="flex justify-between gap-4">
                    <span>MAPE</span>
                    <span className="font-mono tabular-nums font-medium">
                      {pt.mape.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>WMAPE</span>
                    <span className="font-mono tabular-nums">
                      {pt.wmape.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Bias</span>
                    <span className="font-mono tabular-nums">
                      {pt.bias_pct > 0 ? "+" : ""}
                      {pt.bias_pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 text-muted-foreground">
                    <span>Overlap weeks</span>
                    <span className="font-mono tabular-nums">
                      {pt.overlap_weeks}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 text-muted-foreground">
                    <span>Items</span>
                    <span className="font-mono tabular-nums">
                      {pt.num_items}
                    </span>
                  </div>
                </div>
              </div>
            );
          }}
        />
        <Legend
          content={() => (
            <div className="flex flex-wrap justify-center gap-4 text-xs mt-2">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 bg-[#8b5cf6] opacity-60 rounded-sm" />{" "}
                MAPE %
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-5 h-0.5 bg-[#0d9488]" />{" "}
                Overlap Weeks
              </span>
            </div>
          )}
        />
        <Bar
          yAxisId="mape"
          dataKey="mape"
          fill="#8b5cf6"
          fillOpacity={0.5}
          stroke="#8b5cf6"
          barSize={20}
          name="MAPE"
        />
        <Line
          yAxisId="weeks"
          type="monotone"
          dataKey="overlap_weeks"
          stroke="#0d9488"
          strokeWidth={2}
          dot={{ r: 3, fill: "#0d9488" }}
          name="Overlap Weeks"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
