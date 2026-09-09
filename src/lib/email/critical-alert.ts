import { parameterMeta } from "@/lib/parameters";
import { getResendClient } from "@/lib/email/resend";

export type CriticalAlertItem = {
  pointName: string;
  parameter: string;
  value: number | null;
};

/**
 * Emails the yacht's configured alert contact when a NEW critical alert
 * opens (called once per evaluateAlertsForYacht run, batched — never one
 * email per alert, so several alerts opening in the same sync don't flood
 * the inbox). Critical only, not warning: kept narrow on purpose so this
 * stays trustworthy as an "act now" signal rather than routine noise.
 */
export async function sendCriticalAlertEmail({
  to,
  yachtName,
  alerts,
}: {
  to: string;
  yachtName: string;
  alerts: CriticalAlertItem[];
}): Promise<{ sent: boolean; error?: string }> {
  if (alerts.length === 0) return { sent: false };

  const resend = getResendClient();
  const from = process.env.REMINDER_EMAIL_FROM ?? "AirCare Reminders <onboarding@resend.dev>";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

  const rows = alerts
    .map((a) => {
      const meta = parameterMeta(a.parameter);
      const value = a.value != null ? `${a.value.toFixed(meta.decimals)} ${meta.unit}` : "no reading";
      return `<li><strong>${a.pointName}</strong> — ${meta.label}: ${value}</li>`;
    })
    .join("");

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Critical alert on ${yachtName}`,
    html: `
      <p>A new critical environmental alert has opened on <strong>${yachtName}</strong>:</p>
      <ul>${rows}</ul>
      ${appUrl ? `<p><a href="${appUrl}/live">Open the dashboard</a></p>` : ""}
      <p style="color:#6b6b6b;font-size:12px;">
        This is an automated environmental monitoring alert, not a certified safety notification.
        Verify conditions on board.
      </p>
    `,
  });

  if (error) return { sent: false, error: error.message };
  return { sent: true };
}
