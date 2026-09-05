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
  yachtId: string;
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

    const { data: yacht } = await supabase.from("yachts").select("company_id").eq("id", yachtId).single();

    const [{ data: points }, { data: companyPoints }] = await Promise.all([
      supabase.from("monitoring_points").select("id, code").eq("yacht_id", yachtId),
      yacht
        ? supabase
            .from("monitoring_points")
            .select("code, yachts!inner(company_id)")
            .eq("yachts.company_id", yacht.company_id)
            .not("code", "is", null)
        : Promise.resolve({ data: [] as { code: string | null }[] }),
    ]);
    const codeToPointId = new Map<string, string>();
    for (const p of points ?? []) {
      if (p.code) codeToPointId.set(p.code, p.id);
    }
    // Devices claimed by ANY yacht on the account — used so that a sensor
    // belonging to a different yacht isn't flagged as "unmatched" just
    // because it doesn't appear in *this* yacht's monitoring points.
    const claimedByAnyYacht = new Set(
      (companyPoints ?? [])
        .map((p) => p.code)
        .filter((c): c is string => !!c)
        .map((c) => c.replace(/ /g, "_")),
    );

    const unmatchedDevices = new Set<string>();
    const rows: TablesInsert<"measurements">[] = [];
    let skipped = 0;
    let dataQualityIssues = 0;

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
        dataQualityIssues++;
        continue;
      }
      const normalizedCode = reading.device.replace(/_/g, " ");
      const pointId = codeToPointId.get(normalizedCode);
      if (!pointId) {
        skipped++;
        if (!claimedByAnyYacht.has(reading.device)) {
          unmatchedDevices.add(reading.device);
          dataQualityIssues++;
        }
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

    if (unmatchedDevices.size > 0) {
      await supabase.from("import_errors").insert(
        [...unmatchedDevices].map((device) => ({
          import_job_id: job.id,
          error_type: "unmatched_device",
          message: `AirCare device "${device}" has no matching monitoring point on any yacht.`,
          raw_data: { device },
        })),
      );
    }

    await supabase
      .from("import_jobs")
      .update({
        status: dataQualityIssues > 0 ? "completed_with_errors" : "completed",
        records_imported: imported,
        records_rejected: skipped,
        parameters_detected: [...new Set(rows.map((r) => r.parameter))],
        monitoring_points_detected: codeToPointId.size,
      })
      .eq("id", job.id);

    await evaluateAlertsForYacht(supabase, yachtId);

    return {
      jobId: job.id,
      yachtId,
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

/**
 * AirCare is a single shared account: every yacht's sensors report to the
 * same `/last-data` feed, distinguished only by device code. Syncing "all
 * yachts" just means running the per-yacht sync (which already scopes
 * readings to that yacht's monitoring point codes) for every yacht on file,
 * so a new yacht's devices get picked up alongside existing ones without any
 * per-yacht cron configuration.
 */
export async function syncAircareDataForAllYachts(
  triggeredBy: string | null,
): Promise<AircareSyncSummary[]> {
  const supabase = createAdminClient();
  const { data: yachts, error } = await supabase.from("yachts").select("id");
  if (error) throw new Error(error.message);

  const summaries: AircareSyncSummary[] = [];
  for (const yacht of yachts ?? []) {
    summaries.push(await syncAircareData(yacht.id, triggeredBy));
  }
  return summaries;
}
