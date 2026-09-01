"use client";

import { Anchor } from "lucide-react";
import { NavLinks } from "./nav-links";

export function Sidebar({ captainMode }: { captainMode: boolean }) {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent shrink-0">
          <Anchor className="h-4 w-4 text-accent-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight leading-tight">
          Environmental
          <br />
          Monitoring
        </span>
      </div>

      <NavLinks captainMode={captainMode} />

      {captainMode && (
        <div className="px-4 py-3 border-t border-sidebar-border text-xs text-sidebar-foreground/50">
          Captain View — simplified
        </div>
      )}
    </aside>
  );
}
