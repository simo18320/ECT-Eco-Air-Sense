"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/current-user";
import { parseAircareWorkbook } from "@/lib/import/aircare-xlsx";
import { evaluateAlertsForYacht } from "@/lib/alerts/evaluate";
import type { TablesInsert } from "@/types/database";

export type ImportActionState = {
  error: string | null;
  success: boolean;
  summary: {
    jobId: string;
    recordsImported: number;
    recordsRejected: number;
    monitoringPointsDetected: number;
    newMonitoringPoints: string[];
    parametersDetected: string[];
    dateRangeStart: string | null;
    dateRangeEnd: string | null;
    skippedSheets: { name: string; reason: string }[];
  } | null;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function importAircareFile(
  yachtId: string,
  _prevState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated.", success: false, summary: null };
  if (user.role !== "admin" && user.role !== "technical") {
    return { error: "You do not have permission to import data.", success: false, summary: null };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "Select a file to import.", success: false, summary: null };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "File is larger than 25MB.", success: false, summary: null };
  }
  const isXlsx =
    file.name.toLowerCase().endsWith(".xlsx") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (!isXlsx) {
    return {
      error: "Only .xlsx exports are supported right now. CSV/XLS support is planned — ask if you need it sooner.",
      success: false,
      summary: null,
    };
  }

  const supabase = await createClient();

  const { data: yacht } = await supabase.from("yachts").select("id").eq("id", yachtId).single();
  if (!yacht) return { error: "Yacht not found.", success: false, summary: null };

  let parsed;
  try {
    const buffer = await file.arrayBuffer();
    parsed = await parseAircareWorkbook(buffer);
  } catch (err) {
    return {
      error: `Could not read this file as an AirCare export: ${err instanceof Error ? err.message : String(err)}`,
      success: false,
      summary: null,
    };
  }

  if (parsed.rows.length === 0) {
    return {
      error: "No valid data rows found in this file. Check it's an unmodified AirCare/Ionex export.",
      success: false,
      summary: null,
    };
  }

  const { data: job, error: jobError } = await supabase
    .from("import_jobs")
    .insert({
      yacht_id: yachtId,
      uploaded_by: user.id,
      file_name: file.name,
      file_type: "xlsx",
      status: "processing",
      mapping_profile: parsed.mappingUsed,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return { error: jobError?.message ?? "Could not create import job.", success: false, summary: null };
  }

  // Resolve monitoring points: match existing by code, create new ones for unseen codes.
  const { data: existingPoints } = await supabase
    .from("monitoring_points")
    .select("id, code")
    .eq("yacht_id", yachtId);

  const codeToPointId = new Map<string, string>();
  for (const p of existingPoints ?? []) {
    if (p.code) codeToPointId.set(p.code, p.id);
  }

  const newCodes = parsed.pointCodes.filter((c) => !codeToPointId.has(c));
  if (newCodes.length > 0) {
    const inserts: TablesInsert<"monitoring_points">[] = newCodes.map((code) => ({
      yacht_id: yachtId,
      code,
      name: code,
      status: "active",
      active: true,
    }));
    const { data: created, error: createError } = await supabase
      .from("monitoring_points")
      .insert(inserts)
      .select("id, code");

    if (createError) {
      await supabase
        .from("import_jobs")
        .update({ status: "failed" })
        .eq("id", job.id);
      return { error: `Could not create monitoring points: ${createError.message}`, success: false, summary: null };
    }
    for (const p of created ?? []) {
      if (p.code) codeToPointId.set(p.code, p.id);
    }
  }

  // Insert measurements in batches, upserting on the (point, parameter, timestamp) uniqueness
  // so re-uploading an overlapping week updates values rather than erroring.
  const measurementRows: TablesInsert<"measurements">[] = parsed.rows.map((r) => ({
    monitoring_point_id: codeToPointId.get(r.pointCode)!,
    "timestamp": r.timestamp.toISOString(),
    parameter: r.parameter,
    value: r.value,
    unit: r.unit || null,
    import_job_id: job.id,
  }));

  const BATCH_SIZE = 500;
  let imported = 0;
  const insertErrors: string[] = [];
  for (let i = 0; i < measurementRows.length; i += BATCH_SIZE) {
    const batch = measurementRows.slice(i, i + BATCH_SIZE);
    const { error, count } = await supabase
      .from("measurements")
      .upsert(batch, { onConflict: "monitoring_point_id,parameter,timestamp", count: "exact" });
    if (error) {
      insertErrors.push(error.message);
    } else {
      imported += count ?? batch.length;
    }
  }

  if (parsed.rejected.length > 0) {
    const errorRows = parsed.rejected.map((r) => ({
      import_job_id: job.id,
      row_number: r.rowNumber,
      error_type: r.errorType,
      raw_data: {
        sheet: r.sheetName,
        data: r.raw.data == null ? null : String(r.raw.data),
        valore: r.raw.valore == null ? null : String(r.raw.valore),
      },
      message: r.message,
    }));
    await supabase.from("import_errors").insert(errorRows);
  }

  const finalStatus =
    insertErrors.length > 0
      ? "failed"
      : parsed.rejected.length > 0
        ? "completed_with_errors"
        : "completed";

  await supabase
    .from("import_jobs")
    .update({
      status: finalStatus,
      records_imported: imported,
      records_rejected: parsed.rejected.length,
      date_range_start: parsed.dateRangeStart?.toISOString() ?? null,
      date_range_end: parsed.dateRangeEnd?.toISOString() ?? null,
      parameters_detected: parsed.parametersDetected,
      monitoring_points_detected: parsed.pointCodes.length,
    })
    .eq("id", job.id);

  if (insertErrors.length === 0) {
    await evaluateAlertsForYacht(supabase, yachtId);
  }

  revalidatePath("/live");
  revalidatePath("/locations");
  revalidatePath("/overview");
  revalidatePath("/risk");

  if (insertErrors.length > 0) {
    return {
      error: `Import partially failed while writing measurements: ${insertErrors[0]}`,
      success: false,
      summary: null,
    };
  }

  return {
    error: null,
    success: true,
    summary: {
      jobId: job.id,
      recordsImported: imported,
      recordsRejected: parsed.rejected.length,
      monitoringPointsDetected: parsed.pointCodes.length,
      newMonitoringPoints: newCodes,
      parametersDetected: parsed.parametersDetected,
      dateRangeStart: parsed.dateRangeStart?.toISOString() ?? null,
      dateRangeEnd: parsed.dateRangeEnd?.toISOString() ?? null,
      skippedSheets: parsed.skippedSheets,
    },
  };
}
