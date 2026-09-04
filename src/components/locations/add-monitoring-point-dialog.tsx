"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createMonitoringPoint } from "@/lib/actions/monitoring-points";
import { ACTION_INITIAL_STATE } from "@/lib/actions/action-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AircareDeviceSelect } from "./aircare-device-select";

export function AddMonitoringPointDialog({ yachtId }: { yachtId: string }) {
  const [open, setOpen] = useState(false);
  const action = createMonitoringPoint.bind(null, yachtId);
  const [state, formAction, pending] = useActionState(action, ACTION_INITIAL_STATE);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Monitoring Point
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Monitoring Point</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="e.g. Owner's Cabin" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="room_location">Room / Location</Label>
            <Input id="room_location" name="room_location" placeholder="e.g. Main Deck" />
          </div>
          <AircareDeviceSelect name="code" currentCode={null} />
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Adding..." : "Add Monitoring Point"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
