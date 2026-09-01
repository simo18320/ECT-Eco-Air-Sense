"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { PeriodKey } from "@/lib/parameters";

const OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "14d", label: "14d" },
  { key: "30d", label: "30d" },
];

export function PeriodSelector({ current }: { current: PeriodKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setPeriod(period: PeriodKey, start?: string, end?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    if (start) params.set("start", start);
    else params.delete("start");
    if (end) params.set("end", end);
    else params.delete("end");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
      {OPTIONS.map((opt) => (
        <Button
          key={opt.key}
          size="sm"
          variant={current === opt.key ? "default" : "ghost"}
          className="h-7 px-2.5 text-xs"
          onClick={() => setPeriod(opt.key)}
        >
          {opt.label}
        </Button>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant={current === "custom" ? "default" : "ghost"}
            className={cn("h-7 px-2.5 text-xs")}
          >
            Custom
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-3" align="end">
          <CustomRangeForm onApply={(start, end) => setPeriod("custom", start, end)} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CustomRangeForm({ onApply }: { onApply: (start: string, end: string) => void }) {
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const start = (form.elements.namedItem("start") as HTMLInputElement).value;
        const end = (form.elements.namedItem("end") as HTMLInputElement).value;
        if (start && end) onApply(new Date(start).toISOString(), new Date(end).toISOString());
      }}
    >
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Start</label>
        <Input name="start" type="datetime-local" required className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">End</label>
        <Input name="end" type="datetime-local" required className="h-8 text-sm" />
      </div>
      <Button type="submit" size="sm" className="w-full h-7 text-xs">
        Apply
      </Button>
    </form>
  );
}
