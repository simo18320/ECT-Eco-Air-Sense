"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/data/current-user";
import { syncAircareData, type AircareSyncSummary } from "@/lib/aircare/sync";

export async function syncAircareNow(yachtId: string): Promise<AircareSyncSummary> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");
  if (user.role !== "admin" && user.role !== "technical") {
    throw new Error("You do not have permission to sync data.");
  }

  const summary = await syncAircareData(yachtId, user.id);
  revalidatePath("/live");
  revalidatePath("/locations");
  revalidatePath("/overview");
  revalidatePath("/risk");
  return summary;
}
