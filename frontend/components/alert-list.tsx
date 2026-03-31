"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCard } from "@/components/alert-card";
import { fetchAlerts } from "@/lib/api-client";
import type { AlertItem } from "@/lib/types";

export function AlertList() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts(20, 50)
      .then(setAlerts)
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold">Items Needing Attention</h2>
        {!loading && (
          <Badge variant="secondary">{alerts.length}</Badge>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No forecast accuracy alerts at this time.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {alerts.map((a) => (
            <AlertCard key={a.item_id} alert={a} />
          ))}
        </div>
      )}
    </section>
  );
}
