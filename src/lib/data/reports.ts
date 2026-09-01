import { createClient } from "@/lib/supabase/server";
import type { ReportSnapshot } from "@/lib/reports/types";

export async function getReportArchive(yachtId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("*, app_users(full_name, email)")
    .eq("yacht_id", yachtId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getReportWithSnapshot(reportId: string) {
  const supabase = await createClient();
  const { data: report } = await supabase.from("reports").select("*").eq("id", reportId).single();
  if (!report) return null;

  const { data: snapshotRow } = await supabase
    .from("report_snapshots")
    .select("json_snapshot")
    .eq("report_id", reportId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { report, snapshot: (snapshotRow?.json_snapshot as ReportSnapshot) ?? null };
}
