"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createDeck, uploadGaPlanImage } from "@/lib/actions/ga-plan";
import { ACTION_INITIAL_STATE } from "@/lib/actions/action-state";

export function AddDeckDialog({ yachtId, nextOrder }: { yachtId: string; nextOrder: number }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!name || !file) {
      setError("Deck name and plan image are both required.");
      return;
    }

    startTransition(async () => {
      try {
        const deckId = await createDeck(yachtId, name, nextOrder);
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadGaPlanImage(deckId, yachtId, ACTION_INITIAL_STATE, formData);
        if (result.error) {
          setError(result.error);
          return;
        }
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-3.5 w-3.5" />
          Add Deck
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Deck & Upload GA Plan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Deck Name</Label>
            <Input id="name" name="name" placeholder="e.g. Main Deck" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">GA Plan Image (PNG/JPG)</Label>
            <Input id="file" name="file" type="file" accept="image/*" required />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Uploading..." : "Create Deck"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
