import { CheckCircle2, AlertTriangle, OctagonAlert, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ScoreResult } from "@/lib/scoring/types";

const TONE_ICON = { good: CheckCircle2, warning: AlertTriangle, critical: OctagonAlert } as const;
const TONE_COLOR = {
  good: "text-status-good",
  warning: "text-status-warning",
  critical: "text-status-critical",
} as const;

export function ScoreDetailCard({
  title,
  result,
  invertTone = false,
}: {
  title: string;
  result: ScoreResult;
  invertTone?: boolean;
}) {
  const tone = result.band?.tone;
  const Icon = tone ? TONE_ICON[tone] : HelpCircle;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="outline">{result.band?.label ?? "No data"}</Badge>
        </div>
        {invertTone && result.score != null && (
          <CardDescription className="text-[10px]">Higher score = more risk</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Icon className={cn("h-6 w-6 shrink-0", tone ? TONE_COLOR[tone] : "text-muted-foreground")} />
          <span className="text-3xl font-semibold tabular-nums">{result.score ?? "—"}</span>
          <span className="text-sm text-muted-foreground">/ 100</span>
        </div>

        <p className="text-sm text-muted-foreground">{result.explanation}</p>

        {result.breakdown.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border">
            {result.breakdown.map((b) => (
              <div key={b.parameter} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground capitalize">{b.label}</span>
                <span className="tabular-nums">
                  {b.value != null ? b.value.toFixed(1) : "—"}
                  {b.subScore != null && (
                    <span className="text-muted-foreground ml-2">({Math.round(b.subScore)}/100)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
