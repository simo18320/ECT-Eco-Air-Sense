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

export type ParameterTrend = {
  parameter: string;
  unit: string;
  count: number;
  avg: number;
  min: number;
  max: number;
  trendDirection: "increasing" | "decreasing" | "stable";
  trendChangePct: number | null;
  dayAvg: number | null;
  nightAvg: number | null;
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
