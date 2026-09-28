import { createClient } from "@/lib/supabase/server";
import { parameterMeta } from "@/lib/parameters";
import { rangeFromValues } from "@/lib/baselines/compute";
import { getYachtScores } from "@/lib/data/scoring";
import { getEffectiveThresholds } from "@/lib/data/thresholds";
import { fetchAllRows } from "@/lib/supabase/paginate";
import { comparePeriods, hourlyAnomalies, robustTrend, thresholdExposure, type Reading } from "./features";
import type {
  YachtDataSummary,
  PointSummary,
  ParameterTrend,
  CrossPointComparison,
  OpenAlertSummary,
  ThresholdInfo,
} from "./types";

const PARAMETERS = ["temperature", "relative_humidity", "co2", "tvoc", "pm2_5", "pm10"];

async function fetchSeries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pointId: string,
  parameter: string,
  fromIso: string,
  toIso: string,
): Promise<Reading[]> {
  return fetchAllRows((from, to) =>
    supabase
      .from("measurements")
      .select("value, timestamp")
      .eq("monitoring_point_id", pointId)
      .eq("parameter", parameter)
      .gte("timestamp", fromIso)
      .lte("timestamp", toIso)
      .order("timestamp", { ascending: true })
      .range(from, to),
  );
}

function dayNightSplit(readings: { timestamp: string; value: number }[]): { dayAvg: number | null; nightAvg: number | null } {
  const day = readings.filter((r) => {
    const h = new Date(r.timestamp).getUTCHours();
    return h >= 7 && h < 22;
  });
  const night = readings.filter((r) => {
    const h = new Date(r.timestamp).getUTCHours();
    return h < 7 || h >= 22;
  });
  if (day.length < 3 || night.length < 3) return { dayAvg: null, nightAvg: null };
  return {
    dayAvg: Math.round((day.reduce((s, r) => s + r.value, 0) / day.length) * 10) / 10,
    nightAvg: Math.round((night.reduce((s, r) => s + r.value, 0) / night.length) * 10) / 10,
  };
}

