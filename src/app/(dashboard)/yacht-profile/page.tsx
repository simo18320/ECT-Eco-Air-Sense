import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/current-user";
import { YachtList } from "@/components/yachts/yacht-list";
import { redirect } from "next/navigation";

export default async function YachtProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: yachts } = await supabase
    .from("yachts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <YachtList
        yachts={yachts ?? []}
        canEdit={user.role === "admin" || user.role === "technical"}
      />
    </div>
  );
}
