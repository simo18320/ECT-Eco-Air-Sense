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
