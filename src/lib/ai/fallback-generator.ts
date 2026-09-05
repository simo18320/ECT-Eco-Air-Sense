import { parameterMeta } from "@/lib/parameters";
import type { YachtDataSummary, InsightsOutput, Finding, ExecutiveBriefing } from "./types";

const RECOMMENDED_ACTION: Record<string, string> = {
  temperature: "Check HVAC setpoints and airflow balance in this area.",
  relative_humidity: "Inspect ventilation, dehumidification and potential moisture sources.",
  co2: "Investigate ventilation rate and occupancy load in this area.",
  tvoc: "Investigate ventilation and potential VOC sources (cleaning products, materials, furnishings).",
  pm2_5: "Check air filtration and potential particulate sources.",
  pm10: "Check air filtration and potential particulate sources.",
};

function scoreBand(score: number): string {
  if (score >= 81) return "Excellent";
  if (score >= 61) return "Good";
  if (score >= 41) return "Acceptable";
  if (score >= 21) return "Poor";
  return "Very Poor";
}

/**
 * Deterministic, template-based interpretation over the exact same grounded
 * data summary the LLM path consumes — used when no ANTHROPIC_API_KEY is
 * configured, so the feature is fully functional (and honestly grounded)
 * before a real model is wired in. Every sentence traces to a specific field
 * in `summary` — nothing here is invented.
 */
