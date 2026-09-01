"use client";

import { useTransition } from "react";
import Link from "next/link";
import { RefreshCw, ShieldCheck, TriangleAlert, OctagonAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { reEvaluateAlerts, acknowledgeAlert } from "@/lib/actions/alerts";
import { parameterMeta } from "@/lib/parameters";
import type { Tables } from "@/types/database";

type Alert = Tables<"alerts"> & {
  monitoring_points: { name: string; code: string | null; room_location: string | null } | null;
};

function durationLabel(firstDetectedAt: string) {
  const ms = Date.now() - new Date(firstDetectedAt).getTime();
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function AlertsPanel({ yachtId, alerts, canManage }: { yachtId: string; alerts: Alert[]; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Active Alerts</CardTitle>
          <CardDescription>
            Sustained threshold breaches — a reading must exceed its threshold continuously for the
            configured persistence window before it appears here.
          </CardDescription>
        </div>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(() => {
                void reEvaluateAlerts(yachtId);
              })
            }
          >
            <RefreshCw className={isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            Re-evaluate
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <ShieldCheck className="h-8 w-8 text-status-good" />
            <p className="text-sm text-muted-foreground">No active alerts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const meta = parameterMeta(alert.parameter);
              const isCritical = alert.severity === "critical";
              return (
                <div
                  key={alert.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-border p-3"
                >
                  <div className="flex items-start gap-3">
                    {isCritical ? (
                      <OctagonAlert className="h-4 w-4 text-status-critical mt-0.5 shrink-0" />
                    ) : (
                      <TriangleAlert className="h-4 w-4 text-status-warning mt-0.5 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/live/${alert.monitoring_point_id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {alert.monitoring_points?.name ?? "Unknown point"}
                        </Link>
                        <Badge variant={isCritical ? "destructive" : "outline"} className="text-xs">
                          {isCritical ? "Critical" : "Warning"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {meta.label} at {alert.current_value?.toFixed(meta.decimals)} {meta.unit} — sustained for{" "}
                        {durationLabel(alert.first_detected_at)}
                      </p>
                      {alert.recommended_action && (
                        <p className="text-xs text-muted-foreground mt-1">{alert.recommended_action}</p>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 shrink-0"
                      disabled={isPending}
                      onClick={() => startTransition(() => acknowledgeAlert(alert.id))}
                    >
                      Acknowledge
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
