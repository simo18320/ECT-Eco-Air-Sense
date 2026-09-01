import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { buildYachtDataSummary } from "./data-summary";
import { generateFallbackInsights } from "./fallback-generator";
import { generateInsightsWithClaude } from "./llm-client";
import type { InsightsOutput } from "./types";

export async function generateAndStoreInsights(
  supabase: SupabaseClient<Database>,
  yachtId: string,
  periodDays = 14,
): Promise<{ insightCount: number; engine: InsightsOutput["engine"] }> {
  const summary = await buildYachtDataSummary(yachtId, periodDays);

  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  let output: InsightsOutput;
  try {
    output = hasApiKey ? await generateInsightsWithClaude(summary) : generateFallbackInsights(summary);
  } catch (err) {
    // Never fail the whole operation because the LLM call errored — fall back
    // to the deterministic engine so the feature stays usable.
    console.error("Claude insight generation failed, using rule-based fallback:", err);
    output = generateFallbackInsights(summary);
  }

  const periodStart = summary.periodStart;
  const periodEnd = summary.periodEnd;

  const rows = [
    {
      yacht_id: yachtId,
      monitoring_point_id: null,
      insight_type: "executive_briefing",
      fact_text: output.executiveBriefing.overallStatus,
      interpretation_text: output.executiveBriefing.keyFinding,
      recommendation_text: output.executiveBriefing.recommendedAction,
      confidence_level: null,
      priority: output.executiveBriefing.priority,
      period_start: periodStart,
      period_end: periodEnd,
      source_data_ref: { engine: output.engine, mainRisk: output.executiveBriefing.mainRisk },
    },
    ...output.findings.map((f) => {
      const point = summary.points.find((p) => p.pointName === f.monitoringPointName);
      return {
        yacht_id: yachtId,
        monitoring_point_id: point?.pointId ?? null,
        insight_type: f.insightType,
        fact_text: f.fact,
        interpretation_text: f.interpretation,
        recommendation_text: f.recommendation,
        confidence_level: f.confidenceLevel,
        priority: f.priority,
        period_start: periodStart,
        period_end: periodEnd,
        source_data_ref: { engine: output.engine, parameter: f.parameter },
      };
    }),
  ];

  const { error } = await supabase.from("ai_insights").insert(rows);
  if (error) throw new Error(error.message);

  return { insightCount: rows.length, engine: output.engine };
}
