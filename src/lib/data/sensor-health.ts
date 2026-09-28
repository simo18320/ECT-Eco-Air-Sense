import { createClient } from "@/lib/supabase/server";

export type SensorHealthStatus = "healthy" | "stale" | "offline";

export type PointHealth = {
  pointId: string;
  pointName: string;
  code: string | null;
  lastReadingAt: string | null;
  status: SensorHealthStatus;
};

/** One missed daily 6am sync cycle, plus buffer, before we call a point "stale" rather than healthy. */
const STALE_AFTER_HOURS = 30;
const OFFLINE_AFTER_HOURS = 24 * 7;

/**
 * Per-point "is this sensor actually reporting" status, computed on read from
 * raw measurements (no persisted table, same trade-off as baselines). Only
 * covers active points — inactive/maintenance points are expected to be quiet.
 */
export async function getSensorHealth(yachtId: string): Promise<PointHealth[]> {
  const supabase = await createClient();

  const { data: points } = await supabase
    .from("monitoring_points")
    .select("id, name, code")
    .eq("yacht_id", yachtId)
    .eq("status", "active");

  const activePoints = points ?? [];
  if (activePoints.length === 0) return [];

  // The newest reading of each point, asked for point by point. One combined
  // "newest N rows" query is capped at 1000 rows by the API — about the last
  // hour or two — so a sensor that was quiet for longer would look offline
  // even though the stale/offline limits here are 30 hours and 7 days.
  const lastReadingByPoint = new Map<string, string>();
  await Promise.all(
    activePoints.map(async (p) => {
      const { data } = await supabase
        .from("measurements")
        .select("timestamp")
        .eq("monitoring_point_id", p.id)
        .order("timestamp", { ascending: false })
        .limit(1);
      if (data && data.length > 0) lastReadingByPoint.set(p.id, data[0].timestamp);
    }),
  );

  const now = Date.now();
  return activePoints.map((p) => {
    const lastReadingAt = lastReadingByPoint.get(p.id) ?? null;
    let status: SensorHealthStatus;
    if (!lastReadingAt) {
      status = "offline";
    } else {
      const hoursSince = (now - new Date(lastReadingAt).getTime()) / (60 * 60 * 1000);
      status = hoursSince > OFFLINE_AFTER_HOURS ? "offline" : hoursSince > STALE_AFTER_HOURS ? "stale" : "healthy";
    }
    return { pointId: p.id, pointName: p.name, code: p.code, lastReadingAt, status };
  });
}
