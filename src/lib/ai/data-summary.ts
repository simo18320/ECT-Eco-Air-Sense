import { createClient } from "@/lib/supabase/server";
import { parameterMeta } from "@/lib/parameters";
import { rangeFromValues } from "@/lib/baselines/compute";
import { getYachtScores } from "@/lib/data/scoring";
import type {
  YachtDataSummary,
  PointSummary,
  ParameterTrend,
  CrossPointComparison,
  OpenAlertSummary,
} from "./types";

const PARAMETERS = ["temperature", "relative_humidity", "co2", "tvoc", "pm2_5", "pm10"];

function trendFor(readings: { timestamp: string; value: number }[]): {
  direction: "increasing" | "decreasing" | "stable";
  changePct: number | null;
} {
  if (readings.length < 4) return { direction: "stable", changePct: null };
  const sorted = [...readings].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);
  const firstAvg = firstHalf.reduce((s, r) => s + r.value, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, r) => s + r.value, 0) / secondHalf.length;
  if (firstAvg === 0) return { direction: "stable", changePct: null };
  const changePct = ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100;
  if (Math.abs(changePct) < 5) return { direction: "stable", changePct: Math.round(changePct * 10) / 10 };
  return { direction: changePct > 0 ? "increasing" : "decreasing", changePct: Math.round(changePct * 10) / 10 };
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
    const { data: measurements } = await supabase
      .from("measurements")
      .select("parameter, value, timestamp")
      .eq("monitoring_point_id", point.id)
      .gte("timestamp", periodStart.toISOString())
      .lte("timestamp", periodEnd.toISOString())
      .limit(5000);

    const byParam = new Map<string, { timestamp: string; value: number }[]>();
    for (const m of measurements ?? []) {
      if (!PARAMETERS.includes(m.parameter)) continue;
      (byParam.get(m.parameter) ?? byParam.set(m.parameter, []).get(m.parameter)!).push({
        timestamp: m.timestamp,
        value: m.value,
      });
    }

    const parameters: ParameterTrend[] = [];
    for (const [parameter, readings] of byParam) {
      if (readings.length === 0) continue;
      const values = readings.map((r) => r.value);
      const avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
      const { direction, changePct } = trendFor(readings);
      const { dayAvg, nightAvg } = dayNightSplit(readings);
      const pointAlerts = openAlerts.filter((a) => a.pointName === point.name && a.parameter === parameter);

      parameters.push({
        parameter,
        unit: parameterMeta(parameter).unit,
        count: readings.length,
        avg,
        min: Math.round(Math.min(...values) * 10) / 10,
        max: Math.round(Math.max(...values) * 10) / 10,
        trendDirection: direction,
        trendChangePct: changePct,
        dayAvg,
        nightAvg,
        baselineRange: rangeFromValues(values),
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
