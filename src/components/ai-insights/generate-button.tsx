"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generateAiInsights } from "@/lib/actions/ai-insights";

export function GenerateInsightsButton({ yachtId }: { yachtId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await generateAiInsights(yachtId);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to generate insights.");
            }
          });
        }}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {isPending ? "Analyzing..." : "Generate Insights"}
      </Button>
      {error && (
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
