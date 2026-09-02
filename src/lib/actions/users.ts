"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/current-user";
import type { Enums } from "@/types/database";

export async function updateUserRole(userId: string, role: Enums<"user_role">) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("Only admins can change user roles.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("app_users").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}

export async function updateUserYachtAccess(userId: string, yachtIds: string[]) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("Only admins can change yacht access.");
  }

  const supabase = await createClient();
  const { error: deleteError } = await supabase
    .from("user_yacht_access")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw new Error(deleteError.message);

  if (yachtIds.length > 0) {
    const { error: insertError } = await supabase
      .from("user_yacht_access")
      .insert(yachtIds.map((yachtId) => ({ user_id: userId, yacht_id: yachtId })));
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/settings");
}
