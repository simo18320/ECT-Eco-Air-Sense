import Link from "next/link";
import { Ship } from "lucide-react";
import { getYachtContext } from "@/lib/data/current-yacht";
import { getMonitoringPoints } from "@/lib/data/monitoring-points";
import { getCurrentUser } from "@/lib/data/current-user";
import { MonitoringPointsList } from "@/components/locations/monitoring-points-list";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function LocationsPage() {
  const [user, { yacht }] = await Promise.all([getCurrentUser(), getYachtContext()]);

  if (!yacht) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Ship className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No yacht yet</p>
              <p className="text-sm text-muted-foreground">
                Create a yacht profile before managing monitoring points.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/yacht-profile">Create Yacht Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const points = await getMonitoringPoints(yacht.id);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitoring points for {yacht.name} — {points.length} point{points.length === 1 ? "" : "s"}.
        </p>
      </div>

      <MonitoringPointsList
        points={points}
        canEdit={user?.role === "admin" || user?.role === "technical"}
      />
    </div>
  );
}
