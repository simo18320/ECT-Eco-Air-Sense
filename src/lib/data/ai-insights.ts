import { createClient } from "@/lib/supabase/server";

export async function getLatestExecutiveBriefing(yachtId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("yacht_id", yachtId)
    .eq("insight_type", "executive_briefing")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getRecentInsights(yachtId: string, limit = 30) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_insights")
    .select("*, monitoring_points(name)")
    .eq("yacht_id", yachtId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
