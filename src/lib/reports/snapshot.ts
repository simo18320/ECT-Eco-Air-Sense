import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/current-user";
import { buildYachtDataSummary } from "@/lib/ai/data-summary";
import { getYachtScores, getPointScores } from "@/lib/data/scoring";
import { getScoringWeights } from "@/lib/data/scoring-config";
import { getYachtHealthSummary } from "@/lib/data/alerts";
import { getDecks, getGaPlanForDeck, getPinsForGaPlan } from "@/lib/data/ga-plan";
import { getLatestExecutiveBriefing, getRecentInsights } from "@/lib/data/ai-insights";
import { buildEconomicImpact } from "./economic-impact";
import type { ReportSnapshot, ReportGaPlanDeck, ReportPointScore } from "./types";

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/png";
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function buildReportSnapshot(yachtId: string, periodDays = 14): Promise<ReportSnapshot> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: yacht } = await supabase.from("yachts").select("*").eq("id", yachtId).single();
  if (!yacht) throw new Error("Yacht not found.");

  const [dataSummary, yachtScores, weights, health, decks, briefing, recentInsights, lastImportJob] =
    await Promise.all([
      buildYachtDataSummary(yachtId, periodDays),
      getYachtScores(yachtId),
      getScoringWeights(yachtId),
      getYachtHealthSummary(yachtId),
      getDecks(yachtId),
      getLatestExecutiveBriefing(yachtId),
      getRecentInsights(yachtId),
      supabase
        .from("import_jobs")
        .select("created_at, records_imported, records_rejected")
        .eq("yacht_id", yachtId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const { data: points } = await supabase
    .from("monitoring_points")
    .select("id, name, room_location")
    .eq("yacht_id", yachtId)
    .eq("active", true);

  const pointScores: ReportPointScore[] = await Promise.all(
    (points ?? []).map(async (p) => {
      const scores = await getPointScores(p.id, yachtId, weights);
      return {
        pointId: p.id,
        pointName: p.name,
        roomLocation: p.room_location,
        comfort: scores.comfort.score,
        mouldRisk: scores.mouldRisk.score,
        biologicalSafety: scores.biologicalSafety.score,
        luxuryPerception: scores.luxuryPerception.score,
        overall: scores.overall.score,
      };
    }),
  );

  const mouldRiskByPoint = new Map(pointScores.map((p) => [p.pointName, p.mouldRisk]));
  const economicImpact = buildEconomicImpact(dataSummary, pointScores);

  let photoDataUrl: string | null = null;
  if (yacht.photo_url) {
    const { data: signed } = await supabase.storage.from("yacht-files").createSignedUrl(yacht.photo_url, 60 * 60);
    if (signed?.signedUrl) photoDataUrl = await urlToDataUrl(signed.signedUrl);
  }

  const gaPlan: ReportGaPlanDeck[] = [];
  for (const deck of decks) {
    const plan = await getGaPlanForDeck(deck.id);
    if (!plan) continue;
    const pins = await getPinsForGaPlan(plan.id);
    const imageDataUrl = plan.signedUrl ? await urlToDataUrl(plan.signedUrl) : null;
    gaPlan.push({
      deckName: deck.name,
      imageDataUrl,
      pins: pins.map((pin) => ({
        pointName: pin.monitoring_points?.name ?? "Unknown",
        x: pin.x_coord,
        y: pin.y_coord,
        mouldRiskScore: mouldRiskByPoint.get(pin.monitoring_points?.name ?? "") ?? null,
      })),
    });
  }

  let companyLogoDataUrl: string | null = null;
  if (user?.companyLogoUrl) {
    companyLogoDataUrl = await urlToDataUrl(user.companyLogoUrl);
  }

  const now = new Date();
  const periodEnd = now;
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const findingsInsights = recentInsights.filter((i) => i.insight_type !== "executive_briefing");
  const briefingMeta = briefing?.source_data_ref as { engine?: string; mainRisk?: string } | null;

  return {
    meta: {
      generatedAt: now.toISOString(),
      generatedByName: user?.fullName ?? user?.email ?? "Unknown",
      generatedByEmail: user?.email ?? "",
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      companyName: user?.companyName ?? "Eco Cleaning Technologies",
      companyLogoDataUrl,
    },
    yacht: {
      name: yacht.name,
      shipyard: yacht.shipyard,
      yachtType: yacht.yacht_type,
      imoNumber: yacht.imo_number,
      flag: yacht.flag,
      buildYear: yacht.build_year,
      lengthM: yacht.length_m,
      grossTonnage: yacht.gross_tonnage,
      ownerName: yacht.owner_name,
      managementCompany: yacht.management_company,
      captainName: yacht.captain_name,
      monitoringProvider: yacht.monitoring_provider,
      monitoringFrequency: yacht.monitoring_frequency,
      photoDataUrl,
    },
    coverage: {
      totalPoints: health.sensorsOnline + health.sensorsOffline,
      sensorsOnline: health.sensorsOnline,
      sensorsOffline: health.sensorsOffline,
      monitoringCoveragePct: health.monitoringCoveragePct,
      dataQualityPct: health.dataQualityPct,
    },
    scores: {
      overall: yachtScores.overall,
      comfort: yachtScores.comfort,
      biologicalSafety: yachtScores.biologicalSafety,
      mouldRisk: yachtScores.mouldRisk,
      luxuryPerception: yachtScores.luxuryPerception,
    },
    dataSummary,
    pointScores,
    economicImpact,
    gaPlan,
    aiInsights: briefing
      ? {
          overallStatus: briefing.fact_text ?? "",
          keyFinding: briefing.interpretation_text ?? "",
          mainRisk: briefingMeta?.mainRisk ?? "",
          recommendedAction: briefing.recommendation_text ?? "",
          priority: briefing.priority ?? "low",
          engine: briefingMeta?.engine ?? "rule_based_fallback",
          findings: findingsInsights.map((f) => ({
            insightType: f.insight_type,
            pointName: (f as { monitoring_points?: { name: string } | null }).monitoring_points?.name ?? null,
            fact: f.fact_text ?? "",
            interpretation: f.interpretation_text ?? "",
            recommendation: f.recommendation_text ?? "",
            confidenceLevel: f.confidence_level ?? "low",
            priority: f.priority ?? "low",
          })),
        }
      : null,
    dataQualityDetail: {
      lastImportDate: lastImportJob.data?.created_at ?? null,
      lastImportRecordsImported: lastImportJob.data?.records_imported ?? 0,
      lastImportRecordsRejected: lastImportJob.data?.records_rejected ?? 0,
    },
  };
}
