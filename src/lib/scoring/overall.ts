import { scoreBand } from "./parameter-score";
import { DEFAULT_OVERALL_WEIGHTS } from "./default-weights";
import type { OverallWeights, ScoreResult } from "./types";

/**
 * Overall Environmental Score (§18): weighted blend of Comfort, Biological Safety,
 * and Luxury Perception, with Mould Risk applied INVERTED (high risk lowers the
 * score) since it's a risk measure, not a favourability score like the others.
 */
export function computeOverallScore(
  comfort: number | null,
  biologicalSafety: number | null,
  mouldRisk: number | null,
  luxuryPerception: number | null,
  weights: OverallWeights = DEFAULT_OVERALL_WEIGHTS,
): ScoreResult {
  const parts: { key: string; label: string; value: number | null; weight: number }[] = [
    { key: "comfort", label: "Comfort", value: comfort, weight: weights.comfort },
    { key: "biological_safety", label: "Biological Safety", value: biologicalSafety, weight: weights.biological_safety },
    { key: "mould_risk", label: "Mould Risk (inverted)", value: mouldRisk != null ? 100 - mouldRisk : null, weight: weights.mould_risk },
    { key: "luxury_perception", label: "Luxury Perception", value: luxuryPerception, weight: weights.luxury_perception },
  ];

  const available = parts.filter((p) => p.value != null);
  if (available.length === 0) {
    return { score: null, band: null, explanation: "No data available yet.", breakdown: [] };
  }

  const totalWeight = available.reduce((sum, p) => sum + p.weight, 0);
  const score = available.reduce((sum, p) => sum + p.value! * p.weight, 0) / (totalWeight || 1);

  const worst = [...available].sort((a, b) => a.value! - b.value!)[0];
  const explanation =
    worst && worst.value! < 60
      ? `Overall score is held back primarily by ${worst.label}.`
      : "All four indices are contributing positively to the overall score.";

  return {
    score: Math.round(score),
    band: scoreBand(score),
    explanation,
    breakdown: parts.map((p) => ({ parameter: p.key, label: p.label, value: p.value, subScore: p.value, weight: p.weight })),
  };
}
