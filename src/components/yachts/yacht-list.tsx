"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { YachtForm } from "./yacht-form";
import { deleteYacht } from "@/lib/actions/yachts";
import type { Tables } from "@/types/database";

type Yacht = Tables<"yachts">;

export function YachtList({
  yachts,
  canEdit,
}: {
  yachts: Yacht[];
  canEdit: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingYacht, setEditingYacht] = useState<Yacht | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(yacht: Yacht) {
    if (!confirm(`Delete "${yacht.name}"? This cannot be undone.`)) return;
    startTransition(() => deleteYacht(yacht.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Yacht Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vessel information and monitoring configuration.
          </p>
        </div>
        {canEdit && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Add Yacht
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Yacht</DialogTitle>
              </DialogHeader>
              <YachtForm onSuccess={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {yachts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Ship className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No yachts yet</p>
              <p className="text-sm text-muted-foreground">
                Create a yacht profile to start monitoring — this is Step 1 of the setup workflow.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {yachts.map((yacht) => (
            <Card key={yacht.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{yacht.name}</CardTitle>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Dialog
                        open={editingYacht?.id === yacht.id}
                        onOpenChange={(open) => setEditingYacht(open ? yacht : null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit {yacht.name}</DialogTitle>
                          </DialogHeader>
                          <YachtForm yacht={yacht} onSuccess={() => setEditingYacht(null)} />
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={isPending}
                        onClick={() => handleDelete(yacht)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-1.5">
                  {yacht.yacht_type && <Badge variant="secondary">{yacht.yacht_type}</Badge>}
                  {yacht.flag && <Badge variant="secondary">{yacht.flag}</Badge>}
                  {yacht.build_year && <Badge variant="secondary">{yacht.build_year}</Badge>}
                </div>
                <dl className="space-y-1 text-muted-foreground">
                  {yacht.shipyard && (
                    <div className="flex justify-between">
                      <dt>Shipyard</dt>
                      <dd className="text-foreground">{yacht.shipyard}</dd>
                    </div>
                  )}
                  {yacht.length_m && (
                    <div className="flex justify-between">
                      <dt>Length</dt>
                      <dd className="text-foreground">{yacht.length_m} m</dd>
                    </div>
                  )}
                  {yacht.captain_name && (
                    <div className="flex justify-between">
                      <dt>Captain</dt>
                      <dd className="text-foreground">{yacht.captain_name}</dd>
                    </div>
                  )}
                  {yacht.monitoring_provider && (
                    <div className="flex justify-between">
                      <dt>Monitoring</dt>
                      <dd className="text-foreground">{yacht.monitoring_provider}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
