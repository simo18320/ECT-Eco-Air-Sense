import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/types/database";

const PRIORITY_VARIANT: Record<string, "destructive" | "outline" | "secondary"> = {
  high: "destructive",
  medium: "outline",
  low: "secondary",
};

export function ExecutiveBriefingCard({ briefing }: { briefing: Tables<"ai_insights"> }) {
  const meta = briefing.source_data_ref as { engine?: string; mainRisk?: string; fallbackReason?: string } | null;
  const isFallback = meta?.engine === "rule_based_fallback";
  // Older briefings have no reason stored; only a missing key means "not configured".
  const fallbackNote =
    meta?.fallbackReason && meta.fallbackReason !== "ANTHROPIC_API_KEY is not set"
      ? " · rule-based summary (the AI model could not be reached)"
      : " · rule-based summary (no AI model configured yet)";

  return (
    <Card className="bg-sidebar text-sidebar-foreground border-sidebar-border">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sidebar-foreground">AI Environmental Briefing</CardTitle>
          <div className="flex items-center gap-2">
            {briefing.priority && (
              <Badge variant={PRIORITY_VARIANT[briefing.priority] ?? "outline"} className="capitalize">
                {briefing.priority} priority
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-sidebar-foreground/60">
          {new Date(briefing.created_at).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {isFallback && fallbackNote}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <span className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wide">Overall Status</span>
          <p className="text-sidebar-foreground/90">{briefing.fact_text}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wide">Key Finding</span>
          <p className="text-sidebar-foreground/90">{briefing.interpretation_text}</p>
        </div>
        {meta?.mainRisk && (
          <div>
            <span className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wide">Main Risk</span>
            <p className="text-sidebar-foreground/90">{meta.mainRisk}</p>
          </div>
        )}
        <div>
          <span className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wide">Recommended Action</span>
          <p className="text-sidebar-foreground/90">{briefing.recommendation_text}</p>
        </div>
      </CardContent>
    </Card>
  );
}
