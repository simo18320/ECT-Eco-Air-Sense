import { WifiOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SILENT_AFTER_HOURS, type SilenceSummary } from "@/lib/sensors/silence";

function formatUtc(iso: string) {
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

export function SilentSensorsAlert({ summary }: { summary: SilenceSummary }) {
  const { silent, total, asOf } = summary;
  const title =
    silent.length === total
      ? `No sensor has reported for over ${SILENT_AFTER_HOURS} hours`
      : `${silent.length} of ${total} sensors ${silent.length === 1 ? "has" : "have"} gone silent`;

  return (
    <Alert className="border-status-warning/40 bg-status-warning/10">
      <WifiOff className="h-4 w-4 text-status-warning" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>
          As of the last AirCare sync ({formatUtc(asOf)}), readings and alerts for these points may be out of
          date. Check the gateway&apos;s power and internet connection on board, or the device status in the
          Ionex portal.
        </p>
        <ul className="mt-2 space-y-0.5 text-xs">
          {silent.map((s) => (
            <li key={s.pointId}>
              <span className="font-medium">{s.pointName}</span> — last reading {formatUtc(s.lastReadingAt)} (
              {Math.round(s.silentHours)} h before the sync)
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
