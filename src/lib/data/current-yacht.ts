import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

const COOKIE_NAME = "selected_yacht_id";

export type YachtContext = {
  yacht: Tables<"yachts"> | null;
  allYachts: Tables<"yachts">[];
};

export const getYachtContext = cache(async (): Promise<YachtContext> => {
  const supabase = await createClient();
  const { data: allYachts } = await supabase
    .from("yachts")
    .select("*")
    .order("created_at", { ascending: true });

  const yachts = allYachts ?? [];
  if (yachts.length === 0) return { yacht: null, allYachts: [] };

  const cookieStore = await cookies();
  const selectedId = cookieStore.get(COOKIE_NAME)?.value;
  const selected = yachts.find((y) => y.id === selectedId);

  return { yacht: selected ?? yachts[0], allYachts: yachts };
});
