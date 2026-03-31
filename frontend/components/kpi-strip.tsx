"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface KpiItem {
  label: string;
  value: string | number;
  sub?: string;
}

interface KpiStripProps {
  items: KpiItem[];
  loading?: boolean;
}

export function KpiStrip({ items, loading }: KpiStripProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map((kpi) => (
        <Card key={kpi.label}>
          <CardContent className="py-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {kpi.label}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{kpi.value}</p>
            {kpi.sub && (
              <p className="mt-0.5 text-xs text-muted-foreground">{kpi.sub}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
