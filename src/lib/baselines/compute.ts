import { createClient } from "@/lib/supabase/server";
import { PARAMETER_META, percentile } from "@/lib/parameters";

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
  const knownParameters = Object.keys(PARAMETER_META);

  // Fetched per (point, parameter) — ordered and individually capped —
  // rather than one unordered batch across every point/parameter combined.
  // A single `.limit()` over the combined set can (and did, on real data)
  // return a slice dominated by a couple of parameters, leaving other
  // point/parameter pairs with zero rows and silently no baseline.
  await Promise.all(
    pointIds.flatMap((pointId) =>
      knownParameters.map(async (parameter) => {
        const { data } = await supabase
          .from("measurements")
          .select("value, timestamp")
          .eq("monitoring_point_id", pointId)
          .eq("parameter", parameter)
          .gte("timestamp", since)
          .order("timestamp", { ascending: true })
          .limit(5000);
        if (!data || data.length === 0) return;

        const values = data.map((r) => r.value);
        const dayValues = data.filter((r) => !isNightHour(r.timestamp)).map((r) => r.value);
        const nightValues = data.filter((r) => isNightHour(r.timestamp)).map((r) => r.value);
        result.set(`${pointId}:${parameter}`, {
          overallRange: rangeFromValues(values),
          dayRange: rangeFromValues(dayValues),
          nightRange: rangeFromValues(nightValues),
          sampleSize: data.length,
          insufficientData: data.length < MIN_BASELINE_SAMPLE_SIZE,
        });
      }),
    ),
  );

  return result;
}
