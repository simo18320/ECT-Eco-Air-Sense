import Link from "next/link";
import { Ship, Map as MapIcon } from "lucide-react";
import { getYachtContext } from "@/lib/data/current-yacht";
import { getCurrentUser } from "@/lib/data/current-user";
import { getDecks, getGaPlanForDeck, getPinsForGaPlan, getUnpinnedMonitoringPoints } from "@/lib/data/ga-plan";
import { getLatestReadingsByYacht, type LatestReading } from "@/lib/data/monitoring-points";
import { getPointScores } from "@/lib/data/scoring";
import { getScoringWeights } from "@/lib/data/scoring-config";
import { getEffectiveThresholds } from "@/lib/data/thresholds";
import { GaPlanCanvas } from "@/components/ga-plan/ga-plan-canvas";
import { AddDeckDialog } from "@/components/ga-plan/add-deck-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function YachtPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string }>;
}) {
  const [sp, user, { yacht }] = await Promise.all([searchParams, getCurrentUser(), getYachtContext()]);
  const canEdit = user?.role === "admin" || user?.role === "technical";

  if (!yacht) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Ship className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No yacht yet</p>
            <Button asChild size="sm">
              <Link href="/yacht-profile">Create Yacht Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const decks = await getDecks(yacht.id);

  if (decks.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Yacht Plan</h1>
            <p className="text-sm text-muted-foreground mt-1">General Arrangement plan for {yacht.name}.</p>
          </div>
          {canEdit && <AddDeckDialog yachtId={yacht.id} nextOrder={0} />}
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <MapIcon className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No decks yet</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Please upload the yacht&apos;s actual General Arrangement plan — locations are never guessed.
                Add a deck per plan page/image.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeDeck = decks.find((d) => d.id === sp.deck) ?? decks[0];
  const gaPlan = await getGaPlanForDeck(activeDeck.id);
  const [pins, unpinnedPoints, readings, thresholds] = gaPlan
    ? await Promise.all([
        getPinsForGaPlan(gaPlan.id),
        getUnpinnedMonitoringPoints(yacht.id, gaPlan.id),
        getLatestReadingsByYacht(yacht.id),
        getEffectiveThresholds(yacht.id),
      ])
    : [[], [], [], []];

  const readingsByPoint: Record<string, LatestReading[]> = {};
  for (const r of readings) {
    (readingsByPoint[r.monitoring_point_id] ??= []).push(r);
  }

  const scoresByPoint: Record<string, Awaited<ReturnType<typeof getPointScores>>> = {};
  if (pins.length > 0) {
    const weights = await getScoringWeights(yacht.id);
    await Promise.all(
      pins.map(async (pin) => {
        scoresByPoint[pin.monitoring_point_id] = await getPointScores(pin.monitoring_point_id, yacht.id, weights);
      }),
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Yacht Plan</h1>
          <p className="text-sm text-muted-foreground mt-1">General Arrangement plan for {yacht.name}.</p>
        </div>
        {canEdit && <AddDeckDialog yachtId={yacht.id} nextOrder={decks.length} />}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {decks.map((deck) => (
          <Link
            key={deck.id}
            href={`/yacht-plan?deck=${deck.id}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm border",
              deck.id === activeDeck.id
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {deck.name}
          </Link>
        ))}
      </div>

      {!gaPlan ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No plan image uploaded for {activeDeck.name} yet.
          </CardContent>
        </Card>
      ) : (
        <GaPlanCanvas
          gaPlanId={gaPlan.id}
          imageUrl={gaPlan.signedUrl ?? ""}
          pins={pins}
          unpinnedPoints={unpinnedPoints}
          readingsByPoint={readingsByPoint}
          scoresByPoint={scoresByPoint}
          thresholds={thresholds}
          canEdit={canEdit}
        />
      )}

      <p className="text-xs text-muted-foreground">
        Pins are placed manually and can be dragged to reposition — locations are never inferred automatically.
        Heatmap overlays (interpolated, not continuous measurements) arrive in a later phase.
      </p>
    </div>
  );
}
