import { createClient } from "@/lib/supabase/server";
import { percentile } from "@/lib/parameters";

/** Below this many readings, a p10-p90 range is too noisy to call a baseline. */
export const MIN_BASELINE_SAMPLE_SIZE = 20;

export function rangeFromValues(
  values: number[],
  minSampleSize = MIN_BASELINE_SAMPLE_SIZE,
): [number, number] | null {
  if (values.length < minSampleSize) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return [
    Math.round(percentile(sorted, 10) * 10) / 10,
    Math.round(percentile(sorted, 90) * 10) / 10,
  ];
}

function isNightHour(timestamp: string): boolean {
  const h = new Date(timestamp).getUTCHours();
  return h < 7 || h >= 22;
}

export type PointBaseline = {
  overallRange: [number, number] | null;
  dayRange: [number, number] | null;
  nightRange: [number, number] | null;
  sampleSize: number;
  insufficientData: boolean;
};

/**
 * Per (point, parameter) "normal for this specific location" range, computed
 * on read from raw measurements rather than a persisted/refreshed table —
 * cheap at current data volumes, and avoids a second source of truth that
 * needs its own refresh job. Advisory only: does not feed the alert engine
 * or scoring, which keep using the configured thresholds exactly as before.
 */
export async function computeBaselinesForPoints(
  pointIds: string[],
  days = 30,
): Promise<Map<string, PointBaseline>> {
  const result = new Map<string, PointBaseline>();
  if (pointIds.length === 0) return result;

  const supabase = await createClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("measurements")
    .select("monitoring_point_id, parameter, value, timestamp")
    .in("monitoring_point_id", pointIds)
    .gte("timestamp", since)
    .limit(20000);

  const grouped = new Map<string, { value: number; timestamp: string }[]>();
  for (const row of data ?? []) {
    const key = `${row.monitoring_point_id}:${row.parameter}`;
    (grouped.get(key) ?? grouped.set(key, []).get(key)!).push({
      value: row.value,
      timestamp: row.timestamp,
    });
  }

  for (const [key, readings] of grouped) {
    const values = readings.map((r) => r.value);
    const dayValues = readings.filter((r) => !isNightHour(r.timestamp)).map((r) => r.value);
    const nightValues = readings.filter((r) => isNightHour(r.timestamp)).map((r) => r.value);
    result.set(key, {
      overallRange: rangeFromValues(values),
      dayRange: rangeFromValues(dayValues),
      nightRange: rangeFromValues(nightValues),
      sampleSize: readings.length,
      insufficientData: readings.length < MIN_BASELINE_SAMPLE_SIZE,
    });
  }

  return result;
}
