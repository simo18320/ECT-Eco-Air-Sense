"use client";

import { useEffect, useState } from "react";
import { getAircareDeviceOptions, type AircareDeviceOption } from "@/lib/actions/aircare-devices";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

/** AirCare device codes use underscores; codes stored on monitoring_points use spaces. */
function toDeviceCode(storedCode: string) {
  return storedCode.replace(/ /g, "_");
}
function toStoredCode(deviceCode: string) {
  return deviceCode.replace(/_/g, " ");
}

/**
 * Renders a hidden `<input name={name}>` carrying the chosen sensor code, so
 * it slots into the existing useActionState/FormData forms unchanged. Lets
 * an admin pick a sensor from the live AirCare registry (shared across every
 * yacht on the account) instead of typing a device code by hand, and shows
 * which sensors are already wired to another boat/location.
 */
export function AircareDeviceSelect({
  name,
  currentCode,
  excludePointId,
}: {
  name: string;
  currentCode: string | null;
  excludePointId?: string;
}) {
  const [devices, setDevices] = useState<AircareDeviceOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [manualValue, setManualValue] = useState(currentCode ?? "");
  const [selected, setSelected] = useState<string>(currentCode ? toDeviceCode(currentCode) : NONE);

  useEffect(() => {
    let cancelled = false;
    getAircareDeviceOptions()
      .then((list) => {
        if (cancelled) return;
        setDevices(list);
        if (currentCode && !list.some((d) => d.device === toDeviceCode(currentCode))) {
          // Existing code doesn't match anything AirCare currently reports — keep it editable as-is.
          setManualMode(true);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load AirCare sensors.");
        setManualMode(true);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (manualMode) {
    return (
      <div className="space-y-2">
        <Label htmlFor={`${name}-manual`}>Sensor Code</Label>
        <Input
          id={`${name}-manual`}
          name={name}
          value={manualValue}
          onChange={(e) => setManualValue(e.target.value)}
          placeholder="e.g. Cabin_1"
        />
        {error ? (
          <p className="text-xs text-destructive">{error} You can still enter the device code manually.</p>
        ) : (
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={() => setManualMode(false)}
          >
            Choose from AirCare sensor list instead
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`${name}-select`}>AirCare Sensor</Label>
      <input type="hidden" name={name} value={selected === NONE ? "" : toStoredCode(selected)} />
      <Select value={selected} onValueChange={setSelected} disabled={loading}>
        <SelectTrigger id={`${name}-select`}>
          <SelectValue placeholder={loading ? "Loading sensors..." : "Select a sensor"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No sensor (manual data only)</SelectItem>
          {devices?.map((d) => {
            const takenByOther = !!d.assignedTo && d.assignedTo.pointId !== excludePointId;
            return (
              <SelectItem key={d.device} value={d.device} disabled={takenByOther}>
                {toStoredCode(d.device)}
                {takenByOther ? ` — on ${d.assignedTo!.yachtName} / ${d.assignedTo!.pointName}` : ""}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <button
        type="button"
        className="text-xs text-muted-foreground underline"
        onClick={() => setManualMode(true)}
      >
        Enter code manually instead
      </button>
    </div>
  );
}
