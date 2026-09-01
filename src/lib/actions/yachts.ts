"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/current-user";
import type { TablesInsert } from "@/types/database";

export type YachtActionState = {
  error: string | null;
  success: boolean;
};

function readYachtFormData(formData: FormData, companyId: string): TablesInsert<"yachts"> {
  const num = (key: string) => {
    const v = formData.get(key);
    return v && String(v).trim() !== "" ? Number(v) : null;
  };
  const str = (key: string) => {
    const v = formData.get(key);
    return v && String(v).trim() !== "" ? String(v) : null;
  };

  return {
    company_id: companyId,
    name: String(formData.get("name") ?? "").trim(),
    shipyard: str("shipyard"),
    yacht_type: str("yacht_type"),
    imo_number: str("imo_number"),
    flag: str("flag"),
    build_year: num("build_year"),
    length_m: num("length_m"),
    gross_tonnage: num("gross_tonnage"),
    owner_name: str("owner_name"),
    management_company: str("management_company"),
    captain_name: str("captain_name"),
    monitoring_start_date: str("monitoring_start_date"),
    monitoring_end_date: str("monitoring_end_date"),
    monitoring_frequency: str("monitoring_frequency"),
    monitoring_provider: str("monitoring_provider") ?? "AirCare / Ionex",
  };
}

export async function createYacht(
  _prevState: YachtActionState,
  formData: FormData,
): Promise<YachtActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated.", success: false };
  if (user.role !== "admin" && user.role !== "technical") {
    return { error: "You do not have permission to create yachts.", success: false };
  }

  const payload = readYachtFormData(formData, user.companyId);
  if (!payload.name) return { error: "Yacht name is required.", success: false };

  const supabase = await createClient();
  const { error } = await supabase.from("yachts").insert(payload);

  if (error) return { error: error.message, success: false };

  revalidatePath("/yacht-profile");
  return { error: null, success: true };
}

export async function updateYacht(
  yachtId: string,
  _prevState: YachtActionState,
  formData: FormData,
): Promise<YachtActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated.", success: false };
  if (user.role !== "admin" && user.role !== "technical") {
    return { error: "You do not have permission to edit yachts.", success: false };
  }

  const payload = readYachtFormData(formData, user.companyId);
  if (!payload.name) return { error: "Yacht name is required.", success: false };

  const supabase = await createClient();
  const { error } = await supabase.from("yachts").update(payload).eq("id", yachtId);

  if (error) return { error: error.message, success: false };

  revalidatePath("/yacht-profile");
  return { error: null, success: true };
}

export async function deleteYacht(yachtId: string) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "technical")) {
    throw new Error("You do not have permission to delete yachts.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("yachts").delete().eq("id", yachtId);
  if (error) throw new Error(error.message);

  revalidatePath("/yacht-profile");
}
