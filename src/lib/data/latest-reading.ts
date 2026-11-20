import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Timestamp of a point's newest reading (any parameter), or null if it never
 * reported. Asked point by point on purpose: one combined "newest N rows"
 * query is capped at 1000 rows by the API and would miss quiet points.
 *
 * Cached per request, so the health summary, the sensor-health card and the
 * silent-sensor banner on the same page share one query per point instead of
 * each running their own.
 */
export const getLatestReadingAt = cache(async (pointId: string): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("measurements")
    .select("timestamp")
    .eq("monitoring_point_id", pointId)
    .order("timestamp", { ascending: false })
    .limit(1);
  return data && data.length > 0 ? data[0].timestamp : null;
});
