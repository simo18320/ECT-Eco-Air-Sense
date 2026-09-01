import Link from "next/link";
import { Ship, ShieldAlert } from "lucide-react";
import { getYachtContext } from "@/lib/data/current-yacht";
import { getMonitoringPoints } from "@/lib/data/monitoring-points";
import { getYachtScores, getPointScores } from "@/lib/data/scoring";
import { getScoringWeights } from "@/lib/data/scoring-config";
import { scoreBand } from "@/lib/scoring/parameter-score";
import { ScoreCard } from "@/components/scoring/score-card";
import { ScoreDetailCard } from "@/components/scoring/score-detail-card";
import { ScientificDisclaimer } from "@/components/scoring/disclaimer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { MouldRiskResult } from "@/lib/scoring/mould-risk";
import type { ScoreResult } from "@/lib/scoring/types";

function mouldResultToScoreResult(result: MouldRiskResult): ScoreResult {
  const b = result.breakdown;
  return {
    score: result.score,
    band: result.band,
    explanation: result.explanation,
    breakdown: b
      ? [
          { parameter: "humidity", label: "Humidity component", value: b.humidityComponent, subScore: null, weight: 0 },
          { parameter: "temp_factor", label: "Temperature factor (x)", value: b.temperatureFactor, subScore: null, weight: 0 },
          {
            parameter: "dew_point",
            label: "Dew point gap (°C)",
            value: b.dewPointGapC,
            subScore: null,
            weight: 0,
          },
          { parameter: "dew_point_pts", label: "Condensation risk (+pts)", value: b.dewPointComponent, subScore: null, weight: 0 },
          { parameter: "persistence", label: "Sustained breach (+pts)", value: b.persistenceComponent, subScore: null, weight: 0 },
          { parameter: "tvoc_context", label: "TVOC context (+pts)", value: b.tvocContextComponent, subScore: null, weight: 0 },
        ]
      : [],
  };
}

function bandBadge(band: { label: string; tone: "good" | "warning" | "critical" } | null) {
  if (!band) return <Badge variant="outline">No data</Badge>;
  const variant = band.tone === "critical" ? "destructive" : band.tone === "warning" ? "outline" : "default";
  return <Badge variant={variant}>{band.label}</Badge>;
}

export default async function RiskPage({
  searchParams,
}: {
  searchParams: Promise<{ point?: string }>;
}) {
  const sp = await searchParams;
  const { yacht } = await getYachtContext();

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

  const points = await getMonitoringPoints(yacht.id);
  const activePoints = points.filter((p) => p.active);

  if (activePoints.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Risk</h1>
          <p className="text-sm text-muted-foreground mt-1">Mould risk and biological safety for {yacht.name}.</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <ShieldAlert className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No monitoring points yet</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const weights = await getScoringWeights(yacht.id);
  const [yachtScores, allPointScores] = await Promise.all([
    getYachtScores(yacht.id),
    Promise.all(activePoints.map(async (p) => ({ point: p, scores: await getPointScores(p.id, yacht.id, weights) }))),
  ]);

  const selectedId = sp.point && activePoints.some((p) => p.id === sp.point) ? sp.point : activePoints[0].id;
  const selected = allPointScores.find((r) => r.point.id === selectedId)!;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Risk</h1>
        <p className="text-sm text-muted-foreground mt-1">Mould risk and biological safety for {yacht.name}.</p>
      </div>

      <ScientificDisclaimer />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ScoreCard
          label="Mould Risk (yacht average)"
          score={yachtScores.mouldRisk}
          band={yachtScores.mouldRisk != null ? scoreBand(100 - yachtScores.mouldRisk) : null}
          invertTone
        />
        <ScoreCard
          label="Biological Safety (yacht average)"
          score={yachtScores.biologicalSafety}
          band={yachtScores.biologicalSafety != null ? scoreBand(yachtScores.biologicalSafety) : null}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Monitoring Point</CardTitle>
          <CardDescription>Select a point to see its full breakdown below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Point</TableHead>
                <TableHead>Mould Risk</TableHead>
                <TableHead>Biological Safety</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPointScores.map(({ point, scores }) => (
                <TableRow
                  key={point.id}
                  className={cn(point.id === selectedId && "bg-muted/60")}
                >
                  <TableCell>
                    <Link href={`/risk?point=${point.id}`} className="font-medium hover:underline">
                      {point.name}
                    </Link>
                  </TableCell>
                  <TableCell>{bandBadge(scores.mouldRisk.band)}</TableCell>
                  <TableCell>{bandBadge(scores.biologicalSafety.band)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">{selected.point.name}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ScoreDetailCard
            title="Mould Risk Index"
            result={mouldResultToScoreResult(selected.scores.mouldRisk)}
            invertTone
          />
          <ScoreDetailCard title="Biological Safety Index" result={selected.scores.biologicalSafety} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Methodology</CardTitle>
          <CardDescription>How these scores are calculated, and their limitations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-1">Mould Risk Index</h3>
            <p>
              Primarily moisture-driven: relative humidity is the main input, scored against the configured
              preferred/warning/critical bands (currently ≤60% preferred, &gt;70% warning, &gt;80% critical).
              Temperature acts as an aggravating factor — the humidity contribution is scaled down outside the
              20–30°C range where common indoor moulds grow fastest. A dew-point proximity check (Magnus
              formula) adds risk when air temperature sits close to the calculated dew point, since that
              indicates condensation risk. Sustained humidity breaches (same signal as the Alert Engine) add
              further risk, and TVOC contributes only a small, capped, contextual amount — it is never the
              primary driver. This is a risk indicator, not a mould detection or laboratory test.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">Biological Safety Index</h3>
            <p>
              A weighted blend of how favourable current humidity, temperature, CO2, TVOC, PM2.5 and PM10 levels
              are, each scored against its configured threshold band, then reduced for any currently sustained
              alerts on that point. It describes environmental conditions favourability only — it does not
              measure or confirm the presence or absence of any specific organism.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">Limitations</h3>
            <p>
              All thresholds are configurable in Settings and sourced from general indoor air quality guidance
              (ASHRAE, WELL Building Standard, WHO/EPA air quality breakpoints) — adjust them for your vessel's
              specific requirements and jurisdiction. Scores are recalculated from the latest available reading
              and the trailing 7-day history; they reflect what the sensors report, not a physical inspection.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
