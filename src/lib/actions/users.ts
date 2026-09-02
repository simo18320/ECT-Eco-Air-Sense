"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/data/current-user";
import { ACTION_INITIAL_STATE, type ActionState } from "@/lib/actions/action-state";
import type { Enums } from "@/types/database";

export async function createUserAccount(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Only admins can create users.", success: false };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = String(formData.get("role") ?? "viewer") as Enums<"user_role">;

  if (!email || !password) {
    return { error: "Email and password are required.", success: false };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", success: false };
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || email },
  });
  if (createError || !created.user) {
    return { error: createError?.message ?? "Could not create the account.", success: false };
  }

  const { error: roleError } = await admin
    .from("app_users")
    .update({ role })
    .eq("id", created.user.id);
  if (roleError) {
    return { error: roleError.message, success: false };
  }

  revalidatePath("/settings");
  return { ...ACTION_INITIAL_STATE, success: true };
}

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
