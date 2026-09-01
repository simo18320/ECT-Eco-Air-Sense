import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type { Stats } from "@/lib/data/point-stats";

export function StatsGrid({ stats, unit, decimals }: { stats: Stats; unit: string; decimals: number }) {
  const fmt = (v: number | null) => (v == null ? "—" : `${v.toFixed(decimals)}`);

  const cards: { label: string; value: number | null; custom?: string }[] = [
    { label: "Current", value: stats.current },
    { label: "Minimum", value: stats.min },
    { label: "Maximum", value: stats.max },
    { label: "Average", value: stats.avg },
    { label: "Median", value: stats.median },
    { label: "P10 / P90", value: null, custom: `${fmt(stats.p10)} / ${fmt(stats.p90)}` },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="pb-1 px-3 pt-3">
            <CardDescription className="text-xs">{c.label}</CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <span className="text-lg font-semibold tabular-nums">
              {c.custom ?? fmt(c.value)}
              {!c.custom && c.value != null && (
                <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
              )}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
