/**
 * Pure, client-safe parameter/stats helpers — no server imports here, since
 * client components (chart controls) need these without pulling in Supabase.
 */

export const PARAMETER_META: Record<
  string,
  { label: string; unit: string; decimals: number }
> = {
  temperature: { label: "Temperature", unit: "°C", decimals: 1 },
  relative_humidity: { label: "Relative Humidity", unit: "%", decimals: 1 },
  co2: { label: "CO2", unit: "ppm", decimals: 0 },
  tvoc: { label: "TVOC", unit: "µg/m³", decimals: 0 },
  pm2_5: { label: "PM2.5", unit: "µg/m³", decimals: 1 },
  pm10: { label: "PM10", unit: "µg/m³", decimals: 1 },
};

export function parameterMeta(parameter: string) {
  return PARAMETER_META[parameter] ?? { label: parameter, unit: "", decimals: 2 };
}

export type PeriodKey = "24h" | "7d" | "14d" | "30d" | "custom";

export function resolvePeriod(
  period: PeriodKey,
  customStart?: string,
  customEnd?: string,
): { start: Date; end: Date; label: string } {
  const end = customEnd ? new Date(customEnd) : new Date();
  if (period === "custom" && customStart) {
    return { start: new Date(customStart), end, label: "Custom range" };
  }
  const hours: Record<Exclude<PeriodKey, "custom">, number> = {
    "24h": 24,
    "7d": 24 * 7,
    "14d": 24 * 14,
    "30d": 24 * 30,
  };
  const label: Record<Exclude<PeriodKey, "custom">, string> = {
    "24h": "Last 24 hours",
    "7d": "Last 7 days",
    "14d": "Last 14 days",
    "30d": "Last 30 days",
  };
  const h = hours[period as Exclude<PeriodKey, "custom">] ?? 24;
  return {
    start: new Date(end.getTime() - h * 60 * 60 * 1000),
    end,
    label: label[period as Exclude<PeriodKey, "custom">] ?? "Last 24 hours",
  };
}

export type Reading = { timestamp: string; value: number };

export type Stats = {
  current: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
  median: number | null;
  p10: number | null;
  p90: number | null;
  count: number;
};

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function computeStats(readings: Reading[]): Stats {
  if (readings.length === 0) {
    return { current: null, min: null, max: null, avg: null, median: null, p10: null, p90: null, count: 0 };
  }
  const values = readings.map((r) => r.value);
  const sorted = [...values].sort((a, b) => a - b);
  return {
    current: readings[readings.length - 1].value,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    median: percentile(sorted, 50),
    p10: percentile(sorted, 10),
    p90: percentile(sorted, 90),
    count: readings.length,
  };
}
