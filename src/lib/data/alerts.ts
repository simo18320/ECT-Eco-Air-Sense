import { createClient } from "@/lib/supabase/server";

export type YachtHealthSummary = {
  sensorsOnline: number;
  sensorsOffline: number;
  activeAlerts: number;
  criticalAlerts: number;
  monitoringCoveragePct: number | null;
  dataQualityPct: number | null;
};

const FRESHNESS_WINDOW_MS = 48 * 60 * 60 * 1000;

export async function getYachtHealthSummary(yachtId: string): Promise<YachtHealthSummary> {
  const supabase = await createClient();

  const [{ data: points }, { data: openAlerts }, { data: lastJob }] = await Promise.all([
    supabase.from("monitoring_points").select("id").eq("yacht_id", yachtId).eq("active", true),
    supabase.from("alerts").select("severity").eq("yacht_id", yachtId).eq("status", "open"),
    supabase
      .from("import_jobs")
      .select("records_imported, records_rejected")
      .eq("yacht_id", yachtId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const activePointIds = (points ?? []).map((p) => p.id);
  let sensorsOnline = 0;

  if (activePointIds.length > 0) {
    const since = new Date(Date.now() - FRESHNESS_WINDOW_MS).toISOString();
    // Checked per point (limit 1, existence only) rather than one unordered
    // batch across every point — a point with disproportionately more
    // readings in the freshness window can (and did, on real data) fill the
    // entire batch by itself, crowding out points that also have recent
    // data and making them wrongly count as offline.
    const results = await Promise.all(
      activePointIds.map(async (pointId) => {
        const { data } = await supabase
          .from("measurements")
          .select("monitoring_point_id")
          .eq("monitoring_point_id", pointId)
          .gte("timestamp", since)
          .limit(1);
        return data != null && data.length > 0;
      }),
    );
    sensorsOnline = results.filter(Boolean).length;
  }

  const sensorsOffline = activePointIds.length - sensorsOnline;
  const monitoringCoveragePct =
    activePointIds.length > 0 ? Math.round((sensorsOnline / activePointIds.length) * 100) : null;

  const dataQualityPct = lastJob
    ? (() => {
        const total = lastJob.records_imported + lastJob.records_rejected;
        return total > 0 ? Math.round((lastJob.records_imported / total) * 100) : null;
      })()
    : null;

  return {
    sensorsOnline,
    sensorsOffline,
    activeAlerts: (openAlerts ?? []).length,
    criticalAlerts: (openAlerts ?? []).filter((a) => a.severity === "critical").length,
    monitoringCoveragePct,
    dataQualityPct,
  };
}

export async function getOpenAlerts(yachtId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("alerts")
    .select("*, monitoring_points(name, code, room_location)")
    .eq("yacht_id", yachtId)
    .eq("status", "open")
    // alert_severity enum is declared info < warning < critical, so descending surfaces critical first.
    .order("severity", { ascending: false })
    .order("last_detected_at", { ascending: false });

  return data ?? [];
}
