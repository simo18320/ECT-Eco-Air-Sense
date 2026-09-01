import Link from "next/link";
import { Ship, Radio, RadioTower, AlertTriangle, OctagonAlert, Gauge, PieChart } from "lucide-react";
import { getCurrentUser } from "@/lib/data/current-user";
import { getYachtContext } from "@/lib/data/current-yacht";
import { getYachtHealthSummary, getOpenAlerts } from "@/lib/data/alerts";
import { getYachtScores } from "@/lib/data/scoring";
import { scoreBand } from "@/lib/scoring/parameter-score";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertsPanel } from "@/components/alerts/alerts-panel";
import { ScoreCard } from "@/components/scoring/score-card";
import { ExecutiveBriefingCard } from "@/components/ai-insights/executive-briefing-card";
import { GenerateInsightsButton } from "@/components/ai-insights/generate-button";
import { getLatestExecutiveBriefing } from "@/lib/data/ai-insights";

export default async function OverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { yacht, allYachts } = await getYachtContext();
  const hasYachts = allYachts.length > 0;
  const canManage = user.role === "admin" || user.role === "technical";

  let pointCount = 0;
  let lastImportAt: string | null = null;
  let health = null as Awaited<ReturnType<typeof getYachtHealthSummary>> | null;
  let openAlerts: Awaited<ReturnType<typeof getOpenAlerts>> = [];
  let scores = null as Awaited<ReturnType<typeof getYachtScores>> | null;
  let briefing = null as Awaited<ReturnType<typeof getLatestExecutiveBriefing>> | null;

  if (yacht) {
    const supabase = await createClient();
    const [summary, alerts, { data: lastJob }, yachtScores, latestBriefing] = await Promise.all([
      getYachtHealthSummary(yacht.id),
      getOpenAlerts(yacht.id),
      supabase
        .from("import_jobs")
        .select("created_at")
        .eq("yacht_id", yacht.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      getYachtScores(yacht.id),
      getLatestExecutiveBriefing(yacht.id),
    ]);
    health = summary;
    openAlerts = alerts;
    pointCount = summary.sensorsOnline + summary.sensorsOffline;
    lastImportAt = lastJob?.created_at ?? null;
    scores = yachtScores;
    briefing = latestBriefing;
  }

  const STATUS_CARDS = health
    ? [
        { label: "Sensors Online", value: health.sensorsOnline, icon: RadioTower },
        { label: "Sensors Offline", value: health.sensorsOffline, icon: Radio },
        { label: "Active Alerts", value: health.activeAlerts, icon: AlertTriangle },
        { label: "Critical Alerts", value: health.criticalAlerts, icon: OctagonAlert },
        {
          label: "Monitoring Coverage",
          value: health.monitoringCoveragePct != null ? `${health.monitoringCoveragePct}%` : "—",
          icon: PieChart,
        },
        { label: "Data Quality", value: health.dataQualityPct != null ? `${health.dataQualityPct}%` : "—", icon: Gauge },
      ]
    : [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {yacht ? `How healthy is ${yacht.name}'s indoor environment?` : "How healthy is the yacht's indoor environment?"}
        </p>
      </div>

      {!hasYachts && (
        <Alert>
          <Ship className="h-4 w-4" />
          <AlertTitle>Get started</AlertTitle>
          <AlertDescription>
            Create a yacht profile to begin monitoring — this is Step 1 of the setup workflow.{" "}
            <Link href="/yacht-profile" className="underline font-medium">
              Go to Yacht Profile
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Environmental Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <ScoreCard label="Overall Environmental Score" score={scores?.overall ?? null} band={scores?.overall != null ? scoreBand(scores.overall) : null} />
          <ScoreCard label="Comfort Index" score={scores?.comfort ?? null} band={scores?.comfort != null ? scoreBand(scores.comfort) : null} />
          <ScoreCard
            label="Biological Safety Index"
            score={scores?.biologicalSafety ?? null}
            band={scores?.biologicalSafety != null ? scoreBand(scores.biologicalSafety) : null}
          />
          <ScoreCard
            label="Mould Risk"
            score={scores?.mouldRisk ?? null}
            band={scores?.mouldRisk != null ? scoreBand(100 - scores.mouldRisk) : null}
            invertTone
          />
          <ScoreCard
            label="Luxury Perception Index"
            score={scores?.luxuryPerception ?? null}
            band={scores?.luxuryPerception != null ? scoreBand(scores.luxuryPerception) : null}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {scores?.pointsScored
            ? `Averaged across ${scores.pointsScored} monitoring point${scores.pointsScored === 1 ? "" : "s"} with data. `
            : ""}
          Environmental risk indicators, not laboratory diagnosis —{" "}
          <Link href="/risk" className="underline">
            see methodology
          </Link>
          .
        </p>
      </div>

      {health && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">System Status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {STATUS_CARDS.map((card) => (
              <Card key={card.label}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardDescription className="text-xs">{card.label}</CardDescription>
                  <card.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardHeader>
                <CardContent>
                  <span className="text-2xl font-semibold">{card.value}</span>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {pointCount} monitoring point{pointCount === 1 ? "" : "s"} · sensors considered offline after 48h
            without a reading.
          </p>
        </div>
      )}

      {yacht && <AlertsPanel yachtId={yacht.id} alerts={openAlerts} canManage={canManage} />}

      {briefing ? (
        <div className="space-y-2">
          <ExecutiveBriefingCard briefing={briefing} />
          <div className="flex items-center justify-between">
            <Link href="/ai-insights" className="text-xs text-muted-foreground underline">
              View all findings
            </Link>
            {canManage && yacht && <GenerateInsightsButton yachtId={yacht.id} />}
          </div>
        </div>
      ) : (
        <Card className="bg-sidebar text-sidebar-foreground border-sidebar-border">
          <CardHeader>
            <CardTitle className="text-sidebar-foreground">AI Environmental Briefing</CardTitle>
            <CardDescription className="text-sidebar-foreground/60">
              Activates once monitoring data has been imported for a yacht.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-sidebar-foreground/70">
              {lastImportAt
                ? "Monitoring data is available — generate the first environmental briefing from AI Insights."
                : hasYachts
                  ? "No monitoring data imported yet. Upload an AirCare export from Live / Monitoring to generate the first environmental briefing."
                  : "Create a yacht profile and import monitoring data to generate the first environmental briefing."}
            </p>
            {!hasYachts && (
              <Button asChild variant="secondary" size="sm" className="mt-3">
                <Link href="/yacht-profile">Create Yacht Profile</Link>
              </Button>
            )}
            {hasYachts && !lastImportAt && (
              <Button asChild variant="secondary" size="sm" className="mt-3">
                <Link href="/live">Import Data</Link>
              </Button>
            )}
            {hasYachts && lastImportAt && canManage && yacht && (
              <div className="mt-3">
                <GenerateInsightsButton yachtId={yacht.id} />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
