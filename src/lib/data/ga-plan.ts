import { createClient } from "@/lib/supabase/server";

export async function getDecks(yachtId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("decks")
    .select("*")
    .eq("yacht_id", yachtId)
    .order("deck_order", { ascending: false });
  return data ?? [];
}

export async function getGaPlanForDeck(deckId: string) {
  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("ga_plans")
    .select("*")
    .eq("deck_id", deckId)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) return null;

  const { data: signed } = await supabase.storage
    .from("yacht-files")
    .createSignedUrl(plan.file_url, 60 * 60);

  return { ...plan, signedUrl: signed?.signedUrl ?? null };
}

export async function getPinsForGaPlan(gaPlanId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ga_plan_pins")
    .select("*, monitoring_points(id, name, code, room_location, status)")
    .eq("ga_plan_id", gaPlanId);
  return data ?? [];
}

export async function getUnpinnedMonitoringPoints(yachtId: string, gaPlanId: string) {
  const supabase = await createClient();
  const { data: allPoints } = await supabase
    .from("monitoring_points")
    .select("id, name, code")
    .eq("yacht_id", yachtId)
    .order("code", { ascending: true });

  const { data: pinned } = await supabase
    .from("ga_plan_pins")
    .select("monitoring_point_id")
    .eq("ga_plan_id", gaPlanId);

  const pinnedIds = new Set((pinned ?? []).map((p) => p.monitoring_point_id));
  return (allPoints ?? []).filter((p) => !pinnedIds.has(p.id));
}
