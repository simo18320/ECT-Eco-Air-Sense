import { createClient } from "@/lib/supabase/server";
import { PARAMETER_META, type Reading } from "@/lib/parameters";

export * from "@/lib/parameters";

/**
 * Which of the known parameters this point has ever reported. Checks each
 * parameter individually (limit 1) rather than fetching a capped batch of
 * raw rows and deduping client-side — a point with more than a few thousand
 * historical readings could have an arbitrary, unordered slice of rows that
 * happens to miss a parameter entirely, silently hiding its tab even though
 * the data exists (this is what was actually happening before).
 */
export async function getAvailableParameters(pointId: string): Promise<string[]> {
  const supabase = await createClient();
  const knownParameters = Object.keys(PARAMETER_META);

  const results = await Promise.all(
    knownParameters.map(async (parameter) => {
      const { data } = await supabase
        .from("measurements")
        .select("parameter")
        .eq("monitoring_point_id", pointId)
        .eq("parameter", parameter)
        .limit(1);
      return data && data.length > 0 ? parameter : null;
    }),
  );

  return results.filter((p): p is string => p !== null);
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
