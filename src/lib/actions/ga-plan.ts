"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/current-user";
import type { ActionState } from "@/lib/actions/action-state";

function requireManager(role: string | undefined) {
  if (role !== "admin" && role !== "technical") {
    throw new Error("You do not have permission to edit the GA Plan.");
  }
}

export async function createDeck(yachtId: string, name: string, deckOrder: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");
  requireManager(user.role);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decks")
    .insert({ yacht_id: yachtId, name, deck_order: deckOrder })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/yacht-plan");
  return data.id;
}

export async function uploadGaPlanImage(
  deckId: string,
  yachtId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated.", success: false };
  if (user.role !== "admin" && user.role !== "technical") {
    return { error: "You do not have permission to upload the GA Plan.", success: false };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Select an image file.", success: false };
  if (!file.type.startsWith("image/")) return { error: "GA Plan must be an image (PNG/JPG).", success: false };
  if (file.size > 15 * 1024 * 1024) return { error: "File must be smaller than 15MB.", success: false };

  const supabase = await createClient();
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${user.companyId}/${yachtId}/ga-plans/${deckId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("yacht-files")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) return { error: uploadError.message, success: false };

  const { error: insertError } = await supabase.from("ga_plans").insert({
    yacht_id: yachtId,
    deck_id: deckId,
    file_url: path, // storage path, not a public URL — resolved to a signed URL on read (private bucket)
    file_type: file.type,
    page_number: 1,
  });
  if (insertError) return { error: insertError.message, success: false };

  revalidatePath("/yacht-plan");
  return { error: null, success: true };
}

export async function createMonitoringPointForPlan(yachtId: string, name: string, code: string | null) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");
  requireManager(user.role);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monitoring_points")
    .insert({ yacht_id: yachtId, name, code: code || null, status: "active", active: true })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/yacht-plan");
  revalidatePath("/locations");
  return data.id;
}

export async function placePin(gaPlanId: string, monitoringPointId: string, x: number, y: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");
  requireManager(user.role);

  const supabase = await createClient();
  const { error } = await supabase
    .from("ga_plan_pins")
    .upsert(
      { ga_plan_id: gaPlanId, monitoring_point_id: monitoringPointId, x_coord: x, y_coord: y },
      { onConflict: "ga_plan_id,monitoring_point_id" },
    );
  if (error) throw new Error(error.message);

  revalidatePath("/yacht-plan");
}

export async function movePin(pinId: string, x: number, y: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");
  requireManager(user.role);

  const supabase = await createClient();
  const { error } = await supabase.from("ga_plan_pins").update({ x_coord: x, y_coord: y }).eq("id", pinId);
  if (error) throw new Error(error.message);

  revalidatePath("/yacht-plan");
}

export async function deletePin(pinId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");
  requireManager(user.role);

  const supabase = await createClient();
  const { error } = await supabase.from("ga_plan_pins").delete().eq("id", pinId);
  if (error) throw new Error(error.message);

  revalidatePath("/yacht-plan");
}
