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
