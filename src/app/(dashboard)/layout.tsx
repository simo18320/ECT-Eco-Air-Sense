import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/current-user";
import { getYachtContext } from "@/lib/data/current-yacht";
import { DashboardShell } from "@/components/nav/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { yacht, allYachts } = await getYachtContext();

  return (
    <DashboardShell user={user} yachts={allYachts} selectedYachtId={yacht?.id ?? null}>
      {children}
    </DashboardShell>
  );
}
