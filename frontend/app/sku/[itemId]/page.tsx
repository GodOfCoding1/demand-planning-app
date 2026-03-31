"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ForecastChart } from "@/components/forecast-chart";
import { ItemAccuracyChart } from "@/components/item-accuracy-chart";
import { DemandDriversPanel } from "@/components/demand-drivers-panel";
import {
  fetchActuals,
  fetchForecast,
  fetchPreviousYearActuals,
} from "@/lib/api-client";
import type {
  ActualRecord,
  ForecastRecord,
  PreviousYearActualRecord,
} from "@/lib/types";
import { formatSkuName } from "@/lib/format";

export default function SkuDetailPage() {
  const params = useParams<{ itemId: string }>();
  const itemId = decodeURIComponent(params.itemId);

  const [actuals, setActuals] = useState<ActualRecord[]>([]);
  const [forecast, setForecast] = useState<ForecastRecord[]>([]);
  const [prevYear, setPrevYear] = useState<PreviousYearActualRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driversOpen, setDriversOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);

    async function load() {
      const [a, f, py] = await Promise.all([
        fetchActuals(itemId, 13),
        fetchForecast(itemId),
        fetchPreviousYearActuals(itemId),
      ]);
      setActuals(a);
      setForecast(f);
      setPrevYear(py);
    }

    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [itemId]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{formatSkuName(itemId)}</span>
      </nav>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{formatSkuName(itemId)}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDriversOpen(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
            />
          </svg>
          Demand Drivers
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            Failed to load data for this SKU. The item may not exist or the server may be unavailable.
          </p>
        </div>
      )}

      {/* Main chart */}
      <ForecastChart
        actuals={actuals}
        forecast={forecast}
        prevYear={prevYear}
        loading={loading}
      />

      {/* Accuracy analysis */}
      <ItemAccuracyChart itemId={itemId} />

      {/* Drivers side panel */}
      <DemandDriversPanel
        itemId={itemId}
        open={driversOpen}
        onOpenChange={setDriversOpen}
      />
    </div>
  );
}
