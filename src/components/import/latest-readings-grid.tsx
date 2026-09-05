import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LatestReading } from "@/lib/data/monitoring-points";
import type { PointBaseline } from "@/lib/baselines/compute";
import type { Tables } from "@/types/database";

const PARAM_ORDER = ["temperature", "relative_humidity", "co2", "tvoc", "pm2_5", "pm10"];
const PARAM_LABELS: Record<string, string> = {
  temperature: "Temp",
  relative_humidity: "RH",
  co2: "CO2",
  tvoc: "TVOC",
  pm2_5: "PM2.5",
  pm10: "PM10",
};

function formatValue(parameter: string, value: number) {
  const decimals = parameter === "co2" || parameter === "tvoc" || parameter.startsWith("pm") ? 0 : 1;
  return value.toFixed(decimals);
}

export function LatestReadingsGrid({
  points,
  readings,
  baselines,
}: {
  points: Tables<"monitoring_points">[];
  readings: LatestReading[];
  baselines?: Map<string, PointBaseline>;
}) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No monitoring points yet — import an AirCare export to detect them automatically.
      </p>
    );
  }

  const byPoint = new Map<string, LatestReading[]>();
  for (const r of readings) {
    const list = byPoint.get(r.monitoring_point_id) ?? [];
    list.push(r);
    byPoint.set(r.monitoring_point_id, list);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {points.map((point) => {
        const pointReadings = byPoint.get(point.id) ?? [];
        const mostRecent = pointReadings.reduce<string | null>(
          (latest, r) => (!latest || r.timestamp > latest ? r.timestamp : latest),
          null,
        );
        const sorted = [...pointReadings].sort(
          (a, b) => PARAM_ORDER.indexOf(a.parameter) - PARAM_ORDER.indexOf(b.parameter),
        );

        return (
          <Link key={point.id} href={`/live/${point.id}`}>
          <Card className="transition-colors hover:border-primary/40 cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{point.name}</span>
                {point.code && point.code !== point.name && (
                  <span className="text-xs font-normal text-muted-foreground">{point.code}</span>
                )}
              </CardTitle>
              {point.room_location && (
                <p className="text-xs text-muted-foreground">{point.room_location}</p>
              )}
            </CardHeader>
            <CardContent>
              {sorted.length === 0 ? (
                <p className="text-xs text-muted-foreground">No readings yet</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {sorted.map((r) => {
                      const baseline = baselines?.get(`${point.id}:${r.parameter}`);
                      const range = baseline?.overallRange ?? null;
                      const outsideBaseline = range != null && (r.value < range[0] || r.value > range[1]);
                      return (
                        <div key={r.parameter} className="text-center">
                          <div className="text-xs text-muted-foreground">
                            {PARAM_LABELS[r.parameter] ?? r.parameter}
                          </div>
                          <div
                            className={`text-sm font-semibold tabular-nums ${outsideBaseline ? "text-status-warning" : ""}`}
                          >
                            {formatValue(r.parameter, r.value)}
                            <span className="text-xs font-normal text-muted-foreground ml-0.5">
                              {r.unit}
                            </span>
                          </div>
                          {range && (
                            <div className="text-[10px] text-muted-foreground">
                              Normal {formatValue(r.parameter, range[0])}–{formatValue(r.parameter, range[1])}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {mostRecent && (
                    <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border">
                      Last updated{" "}
                      {new Date(mostRecent).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "UTC",
                      })}{" "}
                      UTC
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          </Link>
        );
      })}
    </div>
  );
}
