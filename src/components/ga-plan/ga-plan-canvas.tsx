"use client";

import { useRef, useState, useTransition, useActionState, useEffect } from "react";
import { MapPin, Plus, Trash2, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { placePin, movePin, deletePin } from "@/lib/actions/ga-plan";
import { updateMonitoringPoint } from "@/lib/actions/monitoring-points";
import { ACTION_INITIAL_STATE } from "@/lib/actions/action-state";
import { parameterMeta } from "@/lib/parameters";
import { parameterScore, scoreBand, type ThresholdLike } from "@/lib/scoring/parameter-score";
import { cn } from "@/lib/utils";
import type { LatestReading } from "@/lib/data/monitoring-points";
import type { PointScores } from "@/lib/data/scoring";
import type { Tables } from "@/types/database";
import Link from "next/link";

const TONE_BG = {
  good: "bg-status-good",
  warning: "bg-status-warning",
  critical: "bg-status-critical",
} as const;
const TONE_TEXT = {
  good: "text-status-good",
  warning: "text-status-warning",
  critical: "text-status-critical",
} as const;

type Pin = {
  id: string;
  x_coord: number;
  y_coord: number;
  monitoring_point_id: string;
  monitoring_points: { id: string; name: string; code: string | null; room_location: string | null; status: string } | null;
};

export function GaPlanCanvas({
  gaPlanId,
  imageUrl,
  pins,
  unpinnedPoints,
  readingsByPoint,
  scoresByPoint,
  thresholds,
  canEdit,
}: {
  gaPlanId: string;
  imageUrl: string;
  pins: Pin[];
  unpinnedPoints: { id: string; name: string; code: string | null }[];
  readingsByPoint: Record<string, LatestReading[]>;
  scoresByPoint: Record<string, PointScores>;
  thresholds: Tables<"thresholds">[];
  canEdit: boolean;
}) {
  const thresholdByParameter = new Map<string, ThresholdLike>(thresholds.map((t) => [t.parameter, t]));
  const [editMode, setEditMode] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [pendingPointId, setPendingPointId] = useState<string>("");
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  function relativeCoords(e: { clientX: number; clientY: number }) {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    return { x, y };
  }

  function handleImageClick(e: React.MouseEvent) {
    if (!placing || !pendingPointId) return;
    const { x, y } = relativeCoords(e);
    startTransition(() => {
      void placePin(gaPlanId, pendingPointId, x, y);
    });
    setPlacing(false);
    setPendingPointId("");
  }

  function handlePinPointerDown(e: React.PointerEvent, pinId: string) {
    if (!editMode) return;
    e.stopPropagation();
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);

    function onMove(ev: PointerEvent) {
      const { x, y } = relativeCoords(ev);
      setDragPos({ id: pinId, x, y });
    }
    function onUp(ev: PointerEvent) {
      const { x, y } = relativeCoords(ev);
      startTransition(() => {
        void movePin(pinId, x, y);
      });
      setDragPos(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const activePin = pins.find((p) => p.id === activePinId);

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setEditMode(!editMode);
              setPlacing(false);
            }}
          >
            {editMode ? "Done Editing" : "Edit Pins"}
          </Button>
          {editMode && (
            <>
              <Select value={pendingPointId} onValueChange={setPendingPointId}>
                <SelectTrigger className="h-8 w-56 text-xs">
                  <SelectValue placeholder="Select a monitoring point..." />
                </SelectTrigger>
                <SelectContent>
                  {unpinnedPoints.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      All points on this yacht are already pinned
                    </div>
                  ) : (
                    unpinnedPoints.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.code ? `(${p.code})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="secondary"
                disabled={!pendingPointId}
                onClick={() => setPlacing(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                {placing ? "Click on the plan..." : "Add Pin"}
              </Button>
              {placing && (
                <Button size="sm" variant="ghost" onClick={() => setPlacing(false)}>
                  Cancel
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        onClick={handleImageClick}
        className="relative w-full rounded-lg border border-border overflow-hidden bg-muted select-none"
        style={{ cursor: placing ? "crosshair" : "default" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed URL with variable per-deck aspect ratio; Next/Image requires fixed dimensions we don't have server-side */}
        <img src={imageUrl} alt="GA Plan" className="w-full h-auto block" draggable={false} />

        {pins.map((pin) => {
          const pos = dragPos?.id === pin.id ? dragPos : { x: pin.x_coord, y: pin.y_coord };
          const point = pin.monitoring_points;
          const isOffline = !readingsByPoint[pin.monitoring_point_id]?.length;
          const tone = scoresByPoint[pin.monitoring_point_id]?.overall?.band?.tone;
          return (
            <div
              key={pin.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
              style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
            >
              <button
                onPointerDown={(e) => handlePinPointerDown(e, pin.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!editMode) setActivePinId(pin.id);
                }}
                className={cn(
                  "flex items-center justify-center h-7 w-7 rounded-full text-white border-2 border-white shadow-md hover:scale-110 transition-transform",
                  tone ? TONE_BG[tone] : "bg-muted-foreground",
                )}
                style={{ cursor: editMode ? "grab" : "pointer", opacity: isOffline ? 0.55 : 1 }}
                title={point?.name}
              >
                <MapPin className="h-3.5 w-3.5" />
              </button>
              <span className="pointer-events-none whitespace-nowrap rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm border border-border">
                {point?.room_location || point?.name}
              </span>
            </div>
          );
        })}
      </div>

      {activePin && (
        <PinDetailCard
          pin={activePin}
          readings={readingsByPoint[activePin.monitoring_point_id] ?? []}
          scores={scoresByPoint[activePin.monitoring_point_id]}
          thresholdByParameter={thresholdByParameter}
          canEdit={canEdit}
          canDelete={canEdit && editMode}
          onClose={() => setActivePinId(null)}
          onDelete={() => {
            startTransition(() => {
              void deletePin(activePin.id);
            });
            setActivePinId(null);
          }}
        />
      )}
    </div>
  );
}

function PinDetailCard({
  pin,
  readings,
  scores,
  thresholdByParameter,
  canEdit,
  canDelete,
  onClose,
  onDelete,
}: {
  pin: Pin;
  readings: LatestReading[];
  scores?: PointScores;
  thresholdByParameter: Map<string, ThresholdLike>;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  const point = pin.monitoring_points;
  const [editingLocation, setEditingLocation] = useState(false);

  return (
    <div className="rounded-lg border border-border p-4 bg-card">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium">{point?.name}</h3>
          {editingLocation && point ? (
            <LocationEditor
              point={point}
              onDone={() => setEditingLocation(false)}
            />
          ) : (
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => canEdit && setEditingLocation(true)}
              className={cn(
                "text-xs text-muted-foreground text-left",
                canEdit && "underline decoration-dotted underline-offset-2 hover:text-foreground",
              )}
            >
              {point?.room_location || <span className="italic">Set location</span>}
              {canEdit && <Pencil className="inline h-2.5 w-2.5 ml-1 mb-0.5" />}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {point && (
            <Badge variant={point.status === "active" ? "default" : "secondary"} className="text-xs">
              {point.status}
            </Badge>
          )}
          {canDelete && (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {readings.length === 0 ? (
        <p className="text-xs text-muted-foreground mt-3">No readings yet</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-3">
          {readings.map((r) => {
            const meta = parameterMeta(r.parameter);
            const threshold = thresholdByParameter.get(r.parameter);
            const tone = threshold ? scoreBand(parameterScore(r.value, threshold)).tone : null;
            return (
              <div key={r.parameter} className="text-center">
                <div className="text-xs text-muted-foreground">{meta.label}</div>
                <div className={cn("text-sm font-semibold tabular-nums", tone && TONE_TEXT[tone])}>
                  {r.value.toFixed(meta.decimals)}
                  <span className="text-xs font-normal text-muted-foreground ml-0.5">{meta.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {scores && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-border">
          <MiniScore label="Comfort" score={scores.comfort.score} band={scores.comfort.band} />
          <MiniScore label="Mould Risk" score={scores.mouldRisk.score} band={scores.mouldRisk.band} />
          <MiniScore label="Bio Safety" score={scores.biologicalSafety.score} band={scores.biologicalSafety.band} />
          <MiniScore label="Luxury" score={scores.luxuryPerception.score} band={scores.luxuryPerception.band} />
        </div>
      )}

      <Link href={`/live/${pin.monitoring_point_id}`} className="inline-block mt-3">
        <Button size="sm" variant="outline">
          View Details
        </Button>
      </Link>
    </div>
  );
}

function LocationEditor({
  point,
  onDone,
}: {
  point: { id: string; name: string; status: string };
  onDone: () => void;
}) {
  const action = updateMonitoringPoint.bind(null, point.id);
  const [state, formAction, pending] = useActionState(action, ACTION_INITIAL_STATE);

  useEffect(() => {
    if (state.success) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="flex items-center gap-1 mt-0.5">
      <input type="hidden" name="name" value={point.name} />
      <input type="hidden" name="status" value={point.status} />
      <Input
        name="room_location"
        placeholder="e.g. Owner's Cabin, Main Deck"
        autoFocus
        className="h-6 text-xs px-1.5"
      />
      <Button type="submit" size="sm" variant="ghost" className="h-6 px-1.5 text-xs" disabled={pending}>
        {pending ? "..." : "Save"}
      </Button>
      <Button type="button" size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={onDone}>
        Cancel
      </Button>
      {state.error && <span className="text-[10px] text-destructive">{state.error}</span>}
    </form>
  );
}

function MiniScore({
  label,
  score,
  band,
}: {
  label: string;
  score: number | null;
  band: { label: string; tone: "good" | "warning" | "critical" } | null;
}) {
  return (
    <div className="text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-sm font-semibold tabular-nums", band && TONE_TEXT[band.tone])}>
        {score ?? "—"}
      </div>
      {band && <div className="text-[10px] text-muted-foreground">{band.label}</div>}
    </div>
  );
}
