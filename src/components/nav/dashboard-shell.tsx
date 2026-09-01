"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import type { CurrentUser } from "@/lib/data/current-user";
import type { Tables } from "@/types/database";

export function DashboardShell({
  user,
  yachts,
  selectedYachtId,
  children,
}: {
  user: CurrentUser;
  yachts: Tables<"yachts">[];
  selectedYachtId: string | null;
  children: React.ReactNode;
}) {
  const [captainMode, setCaptainMode] = useState(
    user.role === "captain" ? user.captainModeDefault || true : false,
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar captainMode={captainMode} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          captainMode={captainMode}
          onToggleCaptainMode={setCaptainMode}
          yachts={yachts}
          selectedYachtId={selectedYachtId}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
