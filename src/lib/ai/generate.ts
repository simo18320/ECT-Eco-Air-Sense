import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { buildYachtDataSummary } from "./data-summary";
import { generateFallbackInsights } from "./fallback-generator";
import { generateInsightsWithClaude } from "./llm-client";
import type { InsightsOutput } from "./types";

/**
 * Why Claude was not used, kept short enough to store with the insight. The
 * API's error text names the cause (unknown model, bad key, no credit,
 * timeout…) and never contains the key itself.
 */
function describeFailure(err: unknown): string {
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return message.replace(/\s+/g, " ").slice(0, 500);
}

export async function generateAndStoreInsights(
  supabase: SupabaseClient<Database>,
  yachtId: string,
  periodDays = 14,
): Promise<{ insightCount: number; engine: InsightsOutput["engine"] }> {
  const summary = await buildYachtDataSummary(yachtId, periodDays);

  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  let output: InsightsOutput;
  // Stored with the briefing whenever the rule-based engine stands in, so the
  // cause can be read from the database instead of short-lived runtime logs.
  let fallbackReason: string | null = hasApiKey ? null : "ANTHROPIC_API_KEY is not set";
  try {
    output = hasApiKey ? await generateInsightsWithClaude(summary) : generateFallbackInsights(summary);
  } catch (err) {
    // Never fail the whole operation because the LLM call errored — fall back
    // to the deterministic engine so the feature stays usable.
    console.error("Claude insight generation failed, using rule-based fallback:", err);
    fallbackReason = describeFailure(err);
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
      source_data_ref: {
        engine: output.engine,
        mainRisk: output.executiveBriefing.mainRisk,
        ...(fallbackReason ? { fallbackReason } : {}),
      },
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
