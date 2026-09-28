import type {
  AnomalyEpisode,
  PreviousPeriodComparison,
  ThresholdExposure,
  ThresholdInfo,
} from "./types";

/**
 * Deterministic statistics computed in code so the AI only has to interpret
 * them, never calculate them. Pure functions over { timestamp, value } series.
 */

export type Reading = { timestamp: string; value: number };

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Consecutive readings further apart than this are not one continuous stretch. */
const RUN_GAP_MS = 60 * 60 * 1000;
const EPISODE_GAP_MS = 30 * 60 * 1000;
const MIN_TREND_DAYS = 7;
const ANOMALY_Z = 4;
const MIN_EPISODE_READINGS = 3;
const MIN_READINGS_PER_HOUR_PROFILE = 30;

const round1 = (n: number) => Math.round(n * 10) / 10;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

const byTime = (a: Reading, b: Reading) => a.timestamp.localeCompare(b.timestamp);

export type TrendResult = {
  direction: "increasing" | "decreasing" | "stable";
  /** Estimated change over the observed span, % of the typical level. Null when there is too little data. */
  changePct: number | null;
  /** Mann-Kendall test on daily medians, p < 0.05 (two-sided). */
  significant: boolean;
  daysUsed: number;
};

/**
 * Trend on daily medians (removes the day/night cycle and one-off spikes):
 * Theil-Sen slope for the size, Mann-Kendall for whether it is real. A
 * direction is only reported when the trend is significant AND at least 5%.
 */
export function robustTrend(readings: Reading[]): TrendResult {
  const perDay = new Map<number, number[]>();
  for (const r of readings) {
    const day = Math.floor(Date.parse(r.timestamp) / DAY_MS);
    (perDay.get(day) ?? perDay.set(day, []).get(day)!).push(r.value);
  }

  // Drop partial days (period boundaries, outages) so they don't skew the median.
  const typicalCount = median([...perDay.values()].map((v) => v.length));
  const days = [...perDay.entries()]
    .filter(([, values]) => values.length >= typicalCount * 0.5)
    .sort(([a], [b]) => a - b)
    .map(([day, values]) => ({ day, y: median(values) }));

  if (days.length < MIN_TREND_DAYS) {
    return { direction: "stable", changePct: null, significant: false, daysUsed: days.length };
  }

  const n = days.length;
  let s = 0;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      s += Math.sign(days[j].y - days[i].y);
      slopes.push((days[j].y - days[i].y) / (days[j].day - days[i].day));
    }
  }

  const tieGroups = new Map<number, number>();
  for (const { y } of days) tieGroups.set(y, (tieGroups.get(y) ?? 0) + 1);
  let tieTerm = 0;
  for (const t of tieGroups.values()) tieTerm += t * (t - 1) * (2 * t + 5);
  const variance = (n * (n - 1) * (2 * n + 5) - tieTerm) / 18;
  const z = variance > 0 ? (s > 0 ? (s - 1) / Math.sqrt(variance) : s < 0 ? (s + 1) / Math.sqrt(variance) : 0) : 0;

  const span = days[n - 1].day - days[0].day;
  const level = median(days.map((d) => d.y));
  const changePct = level !== 0 ? round1(((median(slopes) * span) / Math.abs(level)) * 100) : null;
  const significant = Math.abs(z) >= 1.96;
  const direction =
    significant && changePct != null && Math.abs(changePct) >= 5 ? (changePct > 0 ? "increasing" : "decreasing") : "stable";

  return { direction, changePct, significant, daysUsed: n };
}

