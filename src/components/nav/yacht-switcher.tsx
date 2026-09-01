"use client";

import { useTransition } from "react";
import { ChevronsUpDown, Ship, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setSelectedYacht } from "@/lib/actions/yacht-selection";
import type { Tables } from "@/types/database";

export function YachtSwitcher({
  yachts,
  selectedYachtId,
}: {
  yachts: Tables<"yachts">[];
  selectedYachtId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const selected = yachts.find((y) => y.id === selectedYachtId);

  if (yachts.length === 0) return null;

  if (yachts.length === 1) {
    return (
      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
        <Ship className="h-4 w-4 text-muted-foreground" />
        {yachts[0].name}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-foreground/80 hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Ship className="h-4 w-4 text-muted-foreground" />
        {selected?.name ?? "Select yacht"}
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {yachts.map((y) => (
          <DropdownMenuItem
            key={y.id}
            onClick={() => startTransition(() => setSelectedYacht(y.id))}
            className="flex items-center justify-between"
          >
            {y.name}
            {y.id === selectedYachtId && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
