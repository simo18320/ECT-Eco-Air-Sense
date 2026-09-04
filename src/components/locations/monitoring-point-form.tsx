"use client";

import { useActionState, useEffect } from "react";
import { updateMonitoringPoint } from "@/lib/actions/monitoring-points";
import { ACTION_INITIAL_STATE } from "@/lib/actions/action-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AircareDeviceSelect } from "./aircare-device-select";
import type { Tables } from "@/types/database";

type MonitoringPoint = Tables<"monitoring_points"> & { sensors: Tables<"sensors">[] };

export function MonitoringPointForm({
  point,
  onSuccess,
}: {
  point: MonitoringPoint;
  onSuccess: () => void;
}) {
  const action = updateMonitoringPoint.bind(null, point.id);
  const [state, formAction, pending] = useActionState(action, ACTION_INITIAL_STATE);
  const sensor = point.sensors?.[0];

  useEffect(() => {
    if (state.success) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={point.name} required />
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="room_location">Room / Location</Label>
          <Input
            id="room_location"
            name="room_location"
            placeholder="e.g. Owner's Cabin, Main Deck"
            defaultValue={point.room_location ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={point.status}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 col-span-2">
          <AircareDeviceSelect name="code" currentCode={point.code} excludePointId={point.id} />
        </div>

        <div className="col-span-2 pt-2 border-t border-border mt-1">
          <p className="text-xs font-medium text-muted-foreground mb-3 mt-3">SENSOR DETAILS</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="manufacturer">Manufacturer</Label>
          <Input id="manufacturer" name="manufacturer" defaultValue={sensor?.manufacturer ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input id="model" name="model" defaultValue={sensor?.model ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="serial_number">Serial Number</Label>
          <Input id="serial_number" name="serial_number" defaultValue={sensor?.serial_number ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="installation_date">Installation Date</Label>
          <Input
            id="installation_date"
            name="installation_date"
            type="date"
            defaultValue={sensor?.installation_date ?? ""}
          />
        </div>
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
