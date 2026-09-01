import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Plain anchor, not a client onClick handler — the signed URL is resolved
 * server-side and passed in directly. Fetching it async on click and calling
 * window.open() afterward is reliably blocked by popup blockers, since by the
 * time the promise resolves the browser no longer treats it as a user gesture.
 */
export function DownloadPdfButton({ href, size = "sm" }: { href: string; size?: "sm" | "default" }) {
  return (
    <Button asChild size={size} variant="outline">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <Download className="h-3.5 w-3.5" />
        Download PDF
      </a>
    </Button>
  );
}
