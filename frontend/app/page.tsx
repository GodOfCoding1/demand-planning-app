"use client";

import { useEffect, useState } from "react";
import { AggregateChart } from "@/components/aggregate-chart";
import { AccuracyChart } from "@/components/accuracy-chart";
import { KpiStrip } from "@/components/kpi-strip";
import { AlertList } from "@/components/alert-list";
import { fetchItems, fetchAlerts, fetchInferenceDates } from "@/lib/api-client";

export default function HomePage() {
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpis, setKpis] = useState<
    { label: string; value: string | number; sub?: string }[]
  >([]);

  useEffect(() => {
    async function loadKpis() {
      try {
        const [items, alerts, dates] = await Promise.all([
          fetchItems(),
          fetchAlerts(20, 200),
          fetchInferenceDates(),
        ]);
        const latestDate = dates[dates.length - 1] ?? "N/A";
        setKpis([
          { label: "Total SKUs", value: items.length },
          {
            label: "With Forecast",
            value: items.filter((i) => i.has_forecast).length,
          },
          { label: "Alerts", value: alerts.length, sub: "MAPE > 20%" },
          { label: "Latest Inference", value: latestDate },
        ]);
      } catch {
        setKpis([]);
      } finally {
        setKpiLoading(false);
      }
    }
    loadKpis();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-8">
      <KpiStrip items={kpis} loading={kpiLoading} />
      <AggregateChart />
      <AccuracyChart />
      <AlertList />
    </div>
  );
}
