import type { ThresholdLike } from "./parameter-score";

export type MouldRiskResult = {
  score: number | null; // 0-100, HIGHER = more risk (unlike the other indices)
  band: { label: string; tone: "critical" | "warning" | "good" } | null;
  explanation: string;
  breakdown: {
    humidityComponent: number;
    temperatureFactor: number;
    dewPointGapC: number | null;
    dewPointComponent: number;
    persistenceComponent: number;
    tvocContextComponent: number;
  } | null;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** Magnus formula approximation, valid for typical indoor ranges. */
function dewPointCelsius(tempC: number, rhPct: number): number {
  const b = 17.62;
  const c = 243.12;
  const gamma = Math.log(rhPct / 100) + (b * tempC) / (c + tempC);
  return (c * gamma) / (b - gamma);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * clamp(t, 0, 1);
}

function bandFor(score: number): { label: string; tone: "critical" | "warning" | "good" } {
  if (score <= 20) return { label: "Very Low", tone: "good" };
  if (score <= 40) return { label: "Low", tone: "good" };
  if (score <= 60) return { label: "Moderate", tone: "warning" };
  if (score <= 80) return { label: "High", tone: "warning" };
  return { label: "Critical", tone: "critical" };
}

/**
 * Mould Risk Index (§14): moisture-driven, not a substitute for a mould inspection.
 *
 *   riskFromHumidity   0-70 pts, RH <= 60% contributes nothing; scales up above that
 *                      (RH is the primary driver — see methodology).
 *   temperatureFactor  0.4-1.0 multiplier — mould growth is fastest ~20-30degC;
 *                      very cold or very hot conditions suppress growth even at
 *                      high RH, so the humidity component is scaled down outside
 *                      that band.
 *   dewPointComponent  0-15 pts — condensation risk when air temperature sits
 *                      close to the calculated dew point (Magnus formula).
 *   persistenceComponent  0-15 pts — RH breach sustained across the alert engine's
 *                      persistence window (same signal as the Alert Engine, reused
 *                      here rather than recomputed).
 *   tvocContextComponent  0-10 pts — TVOC is contextual only, per spec: never the
 *                      primary driver, and capped well below the humidity term.
 */
export function computeMouldRiskIndex(
  temperature: number | null | undefined,
  relativeHumidity: number | null | undefined,
  tvoc: number | null | undefined,
  rhThreshold: ThresholdLike | undefined,
  tvocThreshold: ThresholdLike | undefined,
  hasSustainedRhBreach: boolean,
): MouldRiskResult {
  if (relativeHumidity == null) {
    return { score: null, band: null, explanation: "No humidity data available yet.", breakdown: null };
  }

  const rhWarn = rhThreshold?.warning_threshold ?? 70;
  const rhCrit = rhThreshold?.critical_threshold ?? 80;
  const rhPreferredMax = rhThreshold?.preferred_max ?? 60;

  let humidityComponent: number;
  if (relativeHumidity <= rhPreferredMax) humidityComponent = 0;
  else if (relativeHumidity <= rhWarn) humidityComponent = lerp(0, 40, (relativeHumidity - rhPreferredMax) / (rhWarn - rhPreferredMax || 1));
  else if (relativeHumidity <= rhCrit) humidityComponent = lerp(40, 70, (relativeHumidity - rhWarn) / (rhCrit - rhWarn || 1));
  else humidityComponent = clamp(lerp(70, 100, (relativeHumidity - rhCrit) / 10), 70, 100);

  let temperatureFactor = 0.4;
  if (temperature != null) {
    if (temperature >= 20 && temperature <= 30) temperatureFactor = 1.0;
    else if ((temperature >= 15 && temperature < 20) || (temperature > 30 && temperature <= 32)) temperatureFactor = 0.7;
  }

  let dewPointGapC: number | null = null;
  let dewPointComponent = 0;
  if (temperature != null) {
    const dp = dewPointCelsius(temperature, relativeHumidity);
    dewPointGapC = Math.round((temperature - dp) * 10) / 10;
    if (dewPointGapC < 2) dewPointComponent = 15;
    else if (dewPointGapC < 5) dewPointComponent = 8;
  }

  const persistenceComponent = hasSustainedRhBreach ? 15 : 0;

  let tvocContextComponent = 0;
  if (tvoc != null && tvocThreshold?.warning_threshold != null && tvocThreshold?.critical_threshold != null) {
    if (tvoc > tvocThreshold.critical_threshold) tvocContextComponent = 10;
    else if (tvoc > tvocThreshold.warning_threshold) tvocContextComponent = 5;
  }

  const score = clamp(
    Math.round(humidityComponent * temperatureFactor + dewPointComponent + persistenceComponent + tvocContextComponent),
    0,
    100,
  );

  const reasons: string[] = [];
  if (humidityComponent > 20) reasons.push("elevated relative humidity");
  if (dewPointComponent > 0) reasons.push("air temperature close to the dew point (condensation risk)");
  if (persistenceComponent > 0) reasons.push("humidity has been elevated for a sustained period");
  if (tvocContextComponent > 0) reasons.push("elevated TVOC as a contextual signal");

  const explanation =
    reasons.length === 0
      ? "Humidity and temperature are outside the range that favours mould growth."
      : `Risk is driven by ${reasons.join(", ")}.`;

  return {
    score,
    band: bandFor(score),
    explanation,
    breakdown: {
      humidityComponent: Math.round(humidityComponent),
      temperatureFactor,
      dewPointGapC,
      dewPointComponent,
      persistenceComponent,
      tvocContextComponent,
    },
  };
}
