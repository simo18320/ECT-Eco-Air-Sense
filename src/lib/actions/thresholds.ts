"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/current-user";
import type { ActionState } from "@/lib/actions/action-state";

function num(formData: FormData, key: string): number | null {
  const v = formData.get(key);
  if (v == null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export async function upsertYachtThreshold(
  yachtId: string,
  parameter: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated.", success: false };
  if (user.role !== "admin" && user.role !== "technical") {
    return { error: "You do not have permission to edit thresholds.", success: false };
  }

  const persistenceMinutes = num(formData, "persistence_minutes");
  if (persistenceMinutes == null || persistenceMinutes < 0) {
    return { error: "Persistence (minutes) must be a non-negative number.", success: false };
  }

  const payload = {
    yacht_id: yachtId,
    parameter,
    preferred_min: num(formData, "preferred_min"),
    preferred_max: num(formData, "preferred_max"),
    warning_threshold: num(formData, "warning_threshold"),
    critical_threshold: num(formData, "critical_threshold"),
    persistence_minutes: persistenceMinutes,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("thresholds")
    .select("id")
    .eq("yacht_id", yachtId)
    .eq("parameter", parameter)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("thresholds").update(payload).eq("id", existing.id)
    : await supabase.from("thresholds").insert(payload);

  if (error) return { error: error.message, success: false };

  revalidatePath("/settings");
  revalidatePath("/overview");
  revalidatePath("/risk");
  return { error: null, success: true };
}

export async function deleteYachtThresholdOverride(thresholdId: string) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "technical")) {
    throw new Error("You do not have permission to edit thresholds.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("thresholds").delete().eq("id", thresholdId);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/overview");
  revalidatePath("/risk");
}
