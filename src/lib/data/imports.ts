import { createClient } from "@/lib/supabase/server";

export async function getImportHistory(yachtId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("import_jobs")
    .select("*, app_users(full_name, email)")
    .eq("yacht_id", yachtId)
    .order("created_at", { ascending: false })
    .limit(20);

  return data ?? [];
}
