"use client";

import { useActionState, useState } from "react";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { importAircareFile } from "@/lib/actions/import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const PARAM_LABELS: Record<string, string> = {
  co2: "CO2",
  relative_humidity: "Relative Humidity",
  pm10: "PM10",
  pm2_5: "PM2.5",
  temperature: "Temperature",
  tvoc: "TVOC",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }) + " UTC";
}

export function ImportDialog({ yachtId }: { yachtId: string }) {
  const [open, setOpen] = useState(false);
  const importAction = importAircareFile.bind(null, yachtId);
  const [state, formAction, pending] = useActionState(importAction, {
    error: null,
    success: false,
    summary: null,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Upload className="h-4 w-4" />
          Import AirCare Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import AirCare / Ionex Export</DialogTitle>
        </DialogHeader>

        {state.success && state.summary ? (
          <div className="space-y-4">
            <Alert className="border-status-good/40 bg-status-good/10">
              <CheckCircle2 className="h-4 w-4 text-status-good" />
              <AlertTitle>Import complete</AlertTitle>
              <AlertDescription>
                {state.summary.recordsImported} records imported
                {state.summary.recordsRejected > 0 && `, ${state.summary.recordsRejected} rejected`}.
              </AlertDescription>
            </Alert>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Monitoring points</dt>
                <dd className="font-medium">{state.summary.monitoringPointsDetected}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">New points created</dt>
                <dd className="font-medium">{state.summary.newMonitoringPoints.length}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Date range</dt>
                <dd className="font-medium">
                  {formatDate(state.summary.dateRangeStart)} — {formatDate(state.summary.dateRangeEnd)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground mb-1">Parameters detected</dt>
                <dd className="flex flex-wrap gap-1">
                  {state.summary.parametersDetected.map((p) => (
                    <Badge key={p} variant="secondary">
                      {PARAM_LABELS[p] ?? p}
                    </Badge>
                  ))}
                </dd>
              </div>
            </dl>

            {state.summary.newMonitoringPoints.length > 0 && (
              <Alert>
                <AlertDescription>
                  New monitoring points ({state.summary.newMonitoringPoints.join(", ")}) were created with
                  placeholder names. Assign them to a deck/area on the Locations page.
                </AlertDescription>
              </Alert>
            )}

            {state.summary.skippedSheets.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {state.summary.skippedSheets.length} sheet(s) skipped (e.g. chart sheets):{" "}
                  {state.summary.skippedSheets.map((s) => s.name).join(", ")}
                </AlertDescription>
              </Alert>
            )}

            <Button className="w-full" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            {state.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="file">AirCare export file (.xlsx)</Label>
              <Input id="file" name="file" type="file" accept=".xlsx" required />
              <p className="text-xs text-muted-foreground">
                Exported from{" "}
                <span className="font-mono">ionex.aircare.it</span>. CSV/XLS support coming soon.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Importing..." : "Import"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
