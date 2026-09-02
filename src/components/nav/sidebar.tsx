"use client";

import Image from "next/image";
import { NavLinks } from "./nav-links";

export function Sidebar({ captainMode }: { captainMode: boolean }) {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
        <div className="flex h-8 px-1.5 items-center justify-center rounded-md bg-white shrink-0">
          <Image src="/logo.png" alt="Eco Air Sense" width={64} height={34} className="h-5 w-auto object-contain" />
        </div>
        <span className="text-sm font-semibold tracking-tight leading-tight">
          Monitoring Platform
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
