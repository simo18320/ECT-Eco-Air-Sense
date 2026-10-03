import { getResendClient } from "@/lib/email/resend";
import { SILENT_AFTER_HOURS, type SensorSilence } from "@/lib/sensors/silence";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function formatUtc(iso: string) {
  return (
    new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC"
  );
}

/**
 * Emails the yacht's alert contact when sensors have stopped reporting.
 * Batched — one email per sync run listing every sensor that just went
 * silent — and only about sensors not already notified for this outage.
 */
export async function sendSilentSensorsEmail({
  to,
  yachtName,
  sensors,
  totalSensors,
}: {
  to: string;
  yachtName: string;
  sensors: SensorSilence[];
  totalSensors: number;
}): Promise<{ sent: boolean; error?: string }> {
  if (sensors.length === 0) return { sent: false };

  const resend = getResendClient();
  const from = process.env.REMINDER_EMAIL_FROM ?? "AirCare Reminders <onboarding@resend.dev>";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const name = escapeHtml(yachtName);

  const rows = sensors
    .map(
      (s) =>
        `<li><strong>${escapeHtml(s.pointName)}</strong> — last reading ${formatUtc(s.lastReadingAt)} (${Math.round(s.silentHours)} h ago)</li>`,
    )
    .join("");

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `${sensors.length} sensor${sensors.length === 1 ? "" : "s"} silent on ${yachtName}`,
    html: `
      <p><strong>${sensors.length} of ${totalSensors}</strong> sensors on <strong>${name}</strong> have not reported for more than ${SILENT_AFTER_HOURS} hours:</p>
      <ul>${rows}</ul>
      <p>Readings and alerts for these points are not updating. Typical causes are the gateway's power or internet connection on board, or a device that was switched off. Device status is also visible in the Ionex portal.</p>
      ${appUrl ? `<p><a href="${appUrl}/overview">Open the dashboard</a></p>` : ""}
      <p style="color:#6b6b6b;font-size:12px;">
        Automated notice from the environmental monitoring platform. You will not be notified again
        about these sensors until they have reported and then gone silent again.
      </p>
    `,
  });

  if (error) return { sent: false, error: error.message };
  return { sent: true };
}
