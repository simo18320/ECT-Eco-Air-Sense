import { NextResponse, type NextRequest } from "next/server";
import { sendWeeklyDownloadReminders } from "@/lib/email/weekly-reminder";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendWeeklyDownloadReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to send reminder emails." },
      { status: 500 },
    );
  }
}
