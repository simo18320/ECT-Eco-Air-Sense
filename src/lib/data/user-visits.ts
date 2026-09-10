import { createClient } from "@/lib/supabase/server";

export type UserVisitStats = {
  userId: string;
  fullName: string | null;
  email: string;
  role: string;
  totalVisitDays: number;
  lastVisitDate: string | null;
};

/**
 * Per-user distinct-day visit counts for the admin "platform usage" view.
 * Relies on RLS (admins can select user_visit_log rows for their own
 * company) rather than an explicit company_id filter here, since the
 * regular authenticated client is used, not the admin client.
 */
export async function getUserVisitStats(companyId: string): Promise<UserVisitStats[]> {
  const supabase = await createClient();

  const [{ data: users }, { data: visits }] = await Promise.all([
    supabase.from("app_users").select("id, full_name, email, role").eq("company_id", companyId),
    supabase.from("user_visit_log").select("user_id, visit_date").eq("company_id", companyId),
  ]);

  const statsByUser = new Map<string, { count: number; last: string }>();
  for (const v of visits ?? []) {
    const existing = statsByUser.get(v.user_id);
    if (!existing) {
      statsByUser.set(v.user_id, { count: 1, last: v.visit_date });
    } else {
      existing.count += 1;
      if (v.visit_date > existing.last) existing.last = v.visit_date;
    }
  }

  return (users ?? [])
    .map((u) => {
      const stats = statsByUser.get(u.id);
      return {
        userId: u.id,
        fullName: u.full_name,
        email: u.email,
        role: u.role,
        totalVisitDays: stats?.count ?? 0,
        lastVisitDate: stats?.last ?? null,
      };
    })
    .sort((a, b) => b.totalVisitDays - a.totalVisitDays);
}
