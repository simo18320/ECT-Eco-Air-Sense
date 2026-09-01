import type { Tables } from "@/types/database";

export type ThresholdLike = Pick<
  Tables<"thresholds">,
  "preferred_min" | "preferred_max" | "warning_threshold" | "critical_threshold"
>;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Maps a raw reading to a 0-100 "how comfortable/favourable is this value" score,
 * using the same threshold bands the alert engine evaluates against (single source
 * of truth for "what counts as normal" for a given parameter).
 *
 * Piecewise linear:
 *   within [preferred_min, preferred_max]        -> 100
 *   preferred_max .. warning_threshold            -> 100 -> 60
 *   warning_threshold .. critical_threshold        -> 60 -> 20
 *   critical_threshold .. critical + (critical-warning) -> 20 -> 0
 *   beyond that                                    -> 0
 * Mirrored below preferred_min when the parameter has a lower bound (temperature, humidity).
 */
export function parameterScore(value: number, t: ThresholdLike): number {
  const { preferred_min, preferred_max, warning_threshold, critical_threshold } = t;

  if (preferred_max == null) return 100; // no configured threshold — treat as neutral

  if (preferred_min != null && value < preferred_min) {
    if (warning_threshold == null || critical_threshold == null) return 100;
    const warnSpan = warning_threshold - preferred_max;
    const critSpan = critical_threshold - preferred_max;
    const lowerWarning = preferred_min - warnSpan;
    const lowerCritical = preferred_min - critSpan;
    const tailSpan = critSpan - warnSpan || 1;
    const lowerTail = lowerCritical - tailSpan;

    if (value >= lowerWarning) return lerp(100, 60, (preferred_min - value) / (preferred_min - lowerWarning || 1));
    if (value >= lowerCritical) return lerp(60, 20, (lowerWarning - value) / (lowerWarning - lowerCritical || 1));
    if (value >= lowerTail) return lerp(20, 0, (lowerCritical - value) / (lowerCritical - lowerTail || 1));
    return 0;
  }

  if (value <= preferred_max) return 100;
  if (warning_threshold == null || critical_threshold == null) return 100;

  if (value <= warning_threshold) return lerp(100, 60, (value - preferred_max) / (warning_threshold - preferred_max || 1));
  if (value <= critical_threshold) return lerp(60, 20, (value - warning_threshold) / (critical_threshold - warning_threshold || 1));

  const tailSpan = (critical_threshold - warning_threshold) || 1;
  const tailEnd = critical_threshold + tailSpan;
  if (value <= tailEnd) return lerp(20, 0, (value - critical_threshold) / tailSpan);
  return 0;
}

export function scoreBand(score: number): { label: string; tone: "critical" | "warning" | "good" } {
  if (score >= 81) return { label: "Excellent", tone: "good" };
  if (score >= 61) return { label: "Good", tone: "good" };
  if (score >= 41) return { label: "Acceptable", tone: "warning" };
  if (score >= 21) return { label: "Poor", tone: "warning" };
  return { label: "Very Poor", tone: "critical" };
}