export async function buildYachtDataSummary(yachtId: string, periodDays = 14): Promise<YachtDataSummary> {
  const supabase = await createClient();

  const { data: yacht } = await supabase.from("yachts").select("name").eq("id", yachtId).single();
  const { data: points } = await supabase
    .from("monitoring_points")
    .select("id, name, room_location")
    .eq("yacht_id", yachtId)
    .eq("active", true);

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);
  // The period before this one — for the period-over-period comparison and as
  // extra history to learn each point's usual hour-of-day pattern from.
  const previousStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const thresholdByParameter = new Map<string, ThresholdInfo>();
  for (const t of await getEffectiveThresholds(yachtId)) {
    thresholdByParameter.set(t.parameter, {
      preferredMin: t.preferred_min,
      preferredMax: t.preferred_max,
      warning: t.warning_threshold,
      critical: t.critical_threshold,
      source: t.source_reference,
    });
  }

  const { data: openAlertsRaw } = await supabase
    .from("alerts")
    .select("parameter, severity, current_value, first_detected_at, monitoring_points(name)")
    .eq("yacht_id", yachtId)
    .eq("status", "open");

  const openAlerts: OpenAlertSummary[] = (openAlertsRaw ?? []).map((a) => {
    const point = Array.isArray(a.monitoring_points) ? a.monitoring_points[0] : a.monitoring_points;
    return {
      pointName: point?.name ?? "Unknown",
      parameter: a.parameter,
      severity: a.severity,
      currentValue: a.current_value,
      durationHours: Math.round((Date.now() - new Date(a.first_detected_at).getTime()) / (60 * 60 * 1000)),
    };
  });

  const pointSummaries: PointSummary[] = [];
  // parameter -> point name -> avg (for cross-point comparison)
  const paramPointAverages: Record<string, { pointName: string; avg: number }[]> = {};

  for (const point of points ?? []) {
    // Fetched per parameter (ordered) rather than one unordered batch for the
    // whole point — a busy point can log tens of thousands of rows, and an
    // unordered `.limit()` can return a slice dominated by one or two
    // parameters, silently starving the AI engine of data for the rest
    // (proven on real data: a point with ~2500 rows/parameter over 14 days
    // returned only 2 of its 6 parameters under the old single-query approach).
    const byParam = new Map<string, { current: Reading[]; previous: Reading[] }>();
    await Promise.all(
      PARAMETERS.map(async (parameter) => {
        const all = await fetchSeries(supabase, point.id, parameter, previousStart.toISOString(), periodEnd.toISOString());
        const startMs = periodStart.getTime();
        const current = all.filter((r) => Date.parse(r.timestamp) >= startMs);
        if (current.length > 0) {
          byParam.set(parameter, { current, previous: all.filter((r) => Date.parse(r.timestamp) < startMs) });
        }
      }),
    );

    const parameters: ParameterTrend[] = [];
    for (const [parameter, { current: readings, previous }] of byParam) {
      const values = readings.map((r) => r.value);
      const avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
      const trend = robustTrend(readings);
      const { dayAvg, nightAvg } = dayNightSplit(readings);
      const pointAlerts = openAlerts.filter((a) => a.pointName === point.name && a.parameter === parameter);
      const thresholds = thresholdByParameter.get(parameter) ?? null;
      const anomalies = hourlyAnomalies(readings, [...previous, ...readings]);

      parameters.push({
        parameter,
        unit: parameterMeta(parameter).unit,
        count: readings.length,
        avg,
        min: Math.round(Math.min(...values) * 10) / 10,
        max: Math.round(Math.max(...values) * 10) / 10,
        trendDirection: trend.direction,
        trendChangePct: trend.changePct,
        trendSignificant: trend.significant,
        trendDaysUsed: trend.daysUsed,
        dayAvg,
        nightAvg,
        baselineRange: rangeFromValues(values),
        thresholds,
        thresholdExposure: thresholds ? thresholdExposure(readings, thresholds) : null,
        previousPeriod: comparePeriods(readings, previous),
        anomalyEpisodeCount: anomalies.episodeCount,
        strongestAnomaly: anomalies.strongest,
        openAlertCount: pointAlerts.length,
        openCriticalAlertCount: pointAlerts.filter((a) => a.severity === "critical").length,
      });

      (paramPointAverages[parameter] ??= []).push({ pointName: point.name, avg });
    }

    if (parameters.length > 0) {
      pointSummaries.push({
        pointId: point.id,
        pointName: point.name,
        roomLocation: point.room_location,
        parameters,
      });
    }
  }

  const crossPointComparisons: CrossPointComparison[] = [];
  for (const [parameter, list] of Object.entries(paramPointAverages)) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => b.avg - a.avg);
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];
    if (highest.pointName === lowest.pointName) continue;
    const spreadPct = lowest.avg !== 0 ? Math.round(((highest.avg - lowest.avg) / Math.abs(lowest.avg)) * 1000) / 10 : 0;
    crossPointComparisons.push({
      parameter,
      unit: parameterMeta(parameter).unit,
      highestPoint: { name: highest.pointName, avg: highest.avg },
      lowestPoint: { name: lowest.pointName, avg: lowest.avg },
      spreadPct,
    });
  }

  const yachtScores = await getYachtScores(yachtId);

  return {
    yachtName: yacht?.name ?? "This yacht",
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    periodDays,
    points: pointSummaries,
    crossPointComparisons,
    openAlerts,
    overallScore: yachtScores.overall,
    comfortScore: yachtScores.comfort,
    biologicalSafetyScore: yachtScores.biologicalSafety,
    mouldRiskScore: yachtScores.mouldRisk,
    luxuryPerceptionScore: yachtScores.luxuryPerception,
  };
}
