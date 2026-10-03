import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { sendSilentSensorsEmail } from "@/lib/email/silent-sensors";
import { inspectSensors } from "./silence";

/**
 * Run right after a live sync. Emails about sensors that just went silent,
 * once per outage: `silence_notified_at` is set after a successful send and
 * cleared when the sensor reports again, so the next outage notifies anew.
 * It is only set when an email actually went out, so configuring the alert
 * address later still reports sensors that are silent at that point.
 * Never throws — a notification problem must not fail the sync.
 */
export async function notifyNewlySilentSensors(supabase: SupabaseClient<Database>, yachtId: string): Promise<void> {
  try {
    const [{ data: yacht }, sensors] = await Promise.all([
      supabase.from("yachts").select("name, alert_notification_email").eq("id", yachtId).single(),
      inspectSensors(supabase, yachtId, new Date()),
    ]);

    const recoveredIds = sensors.filter((s) => !s.isSilent && s.notifiedAt).map((s) => s.pointId);
    if (recoveredIds.length > 0) {
      await supabase.from("monitoring_points").update({ silence_notified_at: null }).in("id", recoveredIds);
    }

    const newlySilent = sensors.filter((s) => s.isSilent && !s.notifiedAt);
    if (newlySilent.length === 0 || !yacht?.alert_notification_email) return;

    const result = await sendSilentSensorsEmail({
      to: yacht.alert_notification_email,
      yachtName: yacht.name,
      sensors: newlySilent,
      totalSensors: sensors.length,
    });
    if (!result.sent) {
      console.error("Failed to send silent sensors email:", result.error);
      return;
    }

    await supabase
      .from("monitoring_points")
      .update({ silence_notified_at: new Date().toISOString() })
      .in("id", newlySilent.map((s) => s.pointId));
  } catch (err) {
    console.error("Silent sensor check failed:", err);
  }
}
