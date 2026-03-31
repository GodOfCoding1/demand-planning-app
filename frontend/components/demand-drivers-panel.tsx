"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchDemandDrivers } from "@/lib/api-client";
import type { DemandDriversResponse } from "@/lib/types";
import { formatWeek, formatSkuName } from "@/lib/format";

interface DemandDriversPanelProps {
  itemId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DriverPoint {
  timestamp: string;
  hist_price?: number;
  proj_price?: number;
  hist_instock?: number;
  proj_instock?: number;
}

export function DemandDriversPanel({
  itemId,
  open,
  onOpenChange,
}: DemandDriversPanelProps) {
  const [data, setData] = useState<DriverPoint[]>([]);
  const [boundary, setBoundary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetchDemandDrivers(itemId)
      .then((res: DemandDriversResponse) => {
        const points: DriverPoint[] = [];
        for (const h of res.historical) {
          points.push({
            timestamp: h.timestamp,
            hist_price: h.avg_unit_price ?? undefined,
            hist_instock: h.cust_instock ?? undefined,
          });
        }
        const lastHist = res.historical[res.historical.length - 1]?.timestamp ?? "";
        setBoundary(lastHist);
        for (const p of res.projected) {
          points.push({
            timestamp: p.timestamp,
            proj_price: p.avg_unit_price ?? undefined,
            proj_instock: p.cust_instock ?? undefined,
          });
        }
        setData(points);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, itemId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Demand Drivers</SheetTitle>
          <p className="text-sm text-muted-foreground">{formatSkuName(itemId)}</p>
        </SheetHeader>

        <div className="mt-6 space-y-8">
          {loading ? (
            <>
              <Skeleton className="h-52 w-full" />
              <Skeleton className="h-52 w-full" />
            </>
          ) : error ? (
            <p className="text-sm text-destructive">Failed to load: {error}</p>
          ) : (
            <>
              <DriverChart
                title="Average Unit Price"
                data={data}
                histKey="hist_price"
                projKey="proj_price"
                boundary={boundary}
                format={(v) => `$${v.toFixed(2)}`}
                color="#7c3aed"
              />
              <DriverChart
                title="Customer In-Stock Rate"
                data={data}
                histKey="hist_instock"
                projKey="proj_instock"
                boundary={boundary}
                format={(v) => `${(v * 100).toFixed(1)}%`}
                color="#0891b2"
                domain={[0, 1]}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DriverChart({
  title,
  data,
  histKey,
  projKey,
  boundary,
  format,
  color,
  domain,
}: {
  title: string;
  data: DriverPoint[];
  histKey: string;
  projKey: string;
  boundary: string;
  format: (v: number) => string;
  color: string;
  domain?: [number, number];
}) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatWeek}
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={format}
            tick={{ fontSize: 10 }}
            width={52}
            domain={domain}
          />
          <Tooltip
            labelFormatter={(v) => `Week of ${v}`}
            formatter={(value, name) => [
              format(Number(value)),
              String(name).includes("hist") ? "Historical" : "Projected",
            ]}
          />
          <Legend
            formatter={(value) =>
              value.includes("hist") ? "Historical" : "Projected"
            }
          />
          {boundary && (
            <ReferenceLine x={boundary} stroke="#94a3b8" strokeDasharray="4 4" />
          )}
          <Line
            type="monotone"
            dataKey={histKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey={projKey}
            stroke={color}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
