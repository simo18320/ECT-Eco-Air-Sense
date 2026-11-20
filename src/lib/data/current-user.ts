import { cache } from "react";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: "admin" | "technical" | "captain" | "viewer";
  captainModeDefault: boolean;
  companyId: string;
  companyName: string;
  companyLogoUrl: string | null;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("app_users")
    .select("id, email, full_name, role, captain_mode_default, company_id, companies(name, logo_url)")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const company = Array.isArray(profile.companies) ? profile.companies[0] : profile.companies;

  // One row per user per day — "distinct visits", not raw page loads. RLS
  // restricts insert to the caller's own user_id, so this is safe to run
  // with the regular authenticated client. The request is sent now (while
  // the request's cookies are still readable) but nothing waits for it:
  // `after` only keeps the function alive until it lands, so tracking no
  // longer adds a round trip to every page. Never let a tracking hiccup
  // break the page: log and move on.
  const visitLogged = Promise.resolve(
    supabase
      .from("user_visit_log")
      .upsert(
        {
          user_id: profile.id,
          company_id: profile.company_id,
          visit_date: new Date().toISOString().slice(0, 10),
        },
        { onConflict: "user_id,visit_date", ignoreDuplicates: true },
      )
      .then(
        ({ error }) => {
          if (error) console.error("Failed to log platform visit:", error.message);
        },
        (err: unknown) => console.error("Failed to log platform visit:", err),
      ),
  );
  after(() => visitLogged);

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    captainModeDefault: profile.captain_mode_default,
    companyId: profile.company_id,
    companyName: company?.name ?? "Eco Cleaning Technologies",
    companyLogoUrl: company?.logo_url ?? null,
  };
});
