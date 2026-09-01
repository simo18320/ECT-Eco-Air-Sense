import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PhasePlaceholder({
  icon: Icon,
  title,
  description,
  phase,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-2 max-w-md">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Badge variant="secondary">{phase}</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
