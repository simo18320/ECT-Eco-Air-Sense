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

  const pointIds = activePoints.map((p) => p.id);
  // Most-recent-first, deduped to one row per point below. Same "top N rows,
  // not a true per-point latest" trade-off as getLatestReadingsByYacht — fine
  // at current data volumes, revisit with a DISTINCT ON/RPC if it stops being.
  const { data: measurements } = await supabase
    .from("measurements")
    .select("monitoring_point_id, timestamp")
    .in("monitoring_point_id", pointIds)
    .order("timestamp", { ascending: false })
    .limit(5000);

  const lastReadingByPoint = new Map<string, string>();
  for (const m of measurements ?? []) {
    if (!lastReadingByPoint.has(m.monitoring_point_id)) {
      lastReadingByPoint.set(m.monitoring_point_id, m.timestamp);
    }
  }

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
