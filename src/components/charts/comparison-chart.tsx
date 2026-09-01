"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { Reading } from "@/lib/parameters";

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export function ComparisonChart({
  series,
  unit,
  decimals,
}: {
  series: { id: string; label: string; readings: Reading[] }[];
  unit: string;
  decimals: number;
}) {
  const timestamps = new Set<number>();
  for (const s of series) for (const r of s.readings) timestamps.add(new Date(r.timestamp).getTime());
  const sortedTs = Array.from(timestamps).sort((a, b) => a - b);

  if (sortedTs.length === 0) {
    return (
      <div className="flex items-center justify-center h-72 text-sm text-muted-foreground border border-dashed rounded-lg">
        No readings in this period
      </div>
    );
  }

  const valueByPointAndTs = new Map<string, Map<number, number>>();
  for (const s of series) {
    const m = new Map<number, number>();
    for (const r of s.readings) m.set(new Date(r.timestamp).getTime(), r.value);
    valueByPointAndTs.set(s.id, m);
  }

  const data = sortedTs.map((ts) => {
    const row: Record<string, number> = { ts };
    for (const s of series) {
      const v = valueByPointAndTs.get(s.id)?.get(ts);
      if (v != null) row[s.id] = v;
    }
    return row;
  });

  const spanMs = sortedTs[sortedTs.length - 1] - sortedTs[0];
  const formatTick = (ts: number) =>
    spanMs > 3 * 24 * 60 * 60 * 1000
      ? new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })
      : new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
          <XAxis
            dataKey="ts"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatTick}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
          />
          <YAxis
            width={40}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(ts) => new Date(ts as number).toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC"}
            formatter={(value, name) => [`${Number(value).toFixed(decimals)} ${unit}`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.id}
              name={s.label}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
