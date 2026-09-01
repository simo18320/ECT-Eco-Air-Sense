import { parameterScore, scoreBand, type ThresholdLike } from "./parameter-score";
import { DEFAULT_LUXURY_WEIGHTS } from "./default-weights";
import type { CurrentReadings, LuxuryWeights, ScoreResult } from "./types";

const LABELS: Record<string, string> = {
  temperature: "temperature",
  relative_humidity: "humidity",
  co2: "CO2",
  tvoc: "TVOC",
  pm2_5: "PM2.5",
  pm10: "PM10",
};

const LEVEL_WEIGHTS: Record<string, number> = {
  temperature: 0.25,
  relative_humidity: 0.2,
  co2: 0.2,
  tvoc: 0.15,
  pm2_5: 0.1,
  pm10: 0.1,
};

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function stabilityFromStdev(sd: number, goodBelow: number, poorAbove: number): number {
  if (sd <= goodBelow) return 100;
  if (sd >= poorAbove) return 0;
  return 100 - ((sd - goodBelow) / (poorAbove - goodBelow)) * 100;
}

/**
 * Luxury Perception Index (§17): an operational KPI, not a scientific measure of
 * "luxury" — blends current level (60%) with recent stability (40%) of temperature
 * and humidity over the trailing period, then penalises currently-open alerts.
 */
export function computeLuxuryPerceptionIndex(
  readings: CurrentReadings,
  recentTemperature: number[],
  recentHumidity: number[],
  thresholds: Record<string, ThresholdLike>,
  openAlertCount: number,
  weights: LuxuryWeights = DEFAULT_LUXURY_WEIGHTS,
): ScoreResult {
  const params = ["temperature", "relative_humidity", "co2", "tvoc", "pm2_5", "pm10"] as const;
  const breakdown = params.map((p) => {
    const value = readings[p] ?? null;
    const threshold = thresholds[p];
    const subScore = value != null && threshold ? parameterScore(value, threshold) : null;
    return { parameter: p, label: LABELS[p], value, subScore, weight: LEVEL_WEIGHTS[p] };
  });

  const available = breakdown.filter((b) => b.subScore != null);
  if (available.length === 0) {
    return { score: null, band: null, explanation: "No data available yet.", breakdown };
  }

  const totalWeight = available.reduce((sum, b) => sum + b.weight, 0);
  const levelScore = available.reduce((sum, b) => sum + b.subScore! * b.weight, 0) / (totalWeight || 1);

  const tempStability = stabilityFromStdev(stdev(recentTemperature), 1, 3.5);
  const humidityStability = stabilityFromStdev(stdev(recentHumidity), 5, 15);
  const stabilityScore = (tempStability + humidityStability) / 2;

  const combined = levelScore * weights.level + stabilityScore * weights.stability;
  const penalty = Math.min(30, openAlertCount * 10);
  const score = Math.max(0, combined - penalty);

  const reasons: string[] = [];
  const worst = [...available].sort((a, b) => a.subScore! - b.subScore!)[0];
  if (worst && worst.subScore! < 80) reasons.push(`elevated ${worst.label}`);
  if (tempStability < 70) reasons.push("temperature swings");
  if (humidityStability < 70) reasons.push("humidity swings");
  if (openAlertCount > 0) reasons.push(`${openAlertCount} active alert${openAlertCount === 1 ? "" : "s"}`);

  const explanation =
    reasons.length === 0
      ? "Stable, well-controlled conditions supporting a premium onboard experience."
      : `Perception is reduced by ${reasons.join(", ")}.`;

  return { score: Math.round(score), band: scoreBand(score), explanation, breakdown };
}
