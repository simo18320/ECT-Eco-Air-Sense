"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/current-user";
import { evaluateAlertsForYacht } from "@/lib/alerts/evaluate";

export async function reEvaluateAlerts(yachtId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");

  const supabase = await createClient();
  const result = await evaluateAlertsForYacht(supabase, yachtId);

  revalidatePath("/overview");
  revalidatePath("/live");
  revalidatePath("/risk");
  return result;
}

export async function acknowledgeAlert(alertId: string) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "technical")) {
    throw new Error("You do not have permission to acknowledge alerts.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("alerts")
    .update({ status: "acknowledged" })
    .eq("id", alertId);
  if (error) throw new Error(error.message);

  revalidatePath("/overview");
  revalidatePath("/live");
}
