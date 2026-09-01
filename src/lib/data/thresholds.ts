import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export async function getEffectiveThresholds(yachtId: string): Promise<Tables<"thresholds">[]> {
  const supabase = await createClient();

  const { data: yacht } = await supabase.from("yachts").select("company_id").eq("id", yachtId).single();
  if (!yacht) return [];

  const [{ data: companyThresholds }, { data: yachtThresholds }] = await Promise.all([
    supabase.from("thresholds").select("*").eq("company_id", yacht.company_id).is("yacht_id", null),
    supabase.from("thresholds").select("*").eq("yacht_id", yachtId),
  ]);

  const byParam = new Map<string, Tables<"thresholds">>();
  for (const t of companyThresholds ?? []) byParam.set(t.parameter, t);
  for (const t of yachtThresholds ?? []) byParam.set(t.parameter, t);

  return Array.from(byParam.values());
}
