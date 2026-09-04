import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient } from "@/lib/email/resend";

export type WeeklyReminderResult = { sent: number; failed: string[] };

/**
 * Emails every admin a nudge to log in and download the week's AirCare
 * export. Admin-only (not all roles) since download/reporting access is an
 * admin/technical responsibility; sent to every admin per company rather
 * than a single hardcoded address so it keeps working as users are added.
 */
export async function sendWeeklyDownloadReminders(): Promise<WeeklyReminderResult> {
  const supabase = createAdminClient();
  const { data: admins, error } = await supabase
    .from("app_users")
    .select("email, full_name")
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  if (!admins || admins.length === 0) return { sent: 0, failed: [] };

  const resend = getResendClient();
  const from = process.env.REMINDER_EMAIL_FROM ?? "AirCare Reminders <onboarding@resend.dev>";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

  let sent = 0;
  const failed: string[] = [];

  for (const admin of admins) {
    const { error: sendError } = await resend.emails.send({
      from,
      to: admin.email,
      subject: "Weekly reminder: download your AirCare environmental data",
      html: `
        <p>Hi${admin.full_name ? ` ${admin.full_name}` : ""},</p>
        <p>This is your weekly reminder to log in and download this week's AirCare
        environmental monitoring data.</p>
        ${appUrl ? `<p><a href="${appUrl}/reports">Open the dashboard</a></p>` : ""}
      `,
    });
    if (sendError) failed.push(admin.email);
    else sent++;
  }

  return { sent, failed };
}
