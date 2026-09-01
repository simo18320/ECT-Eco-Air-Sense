import { createClient } from "@/lib/supabase/server";
import { computeStats, type Reading, type Stats } from "@/lib/data/point-stats";

export async function getReadingsForPoints(
  pointIds: string[],
  parameter: string,
  start: Date,
  end: Date,
): Promise<Record<string, Reading[]>> {
  if (pointIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("measurements")
    .select("monitoring_point_id, timestamp, value")
    .in("monitoring_point_id", pointIds)
    .eq("parameter", parameter)
    .gte("timestamp", start.toISOString())
    .lte("timestamp", end.toISOString())
    .order("timestamp", { ascending: true })
    .limit(20000);

  const byPoint: Record<string, Reading[]> = Object.fromEntries(pointIds.map((id) => [id, []]));
  for (const row of data ?? []) {
    byPoint[row.monitoring_point_id]?.push({ timestamp: row.timestamp, value: row.value });
  }
  return byPoint;
}

export type PeriodComparison = {
  current: Stats;
  previous: Stats;
  pctChange: number | null;
  currentRange: { start: Date; end: Date };
  previousRange: { start: Date; end: Date };
};

export async function getPeriodComparison(
  pointId: string,
  parameter: string,
  periodDays: number,
): Promise<PeriodComparison> {
  const supabase = await createClient();
  const now = new Date();
  const currentStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const previousEnd = currentStart;
  const previousStart = new Date(currentStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const { data } = await supabase
    .from("measurements")
    .select("timestamp, value")
    .eq("monitoring_point_id", pointId)
    .eq("parameter", parameter)
    .gte("timestamp", previousStart.toISOString())
    .lte("timestamp", now.toISOString())
    .order("timestamp", { ascending: true })
    .limit(20000);

  const rows = data ?? [];
  const currentReadings = rows.filter((r) => new Date(r.timestamp) >= currentStart);
  const previousReadings = rows.filter(
    (r) => new Date(r.timestamp) >= previousStart && new Date(r.timestamp) < previousEnd,
  );

  const current = computeStats(currentReadings);
  const previous = computeStats(previousReadings);
  const pctChange =
    current.avg != null && previous.avg != null && previous.avg !== 0
      ? ((current.avg - previous.avg) / Math.abs(previous.avg)) * 100
      : null;

  return {
    current,
    previous,
    pctChange,
    currentRange: { start: currentStart, end: now },
    previousRange: { start: previousStart, end: previousEnd },
  };
}
