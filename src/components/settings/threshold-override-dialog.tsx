"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { upsertYachtThreshold, deleteYachtThresholdOverride } from "@/lib/actions/thresholds";
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
import type { Tables } from "@/types/database";

export function ThresholdOverrideDialog({
  yachtId,
  parameter,
  label,
  threshold,
  isOverride,
}: {
  yachtId: string;
  parameter: string;
  label: string;
  threshold: Tables<"thresholds"> | null;
  isOverride: boolean;
}) {
  const [open, setOpen] = useState(false);
  const action = upsertYachtThreshold.bind(null, yachtId, parameter);
  const [state, formAction, pending] = useActionState(action, ACTION_INITIAL_STATE);
  const [isDeleting, startDeleting] = useTransition();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{label} — yacht override</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preferred_min">Preferred min</Label>
              <Input
                id="preferred_min"
                name="preferred_min"
                type="number"
                step="any"
                defaultValue={threshold?.preferred_min ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_max">Preferred max</Label>
              <Input
                id="preferred_max"
                name="preferred_max"
                type="number"
                step="any"
                defaultValue={threshold?.preferred_max ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warning_threshold">Warning threshold</Label>
              <Input
                id="warning_threshold"
                name="warning_threshold"
                type="number"
                step="any"
                defaultValue={threshold?.warning_threshold ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="critical_threshold">Critical threshold</Label>
              <Input
                id="critical_threshold"
                name="critical_threshold"
                type="number"
                step="any"
                defaultValue={threshold?.critical_threshold ?? ""}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="persistence_minutes">Persistence (minutes)</Label>
              <Input
                id="persistence_minutes"
                name="persistence_minutes"
                type="number"
                min={0}
                step={1}
                required
                defaultValue={threshold?.persistence_minutes ?? 30}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" defaultValue={threshold?.notes ?? ""} placeholder="Optional" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Saving..." : "Save override"}
            </Button>
            {isOverride && threshold && (
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting}
                onClick={() =>
                  startDeleting(async () => {
                    await deleteYachtThresholdOverride(threshold.id);
                    setOpen(false);
                  })
                }
              >
                {isDeleting ? "Reverting..." : "Revert to company default"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
