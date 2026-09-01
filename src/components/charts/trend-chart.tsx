"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { Reading } from "@/lib/parameters";

export function TrendChart({
  readings,
  unit,
  decimals,
  warningThreshold,
  criticalThreshold,
  preferredMin,
  preferredMax,
}: {
  readings: Reading[];
  unit: string;
  decimals: number;
  warningThreshold?: number | null;
  criticalThreshold?: number | null;
  preferredMin?: number | null;
  preferredMax?: number | null;
}) {
  if (readings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground border border-dashed rounded-lg">
        No readings in this period
      </div>
    );
  }

  const data = readings.map((r) => ({
    ts: new Date(r.timestamp).getTime(),
    value: r.value,
  }));

  const spanMs = data[data.length - 1].ts - data[0].ts;
  const formatTick = (ts: number) =>
    spanMs > 3 * 24 * 60 * 60 * 1000
      ? new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })
      : new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            formatter={(value) => [`${Number(value).toFixed(decimals)} ${unit}`, "Value"]}
          />
          {preferredMin != null && (
            <ReferenceLine y={preferredMin} stroke="var(--color-status-good)" strokeDasharray="4 4" strokeOpacity={0.6} />
          )}
          {preferredMax != null && (
            <ReferenceLine y={preferredMax} stroke="var(--color-status-good)" strokeDasharray="4 4" strokeOpacity={0.6} />
          )}
          {warningThreshold != null && (
            <ReferenceLine
              y={warningThreshold}
              stroke="var(--color-status-warning)"
              strokeDasharray="4 4"
              label={{ value: "Warning", position: "insideTopRight", fontSize: 10, fill: "var(--color-status-warning)" }}
            />
          )}
          {criticalThreshold != null && (
            <ReferenceLine
              y={criticalThreshold}
              stroke="var(--color-status-critical)"
              strokeDasharray="4 4"
              label={{ value: "Critical", position: "insideTopRight", fontSize: 10, fill: "var(--color-status-critical)" }}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            fill="url(#trendFill)"
            dot={data.length < 40}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
