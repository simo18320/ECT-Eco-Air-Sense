import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PointHealth } from "@/lib/data/sensor-health";

const STATUS_LABEL: Record<PointHealth["status"], string> = {
  healthy: "Healthy",
  stale: "Stale",
  offline: "Offline",
};
const STATUS_VARIANT: Record<PointHealth["status"], "secondary" | "outline" | "destructive"> = {
  healthy: "secondary",
  stale: "outline",
  offline: "destructive",
};

function formatLastReading(iso: string | null) {
  if (!iso) return "Never";
  return (
    new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC"
  );
}

export function SensorHealthCard({ points }: { points: PointHealth[] }) {
  if (points.length === 0) return null;

  const issues = points.filter((p) => p.status !== "healthy");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sensor Health</CardTitle>
        <CardDescription>
          {issues.length === 0
            ? "All active monitoring points reported data recently."
            : `${issues.length} of ${points.length} active monitoring point${points.length === 1 ? "" : "s"} may need attention.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Monitoring point</TableHead>
              <TableHead>Last reading</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {points.map((p) => (
              <TableRow key={p.pointId}>
                <TableCell className="font-medium">{p.pointName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatLastReading(p.lastReadingAt)}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
