"use client";

import { useState, useTransition } from "react";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { createAircareImportUploadUrl, importAircareFile, type ImportActionState } from "@/lib/actions/import";
import { createClient } from "@/lib/supabase/client";
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

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const INITIAL_STATE: ImportActionState = { error: null, success: false, summary: null };

export function ImportDialog({ yachtId }: { yachtId: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ImportActionState>(INITIAL_STATE);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = (e.currentTarget.elements.namedItem("file") as HTMLInputElement | null)?.files?.[0];
    if (!file) {
      setState({ error: "Select a file to import.", success: false, summary: null });
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setState({
        error: "Only .xlsx exports are supported right now. CSV/XLS support is planned — ask if you need it sooner.",
        success: false,
        summary: null,
      });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setState({ error: "File is larger than 25MB.", success: false, summary: null });
      return;
    }

    startTransition(async () => {
      setState(INITIAL_STATE);

      // Uploaded directly to Supabase Storage from the browser via a signed
      // URL rather than sent through this Server Action — Vercel Functions
      // (Server Actions included) cap the request body at ~4.5MB regardless
      // of app config, and AirCare exports routinely run several MB.
      const slot = await createAircareImportUploadUrl(yachtId);
      if ("error" in slot) {
        setState({ error: slot.error, success: false, summary: null });
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("yacht-files")
        .uploadToSignedUrl(slot.path, slot.token, file, {
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
      if (uploadError) {
        setState({ error: `Upload failed: ${uploadError.message}`, success: false, summary: null });
        return;
      }

      const result = await importAircareFile(yachtId, slot.path, file.name);
      setState(result);
    });
  }

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
          <form onSubmit={handleSubmit} className="space-y-4">
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
