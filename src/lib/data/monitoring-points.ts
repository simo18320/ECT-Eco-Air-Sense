import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/paginate";

export async function getMonitoringPoints(yachtId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("monitoring_points")
    .select("*, sensors(*)")
    .eq("yacht_id", yachtId)
    .order("code", { ascending: true });

  return data ?? [];
}

export type LatestReading = {
  monitoring_point_id: string;
  parameter: string;
  value: number;
  unit: string | null;
  timestamp: string;
};

/**
 * Latest reading per (monitoring_point, parameter) for a yacht.
 * Pulls recent rows and reduces client-side rather than a DISTINCT ON RPC,
 * since Phase 2 data volumes are small; revisit if this gets slow.
 */
export async function getLatestReadingsByYacht(yachtId: string): Promise<LatestReading[]> {
  const supabase = await createClient();
  const { data: points } = await supabase
    .from("monitoring_points")
    .select("id")
    .eq("yacht_id", yachtId);

  const pointIds = (points ?? []).map((p) => p.id);
  if (pointIds.length === 0) return [];

  // Newest rows first, read in pages: a single request never returns more than 1000 rows.
  const rows = await fetchAllRows(
    (from, to) =>
      supabase
        .from("measurements")
        .select("monitoring_point_id, parameter, value, unit, timestamp")
        .in("monitoring_point_id", pointIds)
        .order("timestamp", { ascending: false })
        .order("monitoring_point_id", { ascending: true })
        .order("parameter", { ascending: true })
        .range(from, to),
    2000,
  );

  const latest = new Map<string, LatestReading>();
  for (const row of rows) {
    const key = `${row.monitoring_point_id}:${row.parameter}`;
    if (!latest.has(key)) latest.set(key, row);
  }
  return Array.from(latest.values());
}
