import { NextResponse, type NextRequest } from "next/server";
import { syncAircareData } from "@/lib/aircare/sync";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yachtId = process.env.AIRCARE_YACHT_ID;
  if (!yachtId) {
    return NextResponse.json({ error: "AIRCARE_YACHT_ID is not configured." }, { status: 500 });
  }

  try {
    const summary = await syncAircareData(yachtId, null);
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "AirCare sync failed." },
      { status: 500 },
    );
  }
}
