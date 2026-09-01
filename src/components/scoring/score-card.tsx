import { CheckCircle2, AlertTriangle, OctagonAlert, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONE_ICON = { good: CheckCircle2, warning: AlertTriangle, critical: OctagonAlert } as const;
const TONE_COLOR = {
  good: "text-status-good",
  warning: "text-status-warning",
  critical: "text-status-critical",
} as const;

export function ScoreCard({
  label,
  score,
  band,
  invertTone = false,
}: {
  label: string;
  score: number | null;
  band: { label: string; tone: "good" | "warning" | "critical" } | null;
  /** Mould Risk: high score = bad, so its tone semantics are inverted vs. the other indices. */
  invertTone?: boolean;
}) {
  const tone = band?.tone;
  const Icon = tone ? TONE_ICON[tone] : HelpCircle;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4 shrink-0", tone ? TONE_COLOR[tone] : "text-muted-foreground")} />
            <span className="text-2xl font-semibold">{score ?? <span className="text-muted-foreground text-base">—</span>}</span>
          </div>
          <Badge variant={tone ? "outline" : "outline"} className="text-xs">
            {band?.label ?? "No data yet"}
          </Badge>
        </div>
        {invertTone && score != null && (
          <p className="text-[10px] text-muted-foreground mt-1">Higher = more risk</p>
        )}
      </CardContent>
    </Card>
  );
}
