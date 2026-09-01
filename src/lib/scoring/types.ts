export type CurrentReadings = {
  temperature?: number | null;
  relative_humidity?: number | null;
  co2?: number | null;
  tvoc?: number | null;
  pm2_5?: number | null;
  pm10?: number | null;
};

export type ScoreBreakdownItem = {
  parameter: string;
  label: string;
  value: number | null;
  subScore: number | null;
  weight: number;
};

export type ScoreResult = {
  score: number | null;
  band: { label: string; tone: "critical" | "warning" | "good" } | null;
  explanation: string;
  breakdown: ScoreBreakdownItem[];
};

export type ComfortWeights = { temperature: number; relative_humidity: number; co2: number; tvoc: number };
export type BiologicalSafetyWeights = {
  temperature: number;
  relative_humidity: number;
  co2: number;
  tvoc: number;
  pm2_5: number;
  pm10: number;
};
export type LuxuryWeights = { level: number; stability: number };
export type OverallWeights = { comfort: number; biological_safety: number; mould_risk: number; luxury_perception: number };
