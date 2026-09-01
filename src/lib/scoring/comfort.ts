import { parameterScore, scoreBand, type ThresholdLike } from "./parameter-score";
import { DEFAULT_COMFORT_WEIGHTS } from "./default-weights";
import type { CurrentReadings, ComfortWeights, ScoreResult } from "./types";

const LABELS: Record<string, string> = {
  temperature: "temperature",
  relative_humidity: "humidity",
  co2: "CO2",
  tvoc: "TVOC",
};

/**
 * Comfort Index (§15): weighted blend of temperature/humidity/CO2/TVOC sub-scores.
 * Each sub-score comes from parameterScore() against the parameter's configured
 * threshold band, so "comfortable" is whatever the thresholds say it is.
 */
export function computeComfortIndex(
  readings: CurrentReadings,
  thresholds: Record<string, ThresholdLike>,
  weights: ComfortWeights = DEFAULT_COMFORT_WEIGHTS,
): ScoreResult {
  const params: (keyof ComfortWeights)[] = ["temperature", "relative_humidity", "co2", "tvoc"];
  const breakdown = params.map((p) => {
    const value = readings[p] ?? null;
    const threshold = thresholds[p];
    const subScore = value != null && threshold ? parameterScore(value, threshold) : null;
    return { parameter: p, label: LABELS[p], value, subScore, weight: weights[p] };
  });

  const available = breakdown.filter((b) => b.subScore != null);
  if (available.length === 0) {
    return { score: null, band: null, explanation: "No data available yet.", breakdown };
  }

  const totalWeight = available.reduce((sum, b) => sum + b.weight, 0);
  const score = available.reduce((sum, b) => sum + b.subScore! * b.weight, 0) / (totalWeight || 1);

  const worst = [...available].sort((a, b) => a.subScore! - b.subScore!).slice(0, 2).filter((b) => b.subScore! < 80);
  const explanation =
    worst.length === 0
      ? "Conditions are within the comfortable range across all measured parameters."
      : `Comfort is reduced primarily by elevated ${worst.map((b) => b.label).join(" and ")}.`;

  return { score: Math.round(score), band: scoreBand(score), explanation, breakdown };
}
