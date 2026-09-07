"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { uploadYachtPhoto } from "@/lib/actions/yachts";
import { ACTION_INITIAL_STATE } from "@/lib/actions/action-state";

export function YachtPhotoUpload({ yachtId, photoUrl }: { yachtId: string; photoUrl: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadYachtPhoto(yachtId, ACTION_INITIAL_STATE, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 col-span-2">
      <Label>Yacht Photo</Label>
      <div className="flex items-center gap-4">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-16 w-24 object-cover rounded-md border border-border" />
        ) : (
          <div className="h-16 w-24 rounded-md border border-dashed border-border flex items-center justify-center text-muted-foreground">
            <Camera className="h-5 w-5" />
          </div>
        )}
        <div className="space-y-1">
          <Input
            id="yacht_photo"
            type="file"
            accept="image/*"
            disabled={isPending}
            onChange={handleChange}
            className="max-w-xs"
          />
          <p className="text-xs text-muted-foreground">Used on the cover of generated reports.</p>
        </div>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
