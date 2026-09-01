"use client";

import { useState } from "react";
import { Pencil, MapPin } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MonitoringPointForm } from "./monitoring-point-form";
import type { Tables } from "@/types/database";

type MonitoringPoint = Tables<"monitoring_points"> & { sensors: Tables<"sensors">[] };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  inactive: "secondary",
  maintenance: "outline",
};

export function MonitoringPointsList({
  points,
  canEdit,
}: {
  points: MonitoringPoint[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState<MonitoringPoint | null>(null);

  if (points.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3 border border-dashed rounded-lg">
        <MapPin className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium">No monitoring points yet</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Monitoring points are created automatically the first time you import an AirCare
            export, or you can add them manually.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Room / Location</TableHead>
            <TableHead>Sensor</TableHead>
            <TableHead>Status</TableHead>
            {canEdit && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {points.map((point) => (
            <TableRow key={point.id}>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {point.code ?? "—"}
              </TableCell>
              <TableCell className="font-medium">{point.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {point.room_location ?? (
                  <span className="italic">Not assigned</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {point.sensors?.[0]?.manufacturer || point.sensors?.[0]?.model
                  ? `${point.sensors[0].manufacturer ?? ""} ${point.sensors[0].model ?? ""}`.trim()
                  : "—"}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[point.status] ?? "secondary"}>{point.status}</Badge>
              </TableCell>
              {canEdit && (
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(point)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {editing?.name}</DialogTitle>
          </DialogHeader>
          {editing && <MonitoringPointForm point={editing} onSuccess={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
