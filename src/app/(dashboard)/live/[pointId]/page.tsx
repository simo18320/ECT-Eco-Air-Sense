import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getAvailableParameters,
  getReadings,
  computeStats,
  resolvePeriod,
  parameterMeta,
  type PeriodKey,
} from "@/lib/data/point-stats";
import { getEffectiveThresholds } from "@/lib/data/thresholds";
import { TrendChart } from "@/components/charts/trend-chart";
import { StatsGrid } from "@/components/charts/stats-grid";
import { ParameterTabs } from "@/components/charts/parameter-tabs";
import { PeriodSelector } from "@/components/charts/period-selector";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PointDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ pointId: string }>;
  searchParams: Promise<{ parameter?: string; period?: string; start?: string; end?: string }>;
}) {
  const { pointId } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: point } = await supabase
    .from("monitoring_points")
    .select("*")
    .eq("id", pointId)
    .single();

  if (!point) notFound();

  const availableParameters = await getAvailableParameters(pointId);
  if (availableParameters.length === 0) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <BackLink />
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No readings for {point.name} yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  const parameter = sp.parameter && availableParameters.includes(sp.parameter) ? sp.parameter : availableParameters[0];
  const period = (sp.period as PeriodKey) ?? "7d";
  const { start, end, label: periodLabel } = resolvePeriod(period, sp.start, sp.end);

  const [readings, thresholds] = await Promise.all([
    getReadings(pointId, parameter, start, end),
    getEffectiveThresholds(point.yacht_id),
  ]);

  const stats = computeStats(readings);
  const meta = parameterMeta(parameter);
  const threshold = thresholds.find((t) => t.parameter === parameter);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <BackLink />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            {point.name}
            {point.code && point.code !== point.name && (
              <span className="text-sm font-normal text-muted-foreground font-mono">{point.code}</span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {point.room_location ?? "Location not assigned"} · {periodLabel}
          </p>
        </div>
        <Badge variant={point.status === "active" ? "default" : "secondary"}>{point.status}</Badge>
      </div>

      <ParameterTabs parameters={availableParameters} current={parameter} />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-sm font-medium text-muted-foreground">
          {meta.label} ({meta.unit})
        </h2>
        <PeriodSelector current={period} />
      </div>

      <StatsGrid stats={stats} unit={meta.unit} decimals={meta.decimals} />

      <Card>
        <CardContent className="pt-6">
          <TrendChart
            readings={readings}
            unit={meta.unit}
            decimals={meta.decimals}
            warningThreshold={threshold?.warning_threshold}
            criticalThreshold={threshold?.critical_threshold}
            preferredMin={threshold?.preferred_min}
            preferredMax={threshold?.preferred_max}
          />
        </CardContent>
      </Card>

      {threshold && (
        <p className="text-xs text-muted-foreground">
          Preferred range {threshold.preferred_min ?? "—"}–{threshold.preferred_max ?? "—"} {meta.unit}, warning above{" "}
          {threshold.warning_threshold}, critical above {threshold.critical_threshold}. Source: {threshold.source_reference}.
        </p>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/live"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Live / Monitoring
    </Link>
  );
}
