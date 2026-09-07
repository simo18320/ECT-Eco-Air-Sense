"use client";

import { useActionState, useEffect } from "react";
import { createYacht, updateYacht } from "@/lib/actions/yachts";
import { ACTION_INITIAL_STATE } from "@/lib/actions/action-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { YachtPhotoUpload } from "./yacht-photo-upload";
import type { Tables } from "@/types/database";

type Yacht = Tables<"yachts">;

const FIELDS: Array<{
  name: keyof Yacht;
  label: string;
  type?: string;
  placeholder?: string;
}> = [
  { name: "name", label: "Yacht Name" },
  { name: "shipyard", label: "Shipyard" },
  { name: "yacht_type", label: "Yacht Type" },
  { name: "imo_number", label: "IMO Number" },
  { name: "flag", label: "Flag" },
  { name: "build_year", label: "Build Year", type: "number" },
  { name: "length_m", label: "Length (m)", type: "number" },
  { name: "gross_tonnage", label: "Gross Tonnage", type: "number" },
  { name: "owner_name", label: "Owner" },
  { name: "management_company", label: "Management Company" },
  { name: "captain_name", label: "Captain" },
  { name: "monitoring_start_date", label: "Monitoring Start Date", type: "date" },
  { name: "monitoring_end_date", label: "Monitoring End Date", type: "date" },
  { name: "monitoring_frequency", label: "Monitoring Frequency", placeholder: "e.g. Weekly" },
  { name: "monitoring_provider", label: "Monitoring Provider" },
];

export function YachtForm({
  yacht,
  photoUrl,
  onSuccess,
}: {
  yacht?: Yacht;
  photoUrl?: string | null;
  onSuccess: () => void;
}) {
  const action = yacht ? updateYacht.bind(null, yacht.id) : createYacht;
  const [state, formAction, pending] = useActionState(action, ACTION_INITIAL_STATE);

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
      <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
        {yacht && <YachtPhotoUpload yachtId={yacht.id} photoUrl={photoUrl ?? null} />}
        {FIELDS.map((field) => (
          <div
            key={field.name}
            className={field.name === "name" ? "col-span-2 space-y-2" : "space-y-2"}
          >
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              name={field.name}
              type={field.type ?? "text"}
              placeholder={field.placeholder}
              defaultValue={yacht?.[field.name] ?? ""}
              required={field.name === "name"}
            />
          </div>
        ))}
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : yacht ? "Save Changes" : "Create Yacht"}
      </Button>
    </form>
  );
}
