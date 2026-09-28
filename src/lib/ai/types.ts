export type ConfidenceLevel = "high" | "medium" | "low";
export type Priority = "low" | "medium" | "high";
export type InsightType = "trend" | "anomaly" | "comparison" | "pattern" | "executive_briefing";

export type ExecutiveBriefing = {
  overallStatus: string;
  keyFinding: string;
  mainRisk: string;
  recommendedAction: string;
  priority: Priority;
};

export type Finding = {
  insightType: Exclude<InsightType, "executive_briefing">;
  monitoringPointName: string | null;
  parameter: string | null;
  fact: string;
  interpretation: string;
  recommendation: string;
  confidenceLevel: ConfidenceLevel;
  priority: Priority;
};

export type InsightsOutput = {
  executiveBriefing: ExecutiveBriefing;
  findings: Finding[];
  engine: "claude" | "rule_based_fallback";
};

// ---- Grounded data summary: the ONLY facts either engine is allowed to reason over ----

/** The yacht's configured limits for a parameter (ASHRAE / WHO / EPA / WELL based unless overridden). */
export type ThresholdInfo = {
  preferredMin: number | null;
  preferredMax: number | null;
  warning: number | null;
  critical: number | null;
  source: string | null;
};

export type ThresholdExposure = {
  /** % of readings below preferredMin or above preferredMax. */
  pctOutsidePreferred: number;
  pctAboveWarning: number;
  pctAboveCritical: number;
  /** Longest continuous stretch above the warning limit; null when it was never exceeded. */
  longestHoursAboveWarning: number | null;
};

export type PreviousPeriodComparison = {
  /** Average over the period of the same length immediately before this one. */
  avg: number;
  changePct: number | null;
  /** How much data the previous period has relative to this one — under ~80% the comparison is only partial. */
  coveragePct: number;
};

/** A sustained stretch that is unusual for this point at that hour of day — not a limit exceedance. */
export type AnomalyEpisode = {
  start: string;
  end: string;
  readings: number;
  direction: "above" | "below";
  peakValue: number;
  typicalValueForThatHour: number;
  peakZScore: number;
};

export type ParameterTrend = {
  parameter: string;
  unit: string;
  count: number;
  avg: number;
  min: number;
  max: number;
  /** Direction is "stable" unless the trend is statistically significant and at least 5%. */
  trendDirection: "increasing" | "decreasing" | "stable";
  /** Estimated change over the period (Theil-Sen on daily medians), % of the typical level. */
  trendChangePct: number | null;
  trendSignificant: boolean;
  trendDaysUsed: number;
  dayAvg: number | null;
  nightAvg: number | null;
  /** p10-p90 range over the analysis period — "normal for this specific point," not a configured threshold. */
  baselineRange: [number, number] | null;
  thresholds: ThresholdInfo | null;
  thresholdExposure: ThresholdExposure | null;
  previousPeriod: PreviousPeriodComparison | null;
  anomalyEpisodeCount: number;
  strongestAnomaly: AnomalyEpisode | null;
  openAlertCount: number;
  openCriticalAlertCount: number;
};

export type PointSummary = {
  pointId: string;
  pointName: string;
  roomLocation: string | null;
  parameters: ParameterTrend[];
};

export type CrossPointComparison = {
  parameter: string;
  unit: string;
  highestPoint: { name: string; avg: number };
  lowestPoint: { name: string; avg: number };
  spreadPct: number;
};

export type OpenAlertSummary = {
  pointName: string;
  parameter: string;
  severity: "info" | "warning" | "critical";
  currentValue: number | null;
  durationHours: number;
};

export type YachtDataSummary = {
  yachtName: string;
  periodStart: string;
  periodEnd: string;
  periodDays: number;
  points: PointSummary[];
  crossPointComparisons: CrossPointComparison[];
  openAlerts: OpenAlertSummary[];
  overallScore: number | null;
  comfortScore: number | null;
  biologicalSafetyScore: number | null;
  mouldRiskScore: number | null;
  luxuryPerceptionScore: number | null;
};
