import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/types/database";

type ImportJob = Tables<"import_jobs"> & {
  app_users: { full_name: string | null; email: string } | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  completed_with_errors: "outline",
  processing: "secondary",
  failed: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  completed_with_errors: "Completed with errors",
  processing: "Processing",
  failed: "Failed",
};

export function ImportHistoryTable({ jobs }: { jobs: ImportJob[] }) {
  if (jobs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No imports yet. Upload your first AirCare export above.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Records</TableHead>
          <TableHead>Points</TableHead>
          <TableHead>Uploaded by</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="font-medium max-w-48 truncate">{job.file_name}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[job.status] ?? "secondary"}>
                {STATUS_LABEL[job.status] ?? job.status}
              </Badge>
            </TableCell>
            <TableCell className="text-sm">
              {job.records_imported}
              {job.records_rejected > 0 && (
                <span className="text-destructive"> ({job.records_rejected} rejected)</span>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {job.monitoring_points_detected ?? "—"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {job.app_users?.full_name ?? job.app_users?.email ?? "—"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
              {new Date(job.created_at).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
