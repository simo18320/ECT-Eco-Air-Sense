"use client";

import { useRef, useState, useTransition } from "react";
import { MapPin, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { placePin, movePin, deletePin } from "@/lib/actions/ga-plan";
import { parameterMeta } from "@/lib/parameters";
import type { LatestReading } from "@/lib/data/monitoring-points";
import type { PointScores } from "@/lib/data/scoring";
import Link from "next/link";

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
  canEdit,
}: {
  gaPlanId: string;
  imageUrl: string;
  pins: Pin[];
  unpinnedPoints: { id: string; name: string; code: string | null }[];
  readingsByPoint: Record<string, LatestReading[]>;
  scoresByPoint: Record<string, PointScores>;
  canEdit: boolean;
}) {
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
          return (
            <button
              key={pin.id}
              onPointerDown={(e) => handlePinPointerDown(e, pin.id)}
              onClick={(e) => {
                e.stopPropagation();
                if (!editMode) setActivePinId(pin.id);
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground border-2 border-primary-foreground shadow-md hover:scale-110 transition-transform"
              style={{
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
                cursor: editMode ? "grab" : "pointer",
                opacity: isOffline ? 0.55 : 1,
              }}
              title={point?.name}
            >
              <MapPin className="h-3.5 w-3.5" />
            </button>
          );
        })}
      </div>

      {activePin && (
        <PinDetailCard
          pin={activePin}
          readings={readingsByPoint[activePin.monitoring_point_id] ?? []}
          scores={scoresByPoint[activePin.monitoring_point_id]}
          canEdit={canEdit && editMode}
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
  canEdit,
  onClose,
  onDelete,
}: {
  pin: Pin;
  readings: LatestReading[];
  scores?: PointScores;
  canEdit: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  const point = pin.monitoring_points;

  return (
    <div className="rounded-lg border border-border p-4 bg-card">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{point?.name}</h3>
          <p className="text-xs text-muted-foreground">{point?.room_location ?? point?.code}</p>
        </div>
        <div className="flex items-center gap-1">
          {point && (
            <Badge variant={point.status === "active" ? "default" : "secondary"} className="text-xs">
              {point.status}
            </Badge>
          )}
          {canEdit && (
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
            return (
              <div key={r.parameter} className="text-center">
                <div className="text-xs text-muted-foreground">{meta.label}</div>
                <div className="text-sm font-semibold tabular-nums">
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
      <div className="text-sm font-semibold tabular-nums">{score ?? "—"}</div>
      {band && <div className="text-[10px] text-muted-foreground">{band.label}</div>}
    </div>
  );
}
