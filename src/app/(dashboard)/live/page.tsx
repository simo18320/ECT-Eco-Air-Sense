import Link from "next/link";
import { Ship } from "lucide-react";
import { getYachtContext } from "@/lib/data/current-yacht";
import { getMonitoringPoints, getLatestReadingsByYacht } from "@/lib/data/monitoring-points";
import { getImportHistory } from "@/lib/data/imports";
import { getCurrentUser } from "@/lib/data/current-user";
import { ImportDialog } from "@/components/import/import-dialog";
import { ImportHistoryTable } from "@/components/import/import-history-table";
import { LatestReadingsGrid } from "@/components/import/latest-readings-grid";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function LivePage() {
  const user = await getCurrentUser();
  const { yacht } = await getYachtContext();

  if (!yacht) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Ship className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No yacht yet</p>
              <p className="text-sm text-muted-foreground">
                Create a yacht profile before importing monitoring data.
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

  const canImport = user?.role === "admin" || user?.role === "technical";
  const [points, readings, importJobs] = await Promise.all([
    getMonitoringPoints(yacht.id),
    getLatestReadingsByYacht(yacht.id),
    getImportHistory(yacht.id),
  ]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Live / Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Current readings for {yacht.name}.
          </p>
        </div>
        {canImport && <ImportDialog yachtId={yacht.id} />}
      </div>

      <LatestReadingsGrid points={points} readings={readings} />

      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
          <CardDescription>Every AirCare export uploaded for this yacht.</CardDescription>
        </CardHeader>
        <CardContent>
          <ImportHistoryTable jobs={importJobs} />
        </CardContent>
      </Card>
    </div>
  );
}
