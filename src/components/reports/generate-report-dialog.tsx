"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { generateReport } from "@/lib/actions/reports";

export function GenerateReportDialog({ yachtId }: { yachtId: string }) {
  const [open, setOpen] = useState(false);
  const [periodDays, setPeriodDays] = useState("14");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <FileText className="h-3.5 w-3.5" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Environmental Monitoring Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label>Reporting Period</Label>
            <Select value={periodDays} onValueChange={setPeriodDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="14">Last 14 days (bi-weekly)</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            The report is generated once and stored immutably — data changes after generation won&apos;t affect it.
            Regenerate to capture a fresh snapshot.
          </p>
          <Button
            className="w-full"
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  const { reportId } = await generateReport(yachtId, Number(periodDays));
                  setOpen(false);
                  router.push(`/reports/${reportId}`);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to generate report.");
                }
              });
            }}
          >
            {isPending ? "Generating..." : "Generate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
