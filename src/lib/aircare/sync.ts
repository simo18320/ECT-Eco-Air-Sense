import { createAdminClient } from "@/lib/supabase/admin";
import { aircareLogin, aircareGetLastData } from "@/lib/aircare/client";
import { evaluateAlertsForYacht } from "@/lib/alerts/evaluate";
import type { TablesInsert } from "@/types/database";

/**
 * AirCare resource -> our parameter names. Sound/Light/Battery/Check_Dati
 * aren't part of the current scoring model, so readings for them are
 * skipped rather than stored unused.
 */
const RESOURCE_TO_PARAMETER: Record<string, string> = {
  Temperature: "temperature",
  Humidity: "relative_humidity",
  Co2: "co2",
  VOC: "tvoc",
  PM25: "pm2_5",
  PM10: "pm10",
};

export type AircareSyncSummary = {
  jobId: string;
  recordsFetched: number;
  recordsImported: number;
  recordsSkipped: number;
  unmatchedDevices: string[];
};

export async function syncAircareData(
  yachtId: string,
  triggeredBy: string | null,
): Promise<AircareSyncSummary> {
  const supabase = createAdminClient();

  const { data: job, error: jobError } = await supabase
    .from("import_jobs")
    .insert({
      yacht_id: yachtId,
      uploaded_by: triggeredBy,
      file_name: "AirCare WS Ent live sync",
      file_type: "aircare_api",
      status: "processing",
    })
    .select("id")
    .single();
  if (jobError || !job) throw new Error(jobError?.message ?? "Could not create sync job.");

  try {
    const token = await aircareLogin();
    const readings = await aircareGetLastData(token);

    const { data: points } = await supabase
      .from("monitoring_points")
      .select("id, code")
      .eq("yacht_id", yachtId);
    const codeToPointId = new Map<string, string>();
    for (const p of points ?? []) {
      if (p.code) codeToPointId.set(p.code, p.id);
    }

    const unmatchedDevices = new Set<string>();
    const rows: TablesInsert<"measurements">[] = [];
    let skipped = 0;

    for (const reading of readings) {
      const parameter = RESOURCE_TO_PARAMETER[reading.resource];
      if (!parameter) {
        skipped++;
        continue;
      }
      // severity "UNKNOWN" means the sensor didn't report (e.g. comms error) —
      // AirCare sends the record anyway with value: null, nothing to store.
      if (typeof reading.value !== "number" || Number.isNaN(reading.value)) {
        skipped++;
        continue;
      }
      const normalizedCode = reading.device.replace(/_/g, " ");
      const pointId = codeToPointId.get(normalizedCode);
      if (!pointId) {
        unmatchedDevices.add(reading.device);
        skipped++;
        continue;
      }
      rows.push({
        monitoring_point_id: pointId,
        parameter,
        value: reading.value,
        unit: reading.um || null,
        timestamp: new Date(reading.checktime * 1000).toISOString(),
        import_job_id: job.id,
      });
    }

    const BATCH_SIZE = 500;
    let imported = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error, count } = await supabase
        .from("measurements")
        .upsert(batch, { onConflict: "monitoring_point_id,parameter,timestamp", count: "exact" });
      if (error) throw new Error(error.message);
      imported += count ?? batch.length;
    }

    await supabase
      .from("import_jobs")
      .update({
        status: "completed",
        records_imported: imported,
        records_rejected: skipped,
        parameters_detected: [...new Set(rows.map((r) => r.parameter))],
        monitoring_points_detected: codeToPointId.size,
      })
      .eq("id", job.id);

    await evaluateAlertsForYacht(supabase, yachtId);

    return {
      jobId: job.id,
      recordsFetched: readings.length,
      recordsImported: imported,
      recordsSkipped: skipped,
      unmatchedDevices: [...unmatchedDevices],
    };
  } catch (err) {
    await supabase.from("import_jobs").update({ status: "failed" }).eq("id", job.id);
    throw err;
  }
}