/** Share of the period spent outside the configured limits, and the longest continuous stretch above "warning". */
export function thresholdExposure(readings: Reading[], t: ThresholdInfo): ThresholdExposure | null {
  if (readings.length === 0) return null;
  const sorted = [...readings].sort(byTime);
  const pct = (count: number) => round1((count / sorted.length) * 100);

  let outsidePreferred = 0;
  let aboveWarning = 0;
  let aboveCritical = 0;
  let longestRunMs = 0;
  let runStart: number | null = null;
  let previousTs = 0;

  for (const r of sorted) {
    const ts = Date.parse(r.timestamp);
    if ((t.preferredMax != null && r.value > t.preferredMax) || (t.preferredMin != null && r.value < t.preferredMin)) {
      outsidePreferred++;
    }
    if (t.critical != null && r.value > t.critical) aboveCritical++;
    if (t.warning != null && r.value > t.warning) {
      aboveWarning++;
      if (runStart === null || ts - previousTs > RUN_GAP_MS) runStart = ts;
      longestRunMs = Math.max(longestRunMs, ts - runStart);
    } else {
      runStart = null;
    }
    previousTs = ts;
  }

  return {
    pctOutsidePreferred: pct(outsidePreferred),
    pctAboveWarning: pct(aboveWarning),
    pctAboveCritical: pct(aboveCritical),
    longestHoursAboveWarning: aboveWarning > 0 ? round1(longestRunMs / HOUR_MS) : null,
  };
}

/** Average of this period against the one before it, with how much of the previous period actually has data. */
export function comparePeriods(current: Reading[], previous: Reading[]): PreviousPeriodComparison | null {
  if (current.length === 0 || previous.length < 20) return null;
  const avg = (rs: Reading[]) => rs.reduce((sum, r) => sum + r.value, 0) / rs.length;
  const previousAvg = avg(previous);
  return {
    avg: round1(previousAvg),
    changePct: previousAvg !== 0 ? round1(((avg(current) - previousAvg) / Math.abs(previousAvg)) * 100) : null,
    coveragePct: Math.min(100, Math.round((previous.length / current.length) * 100)),
  };
}

/**
 * Compares each reading with what is typical for THAT point at THAT hour of
 * the day (median and MAD over the whole history given), so a value that is
 * high in absolute terms but normal for its time of day is not flagged.
 * Returns sustained episodes only (a lone spike is treated as sensor noise).
 */
export function hourlyAnomalies(
  current: Reading[],
  reference: Reading[],
): { episodeCount: number; strongest: AnomalyEpisode | null } {
  const buckets: number[][] = Array.from({ length: 24 }, () => []);
  for (const r of reference) buckets[new Date(r.timestamp).getUTCHours()].push(r.value);

  const profile = buckets.map((values) => {
    if (values.length < MIN_READINGS_PER_HOUR_PROFILE) return null;
    const mid = median(values);
    const mad = median(values.map((v) => Math.abs(v - mid)));
    // Relative floor so a near-constant sensor doesn't turn tiny wiggles into huge z-scores.
    return { median: mid, scale: Math.max(1.4826 * mad, 0.05 * Math.abs(mid), 1e-6) };
  });

  type Open = { start: string; end: string; sign: 1 | -1; peak: Reading; peakZ: number; readings: number; lastTs: number };
  const episodes: Open[] = [];
  let open: Open | null = null;

  for (const r of [...current].sort(byTime)) {
    const p = profile[new Date(r.timestamp).getUTCHours()];
    const ts = Date.parse(r.timestamp);
    const z = p ? (r.value - p.median) / p.scale : 0;
    if (Math.abs(z) < ANOMALY_Z) {
      open = null;
      continue;
    }
    const sign = z > 0 ? 1 : -1;
    if (open && open.sign === sign && ts - open.lastTs <= EPISODE_GAP_MS) {
      open.end = r.timestamp;
      open.lastTs = ts;
      open.readings++;
      if (Math.abs(z) > Math.abs(open.peakZ)) {
        open.peak = r;
        open.peakZ = z;
      }
    } else {
      open = { start: r.timestamp, end: r.timestamp, sign, peak: r, peakZ: z, readings: 1, lastTs: ts };
      episodes.push(open);
    }
  }

  const sustained = episodes.filter((e) => e.readings >= MIN_EPISODE_READINGS);
  if (sustained.length === 0) return { episodeCount: 0, strongest: null };

  const top = sustained.reduce((a, b) => (Math.abs(b.peakZ) > Math.abs(a.peakZ) ? b : a));
  const typical = profile[new Date(top.peak.timestamp).getUTCHours()]!.median;
  return {
    episodeCount: sustained.length,
    strongest: {
      start: top.start,
      end: top.end,
      readings: top.readings,
      direction: top.sign > 0 ? "above" : "below",
      peakValue: round1(top.peak.value),
      typicalValueForThatHour: round1(typical),
      peakZScore: round1(top.peakZ),
    },
  };
}
