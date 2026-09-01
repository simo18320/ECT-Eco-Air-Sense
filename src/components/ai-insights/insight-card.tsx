import { TrendingUp, OctagonAlert, GitCompareArrows, Waves } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parameterMeta } from "@/lib/parameters";
import type { Tables } from "@/types/database";

const TYPE_ICON: Record<string, typeof TrendingUp> = {
  trend: TrendingUp,
  anomaly: OctagonAlert,
  comparison: GitCompareArrows,
  pattern: Waves,
};

const TYPE_LABEL: Record<string, string> = {
  trend: "Trend",
  anomaly: "Anomaly",
  comparison: "Comparison",
  pattern: "Pattern",
};

const CONFIDENCE_VARIANT: Record<string, "default" | "outline" | "secondary"> = {
  high: "default",
  medium: "outline",
  low: "secondary",
};

const PRIORITY_VARIANT: Record<string, "destructive" | "outline" | "secondary"> = {
  high: "destructive",
  medium: "outline",
  low: "secondary",
};

type Insight = Tables<"ai_insights"> & { monitoring_points: { name: string } | null };

export function InsightCard({ insight }: { insight: Insight }) {
  const Icon = TYPE_ICON[insight.insight_type] ?? TrendingUp;
  const parameter = (insight.source_data_ref as { parameter?: string } | null)?.parameter;

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">{TYPE_LABEL[insight.insight_type] ?? insight.insight_type}</span>
            {insight.monitoring_points && (
              <Badge variant="secondary" className="text-xs">
                {insight.monitoring_points.name}
              </Badge>
            )}
            {parameter && (
              <Badge variant="secondary" className="text-xs">
                {parameterMeta(parameter).label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {insight.priority && (
              <Badge variant={PRIORITY_VARIANT[insight.priority] ?? "outline"} className="text-xs capitalize">
                {insight.priority} priority
              </Badge>
            )}
            {insight.confidence_level && (
              <Badge variant={CONFIDENCE_VARIANT[insight.confidence_level] ?? "outline"} className="text-xs capitalize">
                {insight.confidence_level} confidence
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fact</span>
            <p>{insight.fact_text}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Interpretation</span>
            <p className="text-muted-foreground">{insight.interpretation_text}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recommendation</span>
            <p className="text-muted-foreground">{insight.recommendation_text}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
