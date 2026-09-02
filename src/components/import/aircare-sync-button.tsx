"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { syncAircareNow } from "@/lib/actions/aircare-sync";

export function AircareSyncButton({ yachtId }: { yachtId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => {
          setError(null);
          setLastResult(null);
          startTransition(async () => {
            try {
              const summary = await syncAircareNow(yachtId);
              setLastResult(`Imported ${summary.recordsImported} of ${summary.recordsFetched} readings.`);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "AirCare sync failed.");
            }
          });
        }}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {isPending ? "Syncing..." : "Sync from AirCare"}
      </Button>
      {error && (
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {lastResult && <p className="text-xs text-muted-foreground">{lastResult}</p>}
    </div>
  );
}
