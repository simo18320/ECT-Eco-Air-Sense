import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getReportWithSnapshot } from "@/lib/data/reports";
import { getReportPdfSignedUrl } from "@/lib/actions/reports";
import { DownloadPdfButton } from "@/components/reports/download-pdf-button";
import { ScientificDisclaimer } from "@/components/scoring/disclaimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PARAM_LABELS: Record<string, string> = {
  temperature: "Temperature",
  relative_humidity: "Relative Humidity",
  co2: "CO2",
  tvoc: "TVOC",
  pm2_5: "PM2.5",
  pm10: "PM10",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const result = await getReportWithSnapshot(reportId);
  if (!result || !result.snapshot) notFound();

  const { report, snapshot } = result;
  const pdfHref = report.pdf_url ? await getReportPdfSignedUrl(report.pdf_url) : null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Reports
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {snapshot.yacht.name} — Environmental Monitoring Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {fmtDate(snapshot.meta.periodStart)} – {fmtDate(snapshot.meta.periodEnd)} · Generated{" "}
            {fmtDate(snapshot.meta.generatedAt)} by {snapshot.meta.generatedByName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={report.status === "final" ? "default" : "secondary"}>{report.status}</Badge>
          {pdfHref && <DownloadPdfButton href={pdfHref} />}
        </div>
      </div>

      <ScientificDisclaimer />

      {/* 1. Executive Summary */}
      {snapshot.aiInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Executive Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Overall Status: </span>
              {snapshot.aiInsights.overallStatus}
            </p>
            <p>
              <span className="font-medium">Key Finding: </span>
              {snapshot.aiInsights.keyFinding}
            </p>
            <p>
              <span className="font-medium">Main Risk: </span>
              {snapshot.aiInsights.mainRisk}
            </p>
            <p>
              <span className="font-medium">Recommended Action: </span>
              {snapshot.aiInsights.recommendedAction}
            </p>
            <Badge variant="outline" className="capitalize">
              {snapshot.aiInsights.priority} priority
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* 3. Yacht Information + 4. Coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Yacht Information & Coverage</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <div className="flex justify-between border-b border-border py-1">
            <span className="text-muted-foreground">Shipyard</span>
            <span>{snapshot.yacht.shipyard ?? "—"}</span>
          </div>
          <div className="flex justify-between border-b border-border py-1">
            <span className="text-muted-foreground">Type</span>
            <span>{snapshot.yacht.yachtType ?? "—"}</span>
          </div>
          <div className="flex justify-between border-b border-border py-1">
            <span className="text-muted-foreground">Monitoring Points</span>
            <span>{snapshot.coverage.totalPoints}</span>
          </div>
          <div className="flex justify-between border-b border-border py-1">
            <span className="text-muted-foreground">Monitoring Coverage</span>
            <span>{snapshot.coverage.monitoringCoveragePct ?? "—"}%</span>
          </div>
          <div className="flex justify-between border-b border-border py-1">
            <span className="text-muted-foreground">Data Quality</span>
            <span>{snapshot.coverage.dataQualityPct ?? "—"}%</span>
          </div>
          <div className="flex justify-between border-b border-border py-1">
            <span className="text-muted-foreground">Monitoring Provider</span>
            <span>{snapshot.yacht.monitoringProvider ?? "—"}</span>
          </div>
        </CardContent>
      </Card>

      {/* 5. Environmental Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environmental Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Overall", value: snapshot.scores.overall },
              { label: "Comfort", value: snapshot.scores.comfort },
              { label: "Bio Safety", value: snapshot.scores.biologicalSafety },
              { label: "Mould Risk", value: snapshot.scores.mouldRisk },
              { label: "Luxury", value: snapshot.scores.luxuryPerception },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border p-3 text-center">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-xl font-semibold">{s.value ?? "—"}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 6-10. Parameter Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parameter Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(["temperature", "relative_humidity", "co2", "tvoc", "pm2_5", "pm10"] as const).map((parameter) => {
            const rows = snapshot.dataSummary.points
              .map((p) => ({ point: p, param: p.parameters.find((pp) => pp.parameter === parameter) }))
              .filter((r) => r.param);
            if (rows.length === 0) return null;
            return (
              <div key={parameter}>
                <h3 className="text-sm font-medium mb-2">{PARAM_LABELS[parameter]}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Point</TableHead>
                      <TableHead>Avg</TableHead>
                      <TableHead>Min</TableHead>
                      <TableHead>Max</TableHead>
                      <TableHead>Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.point.pointId}>
                        <TableCell>{r.point.pointName}</TableCell>
                        <TableCell>{r.param!.avg}</TableCell>
                        <TableCell>{r.param!.min}</TableCell>
                        <TableCell>{r.param!.max}</TableCell>
                        <TableCell className="capitalize">
                          {r.param!.trendDirection}
                          {r.param!.trendChangePct != null ? ` (${r.param!.trendChangePct > 0 ? "+" : ""}${r.param!.trendChangePct}%)` : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 16. Monitoring Point Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monitoring Point Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Point</TableHead>
                <TableHead>Overall</TableHead>
                <TableHead>Comfort</TableHead>
                <TableHead>Bio Safety</TableHead>
                <TableHead>Mould Risk</TableHead>
                <TableHead>Luxury</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.pointScores.map((p) => (
                <TableRow key={p.pointId}>
                  <TableCell className="font-medium">{p.pointName}</TableCell>
                  <TableCell>{p.overall ?? "—"}</TableCell>
                  <TableCell>{p.comfort ?? "—"}</TableCell>
                  <TableCell>{p.biologicalSafety ?? "—"}</TableCell>
                  <TableCell>{p.mouldRisk ?? "—"}</TableCell>
                  <TableCell>{p.luxuryPerception ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 15. Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alerts & Anomalies</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshot.dataSummary.openAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sustained alerts open during this reporting period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Point</TableHead>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.dataSummary.openAlerts.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>{a.pointName}</TableCell>
                    <TableCell>{PARAM_LABELS[a.parameter] ?? a.parameter}</TableCell>
                    <TableCell className="capitalize">{a.severity}</TableCell>
                    <TableCell>{a.currentValue?.toFixed(1) ?? "—"}</TableCell>
                    <TableCell>{a.durationHours}h</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 18. AI Interpretation */}
      {snapshot.aiInsights && snapshot.aiInsights.findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Interpretation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.aiInsights.findings.map((f, i) => (
              <div key={i} className="border-b border-border pb-3 last:border-0 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="capitalize">
                    {f.insightType}
                  </Badge>
                  {f.pointName && <span className="text-xs text-muted-foreground">{f.pointName}</span>}
                  <Badge variant="outline" className="text-xs capitalize ml-auto">
                    {f.confidenceLevel} confidence
                  </Badge>
                </div>
                <p>
                  <span className="font-medium">Fact: </span>
                  {f.fact}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Interpretation: </span>
                  {f.interpretation}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Recommendation: </span>
                  {f.recommendation}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 21. Methodology & Conclusion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Methodology & Limitations</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Comfort, Biological Safety and Luxury Perception indices are weighted blends of parameter readings
            scored against configured threshold bands. Mould Risk Index is primarily humidity-driven with
            temperature as an aggravating factor, a dew-point proximity check, sustained-breach persistence, and
            TVOC as a minor contextual signal only. All weights and thresholds are configurable in Settings.
          </p>
          <p>
            This report does not replace microbiological laboratory analysis, HVAC engineering assessment,
            Legionella risk assessment, professional mould inspection, or other professional environmental
            investigation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
