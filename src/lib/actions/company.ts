"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/current-user";
import type { ActionState as CompanyActionState } from "@/lib/actions/action-state";

export type { ActionState as CompanyActionState } from "@/lib/actions/action-state";

export async function updateCompanyLogo(
  _prevState: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated.", success: false };
  if (user.role !== "admin") {
    return { error: "Only admins can update company branding.", success: false };
  }

  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) {
    return { error: "Select a logo file to upload.", success: false };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Logo must be an image file.", success: false };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { error: "Logo must be smaller than 2MB.", success: false };
  }

  const supabase = await createClient();
  const ext = file.name.split(".").pop();
  const path = `${user.companyId}/branding/logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("public-assets")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message, success: false };

  const { data: publicUrl } = supabase.storage.from("public-assets").getPublicUrl(path);
  const logoUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("companies")
    .update({ logo_url: logoUrl })
    .eq("id", user.companyId);

  if (updateError) return { error: updateError.message, success: false };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { error: null, success: true };
}

export async function updateCompanyName(
  _prevState: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated.", success: false };
  if (user.role !== "admin") {
    return { error: "Only admins can update company branding.", success: false };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Company name is required.", success: false };

  const supabase = await createClient();
  const { error } = await supabase.from("companies").update({ name }).eq("id", user.companyId);
  if (error) return { error: error.message, success: false };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { error: null, success: true };
}
