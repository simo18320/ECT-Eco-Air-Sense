import { createClient } from "@/lib/supabase/server";
import { getEffectiveThresholds } from "@/lib/data/thresholds";
import { getScoringWeights, type ScoringWeightsBundle } from "@/lib/data/scoring-config";
import { computeComfortIndex } from "@/lib/scoring/comfort";
import { computeBiologicalSafetyIndex } from "@/lib/scoring/biological-safety";
import { computeMouldRiskIndex } from "@/lib/scoring/mould-risk";
import { computeLuxuryPerceptionIndex } from "@/lib/scoring/luxury-perception";
import { computeOverallScore } from "@/lib/scoring/overall";
import type { CurrentReadings } from "@/lib/scoring/types";
import type { ThresholdLike } from "@/lib/scoring/parameter-score";

export type PointScores = {
  comfort: ReturnType<typeof computeComfortIndex>;
  biologicalSafety: ReturnType<typeof computeBiologicalSafetyIndex>;
  mouldRisk: ReturnType<typeof computeMouldRiskIndex>;
  luxuryPerception: ReturnType<typeof computeLuxuryPerceptionIndex>;
  overall: ReturnType<typeof computeOverallScore>;
};

async function getCurrentReadingsForPoint(pointId: string): Promise<CurrentReadings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("measurements")
    .select("parameter, value, timestamp")
    .eq("monitoring_point_id", pointId)
    .order("timestamp", { ascending: false })
    .limit(500);

  const readings: CurrentReadings = {};
  for (const row of data ?? []) {
    const key = row.parameter as keyof CurrentReadings;
    if (!(key in readings) || readings[key] == null) {
      if (["temperature", "relative_humidity", "co2", "tvoc", "pm2_5", "pm10"].includes(row.parameter)) {
        readings[key] = row.value;
      }
    }
  }
  return readings;
}

async function getRecentSeries(pointId: string, parameter: string, days = 7): Promise<number[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("measurements")
    .select("value")
    .eq("monitoring_point_id", pointId)
    .eq("parameter", parameter)
    .gte("timestamp", since)
    .limit(2000);
  return (data ?? []).map((r) => r.value);
}

export async function getPointScores(
  pointId: string,
  yachtId: string,
  weights?: ScoringWeightsBundle,
): Promise<PointScores> {
  const supabase = await createClient();
  const resolvedWeights = weights ?? (await getScoringWeights(yachtId));

  const [readings, thresholdsList, { data: openAlerts }, recentTemp, recentHumidity] = await Promise.all([
    getCurrentReadingsForPoint(pointId),
    getEffectiveThresholds(yachtId),
    supabase.from("alerts").select("parameter, severity").eq("monitoring_point_id", pointId).eq("status", "open"),
    getRecentSeries(pointId, "temperature"),
    getRecentSeries(pointId, "relative_humidity"),
  ]);

  const thresholds: Record<string, ThresholdLike> = {};
  for (const t of thresholdsList) thresholds[t.parameter] = t;

  const alerts = openAlerts ?? [];
  const severities = alerts.map((a) => a.severity as "warning" | "critical");
  const hasSustainedRhBreach = alerts.some((a) => a.parameter === "relative_humidity");

  const comfort = computeComfortIndex(readings, thresholds, resolvedWeights.comfort);
  const biologicalSafety = computeBiologicalSafetyIndex(readings, thresholds, severities, resolvedWeights.biologicalSafety);
  const mouldRisk = computeMouldRiskIndex(
    readings.temperature,
    readings.relative_humidity,
    readings.tvoc,
    thresholds.relative_humidity,
    thresholds.tvoc,
    hasSustainedRhBreach,
  );
  const luxuryPerception = computeLuxuryPerceptionIndex(
    readings,
    recentTemp,
    recentHumidity,
    thresholds,
    alerts.length,
    resolvedWeights.luxuryPerception,
  );
  const overall = computeOverallScore(
    comfort.score,
    biologicalSafety.score,
    mouldRisk.score,
    luxuryPerception.score,
    resolvedWeights.overall,
  );

  return { comfort, biologicalSafety, mouldRisk, luxuryPerception, overall };
}

export type YachtScores = {
  comfort: number | null;
  biologicalSafety: number | null;
  mouldRisk: number | null;
  luxuryPerception: number | null;
  overall: number | null;
  pointsScored: number;
};

function average(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export async function getYachtScores(yachtId: string): Promise<YachtScores> {
  const supabase = await createClient();
  const { data: points } = await supabase
    .from("monitoring_points")
    .select("id")
    .eq("yacht_id", yachtId)
    .eq("active", true);

  const pointIds = (points ?? []).map((p) => p.id);
  if (pointIds.length === 0) {
    return { comfort: null, biologicalSafety: null, mouldRisk: null, luxuryPerception: null, overall: null, pointsScored: 0 };
  }

  const weights = await getScoringWeights(yachtId);
  const allScores = await Promise.all(pointIds.map((id) => getPointScores(id, yachtId, weights)));

  return {
    comfort: average(allScores.map((s) => s.comfort.score)),
    biologicalSafety: average(allScores.map((s) => s.biologicalSafety.score)),
    mouldRisk: average(allScores.map((s) => s.mouldRisk.score)),
    luxuryPerception: average(allScores.map((s) => s.luxuryPerception.score)),
    overall: average(allScores.map((s) => s.overall.score)),
    pointsScored: allScores.filter((s) => s.overall.score != null).length,
  };
}
