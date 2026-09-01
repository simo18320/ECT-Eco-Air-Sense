import type { ComfortWeights, BiologicalSafetyWeights, LuxuryWeights, OverallWeights } from "./types";

// Proposed in the architecture doc, applied unless overridden in scoring_configurations.
export const DEFAULT_COMFORT_WEIGHTS: ComfortWeights = {
  temperature: 0.3,
  relative_humidity: 0.25,
  co2: 0.25,
  tvoc: 0.2,
};

export const DEFAULT_BIOLOGICAL_SAFETY_WEIGHTS: BiologicalSafetyWeights = {
  relative_humidity: 0.2,
  temperature: 0.15,
  co2: 0.2,
  tvoc: 0.15,
  pm2_5: 0.15,
  pm10: 0.15,
};

export const DEFAULT_LUXURY_WEIGHTS: LuxuryWeights = {
  level: 0.6,
  stability: 0.4,
};

export const DEFAULT_OVERALL_WEIGHTS: OverallWeights = {
  comfort: 0.3,
  biological_safety: 0.3,
  mould_risk: 0.2, // applied inverted: overall uses (100 - mouldRisk) * weight
  luxury_perception: 0.2,
};
