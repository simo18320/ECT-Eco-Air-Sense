import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Alert engine (§21-22): persistence-based, not immediate-threshold-crossing.
 * A breach only becomes an alert once the same severity has held continuously
 * across the trailing `persistence_minutes` window — this is what prevents a
 * single noisy reading from generating alert fatigue.
 */

type Threshold = {
  id: string;
  parameter: string;
  preferred_min: number | null;
  preferred_max: number | null;
  warning_threshold: number | null;
  critical_threshold: number | null;
  persistence_minutes: number;
};

const RECOMMENDED_ACTION: Record<string, string> = {
  temperature: "Check HVAC setpoints and airflow balance in this area.",
  relative_humidity: "Inspect ventilation, dehumidification and potential moisture sources.",
  co2: "Investigate ventilation rate and occupancy load in this area.",
  tvoc: "Investigate ventilation and potential VOC sources (cleaning products, materials, furnishings).",
  pm2_5: "Check air filtration and potential particulate sources (cooking, HVAC filters, external air intake).",
  pm10: "Check air filtration and potential particulate sources (cooking, HVAC filters, external air intake).",
};

function severityForValue(
  value: number,
  t: Threshold,
): "critical" | "warning" | null {
  if (t.critical_threshold != null && value > t.critical_threshold) return "critical";
  if (t.warning_threshold != null && value > t.warning_threshold) return "warning";

  if (t.preferred_min != null) {
    if (
      t.preferred_max != null &&
      t.critical_threshold != null &&
      value < t.preferred_min - (t.critical_threshold - t.preferred_max)
    ) {
      return "critical";
    }
    if (value < t.preferred_min) return "warning";
  }

  return null;
}

/** Trailing run of same-or-higher severity, walking back from the most recent reading. */
function findPersistentStreak(
  readings: { timestamp: string; value: number }[],
  t: Threshold,
): { severity: "critical" | "warning"; firstDetectedAt: string; lastDetectedAt: string; currentValue: number } | null {
  if (readings.length === 0) return null;
  const latest = readings[readings.length - 1];
  const latestSeverity = severityForValue(latest.value, t);
  if (!latestSeverity) return null;

  let streakStart = latest.timestamp;
  for (let i = readings.length - 1; i >= 0; i--) {
    const sev = severityForValue(readings[i].value, t);
    const holds = sev === "critical" || (latestSeverity === "warning" && sev === "warning");
    if (!holds) break;
    streakStart = readings[i].timestamp;
  }

  const durationMs = new Date(latest.timestamp).getTime() - new Date(streakStart).getTime();
  if (durationMs < t.persistence_minutes * 60_000) return null;

  return {
    severity: latestSeverity,
    firstDetectedAt: streakStart,
    lastDetectedAt: latest.timestamp,
    currentValue: latest.value,
  };
}

export async function evaluateAlertsForYacht(
  supabase: SupabaseClient<Database>,
  yachtId: string,
): Promise<{ opened: number; updated: number; resolved: number }> {
  const [{ data: points }, { data: yachtThresholds }, { data: companyThresholds }] = await Promise.all([
    supabase.from("monitoring_points").select("id").eq("yacht_id", yachtId).eq("active", true),
    supabase.from("thresholds").select("*").eq("yacht_id", yachtId),
    supabase
      .from("yachts")
      .select("company_id")
      .eq("id", yachtId)
      .single()
      .then(async ({ data }) =>
        data
          ? supabase.from("thresholds").select("*").eq("company_id", data.company_id).is("yacht_id", null)
          : { data: [] as Threshold[] },
      ),
  ]);

  const thresholdByParam = new Map<string, Threshold>();
  for (const t of companyThresholds ?? []) thresholdByParam.set(t.parameter, t);
  for (const t of yachtThresholds ?? []) thresholdByParam.set(t.parameter, t); // yacht-specific wins

  const pointIds = (points ?? []).map((p) => p.id);
  let opened = 0;
  let updated = 0;
  let resolved = 0;

  if (pointIds.length === 0 || thresholdByParam.size === 0) {
    return { opened, updated, resolved };
  }

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  for (const pointId of pointIds) {
    for (const [parameter, threshold] of thresholdByParam) {
      const { data: readings } = await supabase
        .from("measurements")
        .select("timestamp, value")
        .eq("monitoring_point_id", pointId)
        .eq("parameter", parameter)
        .gte("timestamp", since)
        .order("timestamp", { ascending: true })
        .limit(500);

      const streak = findPersistentStreak(readings ?? [], threshold);

      const { data: existingAlert } = await supabase
        .from("alerts")
        .select("id, severity, first_detected_at")
        .eq("monitoring_point_id", pointId)
        .eq("parameter", parameter)
        .eq("status", "open")
        .maybeSingle();

      if (!streak) {
        if (existingAlert) {
          await supabase
            .from("alerts")
            .update({ status: "resolved", last_detected_at: new Date().toISOString() })
            .eq("id", existingAlert.id);
          resolved++;
        }
        continue;
      }

      if (existingAlert) {
        await supabase
          .from("alerts")
          .update({
            severity: streak.severity,
            current_value: streak.currentValue,
            last_detected_at: streak.lastDetectedAt,
          })
          .eq("id", existingAlert.id);
        updated++;
      } else {
        await supabase.from("alerts").insert({
          yacht_id: yachtId,
          monitoring_point_id: pointId,
          parameter,
          severity: streak.severity,
          current_value: streak.currentValue,
          threshold_id: threshold.id,
          first_detected_at: streak.firstDetectedAt,
          last_detected_at: streak.lastDetectedAt,
          status: "open",
          recommended_action: RECOMMENDED_ACTION[parameter] ?? "Investigate the cause of this sustained deviation.",
        });
        opened++;
      }
    }
  }

  return { opened, updated, resolved };
}
