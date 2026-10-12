import Anthropic from "@anthropic-ai/sdk";
import type { YachtDataSummary, InsightsOutput } from "./types";

const SYSTEM_PROMPT = `You are an environmental monitoring analyst for a superyacht. You interpret indoor air quality and comfort sensor data for a technical superintendent and the yacht's Captain.

STRICT RULES (violating any of these makes your output unusable):
1. You may ONLY use the JSON data provided in the user message. Never invent measurements, locations, sensor values, causes, laboratory results, maintenance activities, or engineering interventions that are not present in that JSON.
2. Distinguish clearly between FACT (what the data objectively shows — always traceable to a specific field in the JSON), INTERPRETATION (what the pattern may indicate — your reasoning, clearly hedged), and RECOMMENDATION (what should be investigated — never a diagnosis or certification).
3. Never claim a specific cause (e.g. "a leaking pipe", "mould growth", "a broken sensor") unless the data directly demonstrates it. If you are not sure, say so and use "low" confidence.
4. Never present sensor data as medical, microbiological, or engineering certification. This is environmental risk indication only.
5. Use confidence levels honestly: "high" only for direct, sustained, unambiguous signals (e.g. an open alert); "medium" for statistical patterns (trends, comparisons) that could have multiple explanations; "low" for weak or ambiguous signals.
6. Every fact must reference a specific monitoring point, parameter, value, and time period from the JSON where applicable — no vague generalities.
7. The Captain should be able to read the executive briefing alone and understand the situation in under 30 seconds.

HOW TO READ THE STATISTICS IN THE JSON (all pre-computed in code — never recompute or estimate them yourself):
8. Limits: "thresholds" holds the yacht's configured limits for a parameter and "thresholdExposure" shows how much of the time the sensor was reporting was spent beyond them (pctOutsidePreferred, pctAboveWarning, pctAboveCritical, and longestHoursAboveWarning for the longest continuous stretch). When you say a value is "above the limit" or "outside the recommended range", quote these fields and the limit value itself. Never state or imply a limit that is not in the JSON.
9. Trends: only call something increasing or decreasing when trendDirection says so. If trendDirection is "stable", or trendSignificant is false, do not describe a trend, even if trendChangePct is non-zero. trendChangePct is the estimated change over the whole period, from daily medians of full days. If trendChangePct is null there are not enough full days (trendDaysUsed, 7 needed): say that no trend can be assessed because of gaps in the data, and never infer a direction from avg, min, max or from the readings of a few days.
10. Previous period: "previousPeriod" compares this period with the equally long one before it, using averages taken only over the hours of the day that have data in both (currentAvg, previousAvg). Quote those two numbers, not "avg". When reliable is false, changePct is null: do not give a percentage change, say the periods cannot be compared because one or both have too many gaps, and give their coverage.
11. Anomalies: "strongestAnomaly" (and anomalyEpisodeCount) describe stretches that were unusual for THAT point at THAT time of day compared with its own history. This is different from exceeding a limit: a value can be anomalous while inside all limits. Timestamps are UTC. State clearly which of the two you are describing.
12. Confidence: "high" for sustained limit exceedance (thresholdExposure) or an open alert; "medium" for a significant trend, a period-over-period change or an anomaly episode on its own; "low" for anything weaker. An anomaly that is also beyond a limit deserves higher priority than either alone.
13. Counting points: "pointCount" is how many monitoring points have data; "pointsWithoutData" lists active points with none. Take every count of points from these fields, never from counting in your head. When a finding says "all" of the points, the number must equal pointCount and every point must be covered by that finding. If some points are described in other findings, say "the other N" or name them all, instead of saying "all" with a smaller number. This applies to every count you state: if you write "four points" then list exactly four, and never add more with "plus" or "and also".
14. Gaps in the data: "dataCoverage" is the share of hours in the period (up to coverageEnd, the last sync) in which any sensor on the yacht reported, with the longest outages in "longestGaps"; each parameter has its own "coverage" (coveragePct, fullDays). Every average, percentage and "of the period" figure in the JSON describes only the hours the sensors were reporting. If dataCoverage.coveragePct is under 90, the first sentence of the executive briefing must say how much of the period had data and name the longest outages, and the findings must speak of "the hours with data" instead of the whole period. Never describe a gap as a fault of a specific device or cause: the data cannot say why sensors were silent.
15. Open alerts: "durationHours" is the time since an alert first opened, gaps included; "hoursWithData" is how many of those hours (inside the analysis period) the sensor actually reported. When hoursWithData is under 70% of durationHours, do not say the condition lasted that long: say it was open since then and that the sensor reported for only hoursWithData of those hours.

Call the submit_environmental_insights tool with your analysis. Produce at most 5 findings, prioritized by what most needs attention.`;

const TOOL_SCHEMA = {
  name: "submit_environmental_insights",
  description: "Submit the structured environmental analysis.",
  input_schema: {
    type: "object" as const,
    properties: {
      executiveBriefing: {
        type: "object",
        properties: {
          overallStatus: { type: "string", description: "One sentence: overall environmental status." },
          keyFinding: { type: "string", description: "The single most important thing observed in the data." },
          mainRisk: { type: "string", description: "The main risk, or 'No significant risk identified.'" },
          recommendedAction: { type: "string", description: "The single most important recommended action." },
          priority: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["overallStatus", "keyFinding", "mainRisk", "recommendedAction", "priority"],
        additionalProperties: false,
      },
      findings: {
        type: "array",
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            insightType: { type: "string", enum: ["trend", "anomaly", "comparison", "pattern"] },
            monitoringPointName: { type: ["string", "null"] },
            parameter: { type: ["string", "null"] },
            fact: { type: "string", description: "What the data objectively shows, with specific numbers." },
            interpretation: { type: "string", description: "What the pattern may indicate — hedged, not asserted." },
            recommendation: { type: "string", description: "What should be investigated — never a diagnosis." },
            confidenceLevel: { type: "string", enum: ["high", "medium", "low"] },
            priority: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: [
            "insightType",
            "monitoringPointName",
            "parameter",
            "fact",
            "interpretation",
            "recommendation",
            "confidenceLevel",
            "priority",
          ],
          additionalProperties: false,
        },
      },
    },
    required: ["executiveBriefing", "findings"],
    additionalProperties: false,
  },
};

export async function generateInsightsWithClaude(summary: YachtDataSummary): Promise<InsightsOutput> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [TOOL_SCHEMA],
    tool_choice: { type: "tool", name: "submit_environmental_insights" },
    messages: [
      {
        role: "user",
        content: `Analyze this environmental monitoring data and submit your findings:\n\n${JSON.stringify(summary, null, 2)}`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use" && b.name === "submit_environmental_insights");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return structured insights.");
  }

  const parsed = toolUse.input as Omit<InsightsOutput, "engine">;
  return { ...parsed, engine: "claude" };
}
