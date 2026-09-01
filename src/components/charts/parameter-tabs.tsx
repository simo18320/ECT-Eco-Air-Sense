"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { parameterMeta } from "@/lib/parameters";

export function ParameterTabs({
  parameters,
  current,
}: {
  parameters: string[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParameter(parameter: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("parameter", parameter);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {parameters.map((p) => {
        const meta = parameterMeta(p);
        const active = p === current;
        return (
          <button
            key={p}
            onClick={() => setParameter(p)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm border transition-colors",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
