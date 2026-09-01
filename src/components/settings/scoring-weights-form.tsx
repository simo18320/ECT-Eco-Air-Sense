"use client";

import { useActionState } from "react";
import { updateScoringWeights } from "@/lib/actions/scoring-config";
import { ACTION_INITIAL_STATE } from "@/lib/actions/action-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Enums } from "@/types/database";

export function ScoringWeightsForm({
  configType,
  title,
  fields,
  weights,
}: {
  configType: Enums<"scoring_config_type">;
  title: string;
  fields: { key: string; label: string }[];
  weights: Record<string, number>;
}) {
  const action = updateScoringWeights.bind(null, configType);
  const [state, formAction, pending] = useActionState(action, ACTION_INITIAL_STATE);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{title}</p>
      <form action={formAction} className="space-y-3">
        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        {state.success && <p className="text-xs text-status-good">Saved.</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={`${configType}-${f.key}`} className="text-xs">
                {f.label}
              </Label>
              <div className="relative">
                <Input
                  id={`${configType}-${f.key}`}
                  name={f.key}
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={Math.round((weights[f.key] ?? 0) * 100)}
                  className="h-8 text-sm pr-6"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </form>
    </div>
  );
}
