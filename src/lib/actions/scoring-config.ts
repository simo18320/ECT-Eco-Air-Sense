"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/current-user";
import type { ActionState } from "@/lib/actions/action-state";
import type { Enums } from "@/types/database";

export async function updateScoringWeights(
  configType: Enums<"scoring_config_type">,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated.", success: false };
  if (user.role !== "admin") {
    return { error: "Only admins can edit scoring weights.", success: false };
  }

  const weights: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    // React encodes internal action-reference metadata (e.g. "$ACTION_ID_1") into the same
    // FormData as the form's own fields — skip anything that isn't one of ours.
    if (key.startsWith("$")) continue;
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) {
      return { error: `Weight for "${key}" must be a non-negative number.`, success: false };
    }
    weights[key] = num / 100;
  }

  if (Object.values(weights).every((w) => w === 0)) {
    return { error: "At least one weight must be greater than zero.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("scoring_configurations")
    .update({ weights })
    .eq("company_id", user.companyId)
    .is("yacht_id", null)
    .eq("config_type", configType);

  if (error) return { error: error.message, success: false };

  revalidatePath("/settings");
  revalidatePath("/overview");
  revalidatePath("/risk");
  revalidatePath("/yacht-plan");
  return { error: null, success: true };
}
