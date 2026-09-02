import { createClient } from "@/lib/supabase/server";

export async function getUserYachtAccessMap(): Promise<Record<string, string[]>> {
  const supabase = await createClient();
  const { data } = await supabase.from("user_yacht_access").select("user_id, yacht_id");

  const map: Record<string, string[]> = {};
  for (const row of data ?? []) {
    (map[row.user_id] ??= []).push(row.yacht_id);
  }
  return map;
}
