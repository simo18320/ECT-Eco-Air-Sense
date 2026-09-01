"use client";

import { useState } from "react";
import Image from "next/image";
import { Anchor, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NavLinks } from "./nav-links";
import { YachtSwitcher } from "./yacht-switcher";
import { signOut } from "@/lib/actions/auth";
import type { CurrentUser } from "@/lib/data/current-user";
import type { Tables } from "@/types/database";

const ROLE_LABEL: Record<CurrentUser["role"], string> = {
  admin: "Admin",
  technical: "Technical",
  captain: "Captain",
  viewer: "Viewer",
};

export function Header({
  user,
  captainMode,
  onToggleCaptainMode,
  yachts,
  selectedYachtId,
}: {
  user: CurrentUser;
  captainMode: boolean;
  onToggleCaptainMode: (value: boolean) => void;
  yachts: Tables<"yachts">[];
  selectedYachtId: string | null;
}) {
  const canToggleCaptainMode = user.role === "captain" || user.role === "admin";
  const initials = (user.fullName ?? user.email).slice(0, 2).toUpperCase();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-4 md:px-6 bg-card">
      <div className="flex items-center gap-3">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden -ml-2"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <SheetContent side="left" className="w-64 bg-sidebar text-sidebar-foreground p-0 border-sidebar-border">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
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
            <NavLinks captainMode={captainMode} onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        {user.companyLogoUrl ? (
          <Image
            src={user.companyLogoUrl}
            alt={user.companyName}
            width={28}
            height={28}
            className="rounded object-contain hidden sm:block"
          />
        ) : null}
        <span className="text-sm font-medium text-foreground/80 hidden sm:inline">
          {user.companyName}
        </span>
        <div className="hidden sm:block h-5 w-px bg-border mx-1" />
        <YachtSwitcher yachts={yachts} selectedYachtId={selectedYachtId} />
      </div>

      <div className="flex items-center gap-4">
        {canToggleCaptainMode && (
          <div className="flex items-center gap-2">
            <Label htmlFor="captain-mode" className="text-xs text-muted-foreground">
              Captain View
            </Label>
            <Switch id="captain-mode" checked={captainMode} onCheckedChange={onToggleCaptainMode} />
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-1">
              <span className="font-medium">{user.fullName ?? user.email}</span>
              <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
              <Badge variant="secondary" className="w-fit mt-1">
                {ROLE_LABEL[user.role]}
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={signOut} className="w-full">
                <button type="submit" className="w-full text-left">
                  Sign out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
