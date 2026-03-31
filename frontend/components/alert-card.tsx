"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AlertItem } from "@/lib/types";
import { formatSkuName } from "@/lib/format";

interface AlertCardProps {
  alert: AlertItem;
}

export function AlertCard({ alert }: AlertCardProps) {
  const isOver = alert.direction === "over-forecast";
  const severity = alert.mape >= 50 ? "destructive" : "secondary";

  return (
    <Link href={`/sku/${encodeURIComponent(alert.item_id)}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="py-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium truncate">
              {formatSkuName(alert.item_id)}
            </span>
            <Badge variant={severity} className="shrink-0 text-xs">
              {alert.mape.toFixed(1)}% MAPE
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs ${
                isOver
                  ? "border-amber-400 text-amber-600"
                  : "border-blue-400 text-blue-600"
              }`}
            >
              {isOver ? "Over Forecast" : "Under Forecast"}
            </Badge>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground pt-1">
            <span>Actual: {alert.recent_actual.toLocaleString()}</span>
            <span>Forecast: {alert.recent_forecast.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
