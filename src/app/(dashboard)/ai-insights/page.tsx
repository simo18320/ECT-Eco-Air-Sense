import Link from "next/link";
import { Ship, Sparkles } from "lucide-react";
import { getYachtContext } from "@/lib/data/current-yacht";
import { getCurrentUser } from "@/lib/data/current-user";
import { getLatestExecutiveBriefing, getRecentInsights } from "@/lib/data/ai-insights";
import { GenerateInsightsButton } from "@/components/ai-insights/generate-button";
import { ExecutiveBriefingCard } from "@/components/ai-insights/executive-briefing-card";
import { InsightCard } from "@/components/ai-insights/insight-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export default async function AiInsightsPage() {
  const user = await getCurrentUser();
  const { yacht } = await getYachtContext();
  const canGenerate = user?.role === "admin" || user?.role === "technical";

  if (!yacht) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Ship className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No yacht yet</p>
            <Button asChild size="sm">
              <Link href="/yacht-profile">Create Yacht Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [briefing, insights] = await Promise.all([
    getLatestExecutiveBriefing(yacht.id),
    getRecentInsights(yacht.id),
  ]);

  const findings = insights
    .filter((i) => i.insight_type !== "executive_briefing")
    .sort((a, b) => (PRIORITY_ORDER[a.priority ?? "low"] ?? 3) - (PRIORITY_ORDER[b.priority ?? "low"] ?? 3));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Insights</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trend and anomaly interpretation for {yacht.name}, grounded strictly in imported monitoring data.
          </p>
        </div>
        {canGenerate && <GenerateInsightsButton yachtId={yacht.id} />}
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Decision support, not certification</AlertTitle>
        <AlertDescription>
          Every fact below traces to specific sensor readings. Interpretations are hedged reasoning, not confirmed
          causes — recommendations point to what to investigate, not a diagnosis.
        </AlertDescription>
      </Alert>

      {!briefing ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Sparkles className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No insights generated yet</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                {canGenerate
                  ? "Click Generate Insights above to analyze the last 14 days of monitoring data."
                  : "Ask an admin or technical user to generate insights."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <ExecutiveBriefingCard briefing={briefing} />

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Findings</h2>
            {findings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No specific findings this period — conditions are stable.</p>
            ) : (
              findings.map((f) => <InsightCard key={f.id} insight={f} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}