export function generateFallbackInsights(summary: YachtDataSummary): InsightsOutput {
  const findings: Finding[] = [];

  // 1) Open alerts — highest-confidence findings, already measured & persisted.
  const alertsByPointParam = new Map<string, (typeof summary.openAlerts)[number]>();
  for (const alert of summary.openAlerts) {
    alertsByPointParam.set(`${alert.pointName}:${alert.parameter}`, alert);
  }
  const sortedAlerts = [...summary.openAlerts].sort((a, b) => b.durationHours - a.durationHours);
  for (const alert of sortedAlerts.slice(0, 3)) {
    const meta = parameterMeta(alert.parameter);
    findings.push({
      insightType: "anomaly",
      monitoringPointName: alert.pointName,
      parameter: alert.parameter,
      fact: `${meta.label} in ${alert.pointName} has been at ${alert.currentValue?.toFixed(meta.decimals) ?? "an elevated level"} ${meta.unit}, a sustained ${alert.severity} breach for ${alert.durationHours} hour${alert.durationHours === 1 ? "" : "s"}.`,
      interpretation: `This is a persistent deviation, not a single noisy reading — the alert engine only flags breaches that hold continuously across its configured window.`,
      recommendation: RECOMMENDED_ACTION[alert.parameter] ?? "Investigate the cause of this sustained deviation.",
      confidenceLevel: "high",
      priority: alert.severity === "critical" ? "high" : "medium",
    });
  }

  // 2) Notable trends (>=15% change over the period), skipping points/parameters already covered by an alert.
  const trendCandidates = summary.points
    .flatMap((p) =>
      p.parameters
        .filter((param) => param.trendChangePct != null && Math.abs(param.trendChangePct) >= 15)
        .map((param) => ({ point: p, param })),
    )
    .filter(({ point, param }) => !alertsByPointParam.has(`${point.pointName}:${param.parameter}`))
    .sort((a, b) => Math.abs(b.param.trendChangePct!) - Math.abs(a.param.trendChangePct!));

  for (const { point, param } of trendCandidates.slice(0, 2)) {
    const meta = parameterMeta(param.parameter);
    findings.push({
      insightType: "trend",
      monitoringPointName: point.pointName,
      parameter: param.parameter,
      fact: `${meta.label} in ${point.pointName} ${param.trendDirection === "increasing" ? "increased" : "decreased"} by ${Math.abs(param.trendChangePct!)}% comparing the first half to the second half of the last ${summary.periodDays} days (average ${param.avg} ${meta.unit}).`,
      interpretation: `A change of this size across the period suggests a developing pattern rather than day-to-day noise, though the underlying cause cannot be determined from sensor data alone.`,
      recommendation: `Monitor ${point.pointName} closely over the coming days; if the trend continues, ${RECOMMENDED_ACTION[param.parameter]?.toLowerCase() ?? "investigate further"}`,
      confidenceLevel: "medium",
      priority: Math.abs(param.trendChangePct!) >= 30 ? "medium" : "low",
    });
  }

  // 3) Cross-point comparisons with a large spread.
  const bigSpreads = summary.crossPointComparisons
    .filter((c) => c.spreadPct >= 25)
    .sort((a, b) => b.spreadPct - a.spreadPct);
  for (const c of bigSpreads.slice(0, 2)) {
    const meta = parameterMeta(c.parameter);
    findings.push({
      insightType: "comparison",
      monitoringPointName: null,
      parameter: c.parameter,
      fact: `${meta.label} averages ${c.spreadPct}% higher in ${c.highestPoint.name} (${c.highestPoint.avg} ${meta.unit}) than in ${c.lowestPoint.name} (${c.lowestPoint.avg} ${meta.unit}) over the last ${summary.periodDays} days.`,
      interpretation: `This gap suggests a location-specific influence — different occupancy, ventilation, or a local source — rather than a vessel-wide condition.`,
      recommendation: `Compare ventilation and usage patterns between ${c.highestPoint.name} and ${c.lowestPoint.name} to understand the difference.`,
      confidenceLevel: "medium",
      priority: "low",
    });
  }

  // 4) Day/night differences (occupancy proxy), CO2 especially.
  const dayNightCandidates = summary.points
    .flatMap((p) => p.parameters.map((param) => ({ point: p, param })))
    .filter(({ param }) => param.dayAvg != null && param.nightAvg != null)
    .map(({ point, param }) => ({
      point,
      param,
      diffPct: param.dayAvg! !== 0 ? Math.abs(((param.dayAvg! - param.nightAvg!) / param.dayAvg!) * 100) : 0,
    }))
    .filter((c) => c.diffPct >= 20)
    .sort((a, b) => b.diffPct - a.diffPct);

  for (const { point, param, diffPct } of dayNightCandidates.slice(0, 1)) {
    const meta = parameterMeta(param.parameter);
    const higher = param.dayAvg! > param.nightAvg! ? "daytime" : "nighttime";
    findings.push({
      insightType: "pattern",
      monitoringPointName: point.pointName,
      parameter: param.parameter,
      fact: `${meta.label} in ${point.pointName} averages ${Math.round(diffPct)}% higher during ${higher} hours (day ${param.dayAvg} vs. night ${param.nightAvg} ${meta.unit}).`,
      interpretation: `This pattern is consistent with occupancy-driven variation, though it cannot be confirmed as such from sensor data alone.`,
      recommendation: `If unexpected, check whether ventilation schedules align with actual occupancy in this area.`,
      confidenceLevel: "low",
      priority: "low",
    });
  }

  // 5) Values this period outside this point's own typical (p10-p90) range —
  // "unusual for here," independent of the configured alert thresholds.
  const baselineCandidates = summary.points
    .flatMap((p) => p.parameters.map((param) => ({ point: p, param })))
    .filter(({ point, param }) => param.baselineRange != null && !alertsByPointParam.has(`${point.pointName}:${param.parameter}`))
    .filter(({ param }) => param.max > param.baselineRange![1] || param.min < param.baselineRange![0])
    .sort((a, b) => {
      const dev = (p: (typeof a)["param"]) =>
        Math.max(p.max - p.baselineRange![1], p.baselineRange![0] - p.min);
      return dev(b.param) - dev(a.param);
    });

  for (const { point, param } of baselineCandidates.slice(0, 1)) {
    const meta = parameterMeta(param.parameter);
    const [lo, hi] = param.baselineRange!;
    const above = param.max > hi;
    findings.push({
      insightType: "anomaly",
      monitoringPointName: point.pointName,
      parameter: param.parameter,
      fact: `${meta.label} in ${point.pointName} reached ${above ? param.max : param.min} ${meta.unit} this period, outside the typical ${lo}–${hi} ${meta.unit} range for this specific location.`,
      interpretation: `This is unusual for ${point.pointName} specifically, based on its own recent history — not necessarily a breach of the configured safety threshold.`,
      recommendation: `Check what was different in ${point.pointName} during this period (occupancy, ventilation, activity).`,
      confidenceLevel: "low",
      priority: "low",
    });
  }

  const topPriorityFinding = findings.find((f) => f.priority === "high") ?? findings[0];
  const overallStatus =
    summary.overallScore != null
      ? `Overall Environmental Score is ${summary.overallScore}/100 (${scoreBand(summary.overallScore)}) across ${summary.points.length} monitoring point${summary.points.length === 1 ? "" : "s"}.`
      : "No monitoring data available yet for this period.";

  const criticalAlerts = summary.openAlerts.filter((a) => a.severity === "critical");
  const mainRisk =
    criticalAlerts.length > 0
      ? `${criticalAlerts.length} critical alert${criticalAlerts.length === 1 ? "" : "s"} currently open (${criticalAlerts.map((a) => `${a.pointName}: ${parameterMeta(a.parameter).label}`).join(", ")}).`
      : summary.mouldRiskScore != null && summary.mouldRiskScore > 40
        ? `Mould Risk Index averages ${summary.mouldRiskScore}/100 across monitored points — see the Risk page for the per-point breakdown.`
        : summary.openAlerts.length > 0
          ? `${summary.openAlerts.length} sustained warning-level alert${summary.openAlerts.length === 1 ? "" : "s"} currently open.`
          : "No significant risk identified from current sensor data.";

  const priority: ExecutiveBriefing["priority"] =
    criticalAlerts.length > 0 ? "high" : summary.openAlerts.length > 0 || (topPriorityFinding?.priority === "medium") ? "medium" : "low";

  const executiveBriefing: ExecutiveBriefing = {
    overallStatus,
    keyFinding: topPriorityFinding
      ? topPriorityFinding.fact
      : "Conditions are stable across all monitored points with no notable trends or anomalies this period.",
    mainRisk,
    recommendedAction: topPriorityFinding?.recommendation ?? "Continue routine monitoring — no action required at this time.",
    priority,
  };

  return { executiveBriefing, findings: findings.slice(0, 5), engine: "rule_based_fallback" };
}
