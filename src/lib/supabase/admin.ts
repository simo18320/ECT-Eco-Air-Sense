import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role client — bypasses RLS entirely. Server-only, never import from
 * client code. Used for admin actions the anon/authenticated client can't do
 * on its own, like creating a user account without an email round-trip.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
