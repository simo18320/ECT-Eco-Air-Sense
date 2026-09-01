import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_COMFORT_WEIGHTS,
  DEFAULT_BIOLOGICAL_SAFETY_WEIGHTS,
  DEFAULT_LUXURY_WEIGHTS,
  DEFAULT_OVERALL_WEIGHTS,
} from "@/lib/scoring/default-weights";
import type { ComfortWeights, BiologicalSafetyWeights, LuxuryWeights, OverallWeights } from "@/lib/scoring/types";
import type { Enums } from "@/types/database";

export type ScoringWeightsBundle = {
  comfort: ComfortWeights;
  biologicalSafety: BiologicalSafetyWeights;
  luxuryPerception: LuxuryWeights;
  overall: OverallWeights;
};

export async function getScoringWeights(yachtId: string): Promise<ScoringWeightsBundle> {
  const supabase = await createClient();
  const { data: yacht } = await supabase.from("yachts").select("company_id").eq("id", yachtId).single();

  const bundle: ScoringWeightsBundle = {
    comfort: DEFAULT_COMFORT_WEIGHTS,
    biologicalSafety: DEFAULT_BIOLOGICAL_SAFETY_WEIGHTS,
    luxuryPerception: DEFAULT_LUXURY_WEIGHTS,
    overall: DEFAULT_OVERALL_WEIGHTS,
  };
  if (!yacht) return bundle;

  const [{ data: companyConfigs }, { data: yachtConfigs }] = await Promise.all([
    supabase
      .from("scoring_configurations")
      .select("config_type, weights")
      .eq("company_id", yacht.company_id)
      .is("yacht_id", null)
      .eq("active", true),
    supabase
      .from("scoring_configurations")
      .select("config_type, weights")
      .eq("yacht_id", yachtId)
      .eq("active", true),
  ]);

  const byType = new Map<Enums<"scoring_config_type">, unknown>();
  for (const c of companyConfigs ?? []) byType.set(c.config_type, c.weights);
  for (const c of yachtConfigs ?? []) byType.set(c.config_type, c.weights); // yacht-specific wins

  const comfort = byType.get("comfort") as Partial<ComfortWeights> | undefined;
  const biologicalSafety = byType.get("biological_safety") as Partial<BiologicalSafetyWeights> | undefined;
  const luxuryPerception = byType.get("luxury_perception") as Partial<LuxuryWeights> | undefined;
  const overall = byType.get("overall") as Partial<OverallWeights> | undefined;

  return {
    comfort: comfort ? { ...DEFAULT_COMFORT_WEIGHTS, ...comfort } : DEFAULT_COMFORT_WEIGHTS,
    biologicalSafety: biologicalSafety
      ? { ...DEFAULT_BIOLOGICAL_SAFETY_WEIGHTS, ...biologicalSafety }
      : DEFAULT_BIOLOGICAL_SAFETY_WEIGHTS,
    luxuryPerception: luxuryPerception ? { ...DEFAULT_LUXURY_WEIGHTS, ...luxuryPerception } : DEFAULT_LUXURY_WEIGHTS,
    overall: overall ? { ...DEFAULT_OVERALL_WEIGHTS, ...overall } : DEFAULT_OVERALL_WEIGHTS,
  };
}
