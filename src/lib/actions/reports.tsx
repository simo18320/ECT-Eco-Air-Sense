"use server";

import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/current-user";
import { buildReportSnapshot } from "@/lib/reports/snapshot";
import { ReportDocument } from "@/lib/reports/pdf-document";

export async function generateReport(yachtId: string, periodDays = 14) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");
  if (user.role !== "admin" && user.role !== "technical") {
    throw new Error("You do not have permission to generate reports.");
  }

  const supabase = await createClient();
  const snapshot = await buildReportSnapshot(yachtId, periodDays);

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .insert({
      yacht_id: yachtId,
      period_start: snapshot.meta.periodStart.slice(0, 10),
      period_end: snapshot.meta.periodEnd.slice(0, 10),
      generated_by: user.id,
      overall_score: snapshot.scores.overall,
      status: "draft",
    })
    .select("id")
    .single();
  if (reportError || !report) throw new Error(reportError?.message ?? "Could not create report.");

  const { error: snapshotError } = await supabase
    .from("report_snapshots")
    .insert({ report_id: report.id, json_snapshot: snapshot });
  if (snapshotError) throw new Error(snapshotError.message);

  // Render the PDF from the exact same frozen snapshot that was just persisted.
  const pdfBuffer = await renderToBuffer(<ReportDocument snapshot={snapshot} />);

  const path = `${user.companyId}/${yachtId}/reports/${report.id}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("yacht-files")
    .upload(path, pdfBuffer, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { error: finalizeError } = await supabase
    .from("reports")
    .update({ pdf_url: path, status: "final" })
    .eq("id", report.id);
  if (finalizeError) throw new Error(finalizeError.message);

  revalidatePath("/reports");
  return { reportId: report.id };
}

export async function getReportPdfSignedUrl(pdfPath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("yacht-files").createSignedUrl(pdfPath, 60 * 10);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
