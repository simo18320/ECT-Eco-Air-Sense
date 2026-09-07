import type { YachtDataSummary } from "@/lib/ai/types";
import type { EconomicImpactItem } from "./economic-impact";

export type ReportPointScore = {
  pointId: string;
  pointName: string;
  roomLocation: string | null;
  comfort: number | null;
  mouldRisk: number | null;
  biologicalSafety: number | null;
  luxuryPerception: number | null;
  overall: number | null;
};

export type ReportGaPlanPin = {
  pointName: string;
  x: number;
  y: number;
  mouldRiskScore: number | null;
};

export type ReportGaPlanDeck = {
  deckName: string;
  imageDataUrl: string | null;
  pins: ReportGaPlanPin[];
};

export type ReportSnapshot = {
  meta: {
    generatedAt: string;
    generatedByName: string;
    generatedByEmail: string;
    periodStart: string;
    periodEnd: string;
    companyName: string;
    companyLogoDataUrl: string | null;
  };
  yacht: {
    name: string;
    shipyard: string | null;
    yachtType: string | null;
    imoNumber: string | null;
    flag: string | null;
    buildYear: number | null;
    lengthM: number | null;
    grossTonnage: number | null;
    ownerName: string | null;
    managementCompany: string | null;
    captainName: string | null;
    monitoringProvider: string | null;
    monitoringFrequency: string | null;
    photoDataUrl: string | null;
  };
  coverage: {
    totalPoints: number;
    sensorsOnline: number;
    sensorsOffline: number;
    monitoringCoveragePct: number | null;
    dataQualityPct: number | null;
  };
  scores: {
    overall: number | null;
    comfort: number | null;
    biologicalSafety: number | null;
    mouldRisk: number | null;
    luxuryPerception: number | null;
  };
  dataSummary: YachtDataSummary;
  pointScores: ReportPointScore[];
  economicImpact: EconomicImpactItem[];
  gaPlan: ReportGaPlanDeck[];
  aiInsights: {
    overallStatus: string;
    keyFinding: string;
    mainRisk: string;
    recommendedAction: string;
    priority: string;
    engine: string;
    findings: {
      insightType: string;
      pointName: string | null;
      fact: string;
      interpretation: string;
      recommendation: string;
      confidenceLevel: string;
      priority: string;
    }[];
  } | null;
  dataQualityDetail: {
    lastImportDate: string | null;
    lastImportRecordsImported: number;
    lastImportRecordsRejected: number;
  };
};
