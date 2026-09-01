import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ScientificDisclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs text-muted-foreground">
        Environmental risk indicator, not a microbiological test — does not confirm the presence or
        absence of mould, bacteria, viruses or Legionella.
      </p>
    );
  }

  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>Environmental monitoring, not laboratory diagnosis</AlertTitle>
      <AlertDescription>
        These indices are calculated from sensor readings for environmental monitoring and risk
        indication only. They do not replace microbiological laboratory analysis, HVAC engineering
        assessment, Legionella risk assessment, professional mould inspection, or other professional
        environmental investigation. AI interpretations (where shown) are decision-support information,
        not medical, microbiological or engineering certification.
      </AlertDescription>
    </Alert>
  );
}
