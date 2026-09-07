import { parameterMeta } from "@/lib/parameters";
import type { YachtDataSummary } from "@/lib/ai/types";
import type { ReportPointScore } from "./types";

export type EconomicImpactRiskLevel = "high" | "medium" | "low";

export type EconomicImpactItem = {
  pointName: string | null;
  parameter: string | null;
  riskLevel: EconomicImpactRiskLevel;
  costCategories: string[];
  description: string;
  recommendedAction: string;
};

/**
 * Cost category + generic recommendation per parameter — deliberately
 * qualitative (category, not a euro figure): this app has no reliable basis
 * for a specific yacht's HVAC running cost or remediation pricing, and
 * presenting an invented number in a client-facing report would look more
 * certified than it is. Mirrors the RECOMMENDED_ACTION maps already used in
 * evaluate.ts/fallback-generator.ts, extended with a cost category.
 */
const COST_PROFILE: Record<string, { categories: string[]; action: string }> = {
  temperature: {
    categories: ["HVAC efficiency"],
    action: "Check HVAC setpoints and airflow balance in this area.",
  },
  relative_humidity: {
    categories: ["Mould/moisture remediation", "HVAC efficiency"],
    action: "Inspect ventilation, dehumidification and potential moisture sources.",
  },
  co2: {
    categories: ["HVAC efficiency", "Guest/crew comfort"],
    action: "Investigate ventilation rate and occupancy load in this area.",
  },
  tvoc: {
    categories: ["Air quality", "Guest/crew comfort"],
    action: "Investigate ventilation and potential VOC sources (cleaning products, materials, furnishings).",
  },
  pm2_5: {
    categories: ["HVAC filtration/maintenance"],
    action: "Check air filtration and potential particulate sources.",
  },
  pm10: {
    categories: ["HVAC filtration/maintenance"],
    action: "Check air filtration and potential particulate sources.",
  },
};

const MOULD_RISK_HIGH_THRESHOLD = 60;
const MOULD_RISK_MEDIUM_THRESHOLD = 40;

/**
 * Deterministic, code-based risk classification from data already in the
 * snapshot (open alerts, mould risk scores) — never LLM-generated, so every
 * item here is directly traceable to a specific measured fact. Answers "what
 * would implementing the recommended action reduce exposure to" in terms of
 * risk LEVEL and cost CATEGORY only, not a monetary amount — this app has no
 * reliable basis for a specific yacht's energy or remediation costs.
 */
export function buildEconomicImpact(
  dataSummary: YachtDataSummary,
  pointScores: ReportPointScore[],
): EconomicImpactItem[] {
  const items = new Map<string, EconomicImpactItem>();

  for (const alert of dataSummary.openAlerts) {
    const profile = COST_PROFILE[alert.parameter];
    if (!profile) continue;
    const riskLevel: EconomicImpactRiskLevel = alert.severity === "critical" ? "high" : "medium";
    const key = `${alert.pointName}:${alert.parameter}`;
    items.set(key, {
      pointName: alert.pointName,
      parameter: alert.parameter,
      riskLevel,
      costCategories: profile.categories,
      description: `${parameterMeta(alert.parameter).label} in ${alert.pointName} has been in sustained ${alert.severity === "critical" ? "critical alert" : "warning alert"} for ${alert.durationHours}h. Left unaddressed, this increases exposure to ${profile.categories.join(" / ")} costs.`,
      recommendedAction: profile.action,
    });
  }

  for (const point of pointScores) {
    if (point.mouldRisk == null || point.mouldRisk < MOULD_RISK_MEDIUM_THRESHOLD) continue;
    const riskLevel: EconomicImpactRiskLevel = point.mouldRisk >= MOULD_RISK_HIGH_THRESHOLD ? "high" : "medium";
    const key = `${point.pointName}:relative_humidity`;
    const existing = items.get(key);
    if (existing && (existing.riskLevel === "high" || (existing.riskLevel === "medium" && riskLevel === "medium"))) {
      continue; // an alert-derived item already covers this at equal or higher severity
    }
    const profile = COST_PROFILE.relative_humidity;
    items.set(key, {
      pointName: point.pointName,
      parameter: "mould_risk",
      riskLevel,
      costCategories: profile.categories,
      description: `Mould Risk Index for ${point.pointName} averaged ${point.mouldRisk}/100 this period. A sustained elevated score increases the likelihood of eventually requiring professional remediation.`,
      recommendedAction: profile.action,
    });
  }

  return [...items.values()].sort((a, b) => {
    const order: Record<EconomicImpactRiskLevel, number> = { high: 0, medium: 1, low: 2 };
    return order[a.riskLevel] - order[b.riskLevel];
  });
}
