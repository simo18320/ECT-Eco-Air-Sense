"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/current-user";
import { generateAndStoreInsights } from "@/lib/ai/generate";

export async function generateAiInsights(yachtId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");
  if (user.role !== "admin" && user.role !== "technical") {
    throw new Error("You do not have permission to generate AI insights.");
  }

  const supabase = await createClient();
  const result = await generateAndStoreInsights(supabase, yachtId);

  revalidatePath("/ai-insights");
  revalidatePath("/overview");
  return result;
}
