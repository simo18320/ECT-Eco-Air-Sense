import { createClient } from "@/lib/supabase/server";
import type { Reading } from "@/lib/parameters";

export * from "@/lib/parameters";

export async function getAvailableParameters(pointId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("measurements")
    .select("parameter")
    .eq("monitoring_point_id", pointId)
    .limit(5000);

  return Array.from(new Set((data ?? []).map((r) => r.parameter)));
}

export async function getReadings(
  pointId: string,
  parameter: string,
  start: Date,
  end: Date,
): Promise<Reading[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("measurements")
    .select("timestamp, value")
    .eq("monitoring_point_id", pointId)
    .eq("parameter", parameter)
    .gte("timestamp", start.toISOString())
    .lte("timestamp", end.toISOString())
    .order("timestamp", { ascending: true })
    .limit(10000);

  return data ?? [];
}
