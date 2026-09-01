"use client";

import { useActionState } from "react";
import Image from "next/image";
import { updateCompanyLogo, updateCompanyName } from "@/lib/actions/company";
import { ACTION_INITIAL_STATE } from "@/lib/actions/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function BrandingForm({
  companyName,
  logoUrl,
}: {
  companyName: string;
  logoUrl: string | null;
}) {
  const [logoState, logoAction, logoPending] = useActionState(
    updateCompanyLogo,
    ACTION_INITIAL_STATE,
  );
  const [nameState, nameAction, namePending] = useActionState(
    updateCompanyName,
    ACTION_INITIAL_STATE,
  );

  return (
    <div className="space-y-6">
      <form action={nameAction} className="space-y-2">
        <Label htmlFor="company-name">Company Name</Label>
        <div className="flex gap-2">
          <Input id="company-name" name="name" defaultValue={companyName} className="max-w-sm" />
          <Button type="submit" variant="secondary" disabled={namePending}>
            {namePending ? "Saving..." : "Save"}
          </Button>
        </div>
        {nameState.error && (
          <Alert variant="destructive" className="max-w-sm">
            <AlertDescription>{nameState.error}</AlertDescription>
          </Alert>
        )}
      </form>

      <form action={logoAction} className="space-y-2">
        <Label htmlFor="logo">Company Logo</Label>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded border border-border flex items-center justify-center bg-muted overflow-hidden shrink-0">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={companyName}
                width={64}
                height={64}
                className="object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground">No logo</span>
            )}
          </div>
          <div className="flex-1 space-y-2 max-w-sm">
            <Input id="logo" name="logo" type="file" accept="image/*" />
            <Button type="submit" variant="secondary" disabled={logoPending}>
              {logoPending ? "Uploading..." : "Upload Logo"}
            </Button>
          </div>
        </div>
        {logoState.error && (
          <Alert variant="destructive" className="max-w-sm">
            <AlertDescription>{logoState.error}</AlertDescription>
          </Alert>
        )}
        <p className="text-xs text-muted-foreground">
          Appears in the dashboard header, reports and PDF exports. PNG/JPG/SVG up to 2MB.
        </p>
      </form>
    </div>
  );
}
