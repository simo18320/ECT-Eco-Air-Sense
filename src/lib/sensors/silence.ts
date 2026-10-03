import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** Sensors report about every 5 minutes, so this long without a reading is an outage, not a quiet spell. */
export const SILENT_AFTER_HOURS = 6;

const HOUR_MS = 60 * 60 * 1000;

export type SensorSilence = {
  pointId: string;
  pointName: string;
  code: string | null;
  lastReadingAt: string;
  silentHours: number;
  isSilent: boolean;
  notifiedAt: string | null;
};

export type SilenceSummary = {
  asOf: string;
  total: number;
  silent: SensorSilence[];
};

/** When the live AirCare feed was last pulled successfully. */
export async function getLastFeedSync(supabase: SupabaseClient<Database>, yachtId: string): Promise<Date | null> {
  const { data } = await supabase
    .from("import_jobs")
    .select("created_at")
    .eq("yacht_id", yachtId)
    .eq("file_type", "aircare_api")
    .in("status", ["completed", "completed_with_errors"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? new Date(data.created_at) : null;
}

/**
 * How long each active point had been without a reading as of `asOf`. Points
 * that never reported are left out: that is a setup state, not an outage.
 */
export async function inspectSensors(
  supabase: SupabaseClient<Database>,
  yachtId: string,
  asOf: Date,
): Promise<SensorSilence[]> {
  const { data: points } = await supabase
    .from("monitoring_points")
    .select("id, name, code, silence_notified_at")
    .eq("yacht_id", yachtId)
    .eq("active", true)
    .eq("status", "active");

  const sensors = await Promise.all(
    (points ?? []).map(async (p): Promise<SensorSilence | null> => {
      const { data } = await supabase
        .from("measurements")
        .select("timestamp")
        .eq("monitoring_point_id", p.id)
        .order("timestamp", { ascending: false })
        .limit(1);
      if (!data || data.length === 0) return null;

      const silentHours = Math.max(0, (asOf.getTime() - Date.parse(data[0].timestamp)) / HOUR_MS);
      return {
        pointId: p.id,
        pointName: p.name,
        code: p.code,
        lastReadingAt: data[0].timestamp,
        silentHours: Math.round(silentHours * 10) / 10,
        isSilent: silentHours > SILENT_AFTER_HOURS,
        notifiedAt: p.silence_notified_at,
      };
    }),
  );
  return sensors.filter((s): s is SensorSilence => s !== null);
}

/**
 * Silence is measured up to the last sync, not up to "now": the feed is only
 * pulled when a sync runs, so a point can look quiet simply because nobody
 * has synced since its last reading.
 */
export async function getSilenceSummary(
  supabase: SupabaseClient<Database>,
  yachtId: string,
): Promise<SilenceSummary | null> {
  const asOf = await getLastFeedSync(supabase, yachtId);
  if (!asOf) return null;

  const sensors = await inspectSensors(supabase, yachtId, asOf);
  const silent = sensors.filter((s) => s.isSilent);
  if (silent.length === 0) return null;

  return { asOf: asOf.toISOString(), total: sensors.length, silent };
}
