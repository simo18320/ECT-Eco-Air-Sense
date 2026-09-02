import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, LineChart as LineChartIcon } from "lucide-react";
import { getYachtContext } from "@/lib/data/current-yacht";
import { getMonitoringPoints, getLatestReadingsByYacht } from "@/lib/data/monitoring-points";
import { getReadingsForPoints, getPeriodComparison } from "@/lib/data/comparative";
import { resolvePeriod, parameterMeta, type PeriodKey } from "@/lib/data/point-stats";
import { ComparisonChart } from "@/components/charts/comparison-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Mode = "points" | "periods";

function hrefWith(base: string, current: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  const merged = { ...current, ...patch };
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string;
    parameter?: string;
    points?: string;
    period?: string;
    pointId?: string;
    days?: string;
  }>;
}) {
  const sp = await searchParams;
  const { yacht } = await getYachtContext();

  if (!yacht) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <LineChartIcon className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No yacht yet</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [points, latestReadings] = await Promise.all([
    getMonitoringPoints(yacht.id),
    getLatestReadingsByYacht(yacht.id),
  ]);
  const availableParameters = Array.from(new Set(latestReadings.map((r) => r.parameter)));

  if (points.length === 0 || availableParameters.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">Environmental trends and statistical analysis.</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Import monitoring data before running comparisons.
          </CardContent>
        </Card>
      </div>
    );
  }

  const mode: Mode = sp.mode === "periods" ? "periods" : "points";
  const parameter = sp.parameter && availableParameters.includes(sp.parameter) ? sp.parameter : availableParameters[0];
  const meta = parameterMeta(parameter);
  const baseParams = { mode: sp.mode, parameter: sp.parameter, points: sp.points, period: sp.period, pointId: sp.pointId, days: sp.days };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">Environmental trends and statistical analysis for {yacht.name}.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5 w-fit">
          <Link
            href={hrefWith("/analysis", baseParams, { mode: "points" })}
            className={cn(
              "rounded px-3 py-1.5 text-sm",
              mode === "points" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            Compare Points
          </Link>
          <Link
            href={hrefWith("/analysis", baseParams, { mode: "periods" })}
            className={cn(
              "rounded px-3 py-1.5 text-sm",
              mode === "periods" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            Compare Periods
          </Link>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {availableParameters.map((p) => {
            const m = parameterMeta(p);
            const active = p === parameter;
            return (
              <Link
                key={p}
                href={hrefWith("/analysis", baseParams, { parameter: p })}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm border",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {m.label}
              </Link>
            );
          })}
        </div>
      </div>

      {mode === "points" ? (
        <ComparePointsView points={points} parameter={parameter} meta={meta} sp={sp} baseParams={baseParams} />
      ) : (
        <ComparePeriodsView points={points} parameter={parameter} meta={meta} sp={sp} baseParams={baseParams} />
      )}
    </div>
  );
}

async function ComparePointsView({
  points,
  parameter,
  meta,
  sp,
  baseParams,
}: {
  points: Awaited<ReturnType<typeof getMonitoringPoints>>;
  parameter: string;
  meta: ReturnType<typeof parameterMeta>;
  sp: { points?: string; period?: string };
  baseParams: Record<string, string | undefined>;
}) {
  const selectedIds = sp.points ? sp.points.split(",").filter(Boolean) : points.slice(0, Math.min(2, points.length)).map((p) => p.id);
  const period = (sp.period as PeriodKey) ?? "7d";
  const { start, end, label } = resolvePeriod(period);

  const readingsByPoint = await getReadingsForPoints(selectedIds, parameter, start, end);
  const series = selectedIds.map((id) => ({
    id,
    label: points.find((p) => p.id === id)?.name ?? id,
    readings: readingsByPoint[id] ?? [],
  }));

  const PERIODS: PeriodKey[] = ["24h", "7d", "14d", "30d"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {points.map((point) => {
            const isSelected = selectedIds.includes(point.id);
            const nextIds = isSelected
              ? selectedIds.filter((id) => id !== point.id)
              : [...selectedIds, point.id];
            return (
              <Link
                key={point.id}
                href={hrefWith("/analysis", baseParams, { points: nextIds.join(",") || undefined })}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs border",
                  isSelected
                    ? "bg-secondary border-secondary-foreground/20 font-medium"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {point.name}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={hrefWith("/analysis", baseParams, { period: p })}
              className={cn(
                "rounded px-2.5 py-1 text-xs",
                period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {p}
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {meta.label} — {label}
          </CardTitle>
          <CardDescription>{selectedIds.length} point{selectedIds.length === 1 ? "" : "s"} selected</CardDescription>
        </CardHeader>
        <CardContent>
          <ComparisonChart series={series} unit={meta.unit} decimals={meta.decimals} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 font-medium">Point</th>
                <th className="pb-2 font-medium text-right">Avg</th>
                <th className="pb-2 font-medium text-right">Min</th>
                <th className="pb-2 font-medium text-right">Max</th>
              </tr>
            </thead>
            <tbody>
              {series.map((s) => {
                const values = s.readings.map((r) => r.value);
                const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
                const min = values.length ? Math.min(...values) : null;
                const max = values.length ? Math.max(...values) : null;
                return (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="py-2">{s.label}</td>
                    <td className="py-2 text-right tabular-nums">{avg != null ? avg.toFixed(meta.decimals) : "—"}</td>
                    <td className="py-2 text-right tabular-nums">{min != null ? min.toFixed(meta.decimals) : "—"}</td>
                    <td className="py-2 text-right tabular-nums">{max != null ? max.toFixed(meta.decimals) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

async function ComparePeriodsView({
  points,
  parameter,
  meta,
  sp,
  baseParams,
}: {
  points: Awaited<ReturnType<typeof getMonitoringPoints>>;
  parameter: string;
  meta: ReturnType<typeof parameterMeta>;
  sp: { pointId?: string; days?: string };
  baseParams: Record<string, string | undefined>;
}) {
  const pointId = sp.pointId && points.some((p) => p.id === sp.pointId) ? sp.pointId : points[0]?.id;
  const days = sp.days ? Number(sp.days) : 7;

  if (!pointId) return null;

  const comparison = await getPeriodComparison(pointId, parameter, days);
  const pointName = points.find((p) => p.id === pointId)?.name ?? pointId;

  const trend =
    comparison.pctChange == null ? null : comparison.pctChange > 2 ? "up" : comparison.pctChange < -2 ? "down" : "flat";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {points.map((point) => (
            <Link
              key={point.id}
              href={hrefWith("/analysis", baseParams, { pointId: point.id })}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs border",
                point.id === pointId
                  ? "bg-secondary border-secondary-foreground/20 font-medium"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {point.name}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          {[7, 14, 30].map((d) => (
            <Link
              key={d}
              href={hrefWith("/analysis", baseParams, { days: String(d) })}
              className={cn(
                "rounded px-2.5 py-1 text-xs",
                days === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {pointName} — {meta.label}
          </CardTitle>
          <CardDescription>
            Last {days} days vs previous {days} days
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground mb-2">Last {days} days</p>
              <p className="text-2xl font-semibold tabular-nums">
                {comparison.current.avg != null ? comparison.current.avg.toFixed(meta.decimals) : "—"}
                <span className="text-sm font-normal text-muted-foreground ml-1">{meta.unit}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                min {comparison.current.min?.toFixed(meta.decimals) ?? "—"} · max{" "}
                {comparison.current.max?.toFixed(meta.decimals) ?? "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground mb-2">Previous {days} days</p>
              <p className="text-2xl font-semibold tabular-nums text-muted-foreground">
                {comparison.previous.avg != null ? comparison.previous.avg.toFixed(meta.decimals) : "—"}
                <span className="text-sm font-normal ml-1">{meta.unit}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                min {comparison.previous.min?.toFixed(meta.decimals) ?? "—"} · max{" "}
                {comparison.previous.max?.toFixed(meta.decimals) ?? "—"}
              </p>
            </div>
          </div>

          {comparison.pctChange != null && (
            <div className="flex items-center gap-2">
              {trend === "up" && <TrendingUp className="h-4 w-4 text-status-warning" />}
              {trend === "down" && <TrendingDown className="h-4 w-4 text-status-good" />}
              {trend === "flat" && <Minus className="h-4 w-4 text-muted-foreground" />}
              <Badge variant="outline">
                {comparison.pctChange > 0 ? "+" : ""}
                {comparison.pctChange.toFixed(1)}% average change
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
