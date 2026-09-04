"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/current-user";
import type { ActionState } from "@/lib/actions/action-state";
import type { Enums } from "@/types/database";

export async function updateMonitoringPoint(
  pointId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated.", success: false };
  if (user.role !== "admin" && user.role !== "technical") {
    return { error: "You do not have permission to edit monitoring points.", success: false };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required.", success: false };
  const roomLocation = String(formData.get("room_location") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "active") as Enums<"monitoring_point_status">;
  const code = String(formData.get("code") ?? "").trim() || null;

  const supabase = await createClient();

  if (code) {
    const { data: conflict } = await supabase
      .from("monitoring_points")
      .select("id")
      .eq("code", code)
      .neq("id", pointId)
      .maybeSingle();
    if (conflict) {
      return { error: "That sensor is already assigned to another monitoring point.", success: false };
    }
  }

  const { error } = await supabase
    .from("monitoring_points")
    .update({ name, room_location: roomLocation, status, active: status !== "inactive", code })
    .eq("id", pointId);

  if (error) return { error: error.message, success: false };

  const manufacturer = String(formData.get("manufacturer") ?? "").trim() || null;
  const model = String(formData.get("model") ?? "").trim() || null;
  const serialNumber = String(formData.get("serial_number") ?? "").trim() || null;
  const installationDate = String(formData.get("installation_date") ?? "").trim() || null;

  if (manufacturer || model || serialNumber || installationDate) {
    const { data: existingSensor } = await supabase
      .from("sensors")
      .select("id")
      .eq("monitoring_point_id", pointId)
      .limit(1)
      .maybeSingle();

    const sensorPayload = {
      monitoring_point_id: pointId,
      manufacturer,
      model,
      serial_number: serialNumber,
      installation_date: installationDate,
    };

    if (existingSensor) {
      await supabase.from("sensors").update(sensorPayload).eq("id", existingSensor.id);
    } else {
      await supabase.from("sensors").insert(sensorPayload);
    }
  }

  revalidatePath("/locations");
  revalidatePath("/live");
  return { error: null, success: true };
}

export async function createMonitoringPoint(
  yachtId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated.", success: false };
  if (user.role !== "admin" && user.role !== "technical") {
    return { error: "You do not have permission to add monitoring points.", success: false };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required.", success: false };
  const roomLocation = String(formData.get("room_location") ?? "").trim() || null;
  const code = String(formData.get("code") ?? "").trim() || null;

  const supabase = await createClient();

  if (code) {
    const { data: conflict } = await supabase
      .from("monitoring_points")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (conflict) {
      return { error: "That sensor is already assigned to another monitoring point.", success: false };
    }
  }

  const { error } = await supabase.from("monitoring_points").insert({
    yacht_id: yachtId,
    name,
    room_location: roomLocation,
    code,
    status: "active",
    active: true,
  });

  if (error) return { error: error.message, success: false };

  revalidatePath("/locations");
  revalidatePath("/live");
  return { error: null, success: true };
}
