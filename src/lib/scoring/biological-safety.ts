import { parameterScore, scoreBand, type ThresholdLike } from "./parameter-score";
import { DEFAULT_BIOLOGICAL_SAFETY_WEIGHTS } from "./default-weights";
import type { CurrentReadings, BiologicalSafetyWeights, ScoreResult } from "./types";

const LABELS: Record<string, string> = {
  temperature: "temperature",
  relative_humidity: "humidity",
  co2: "CO2",
  tvoc: "TVOC",
  pm2_5: "PM2.5",
  pm10: "PM10",
};

/**
 * Biological Safety Index (§16): an environmental-favourability score, NOT a
 * microbiological measurement. Blends the same threshold-based sub-scores used
 * elsewhere, then applies a penalty for currently-open alerts on this point —
 * sustained anomalies lower environmental favourability even if the instantaneous
 * reading has since settled.
 */
export function computeBiologicalSafetyIndex(
  readings: CurrentReadings,
  thresholds: Record<string, ThresholdLike>,
  openAlertSeverities: ("warning" | "critical")[],
  weights: BiologicalSafetyWeights = DEFAULT_BIOLOGICAL_SAFETY_WEIGHTS,
): ScoreResult {
  const params: (keyof BiologicalSafetyWeights)[] = [
    "relative_humidity",
    "temperature",
    "co2",
    "tvoc",
    "pm2_5",
    "pm10",
  ];
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
  const baseScore = available.reduce((sum, b) => sum + b.subScore! * b.weight, 0) / (totalWeight || 1);

  const penalty = Math.min(
    40,
    openAlertSeverities.reduce((sum, s) => sum + (s === "critical" ? 15 : 8), 0),
  );
  const score = Math.max(0, baseScore - penalty);

  const worst = [...available].sort((a, b) => a.subScore! - b.subScore!).slice(0, 2).filter((b) => b.subScore! < 80);
  let explanation = "Environmental conditions currently favour good biological safety.";
  if (worst.length > 0) {
    explanation = `Favourability is reduced primarily by ${worst.map((b) => b.label).join(" and ")}.`;
  }
  if (penalty > 0) {
    explanation += ` ${openAlertSeverities.length} sustained alert${openAlertSeverities.length === 1 ? "" : "s"} on this point also factor in.`;
  }

  return { score: Math.round(score), band: scoreBand(score), explanation, breakdown };
}
