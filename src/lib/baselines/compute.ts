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
