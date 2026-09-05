import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/current-user";
import { getYachtContext } from "@/lib/data/current-yacht";
import { getUserYachtAccessMap } from "@/lib/data/user-yacht-access";
import { getEffectiveThresholds } from "@/lib/data/thresholds";
import { parameterMeta } from "@/lib/parameters";
import { BrandingForm } from "@/components/settings/branding-form";
import { UserRoleTable } from "@/components/settings/user-role-table";
import { CreateUserDialog } from "@/components/settings/create-user-dialog";
import { ScoringWeightsForm } from "@/components/settings/scoring-weights-form";
import { ThresholdOverrideDialog } from "@/components/settings/threshold-override-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Enums } from "@/types/database";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [{ data: users }, { data: scoringConfigs }, { yacht, allYachts }, yachtAccessByUser] =
    await Promise.all([
      supabase.from("app_users").select("*").order("created_at", { ascending: true }),
      supabase
        .from("scoring_configurations")
        .select("config_type, weights")
        .eq("company_id", user.companyId)
        .is("yacht_id", null),
      getYachtContext(),
      getUserYachtAccessMap(),
    ]);

  const thresholds = yacht ? await getEffectiveThresholds(yacht.id) : [];
  const canEditThresholds = user.role === "admin" || user.role === "technical";

  const weightsByType = new Map<Enums<"scoring_config_type">, Record<string, number>>();
  for (const c of scoringConfigs ?? []) weightsByType.set(c.config_type, c.weights as Record<string, number>);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Company branding, users and system configuration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Branding</CardTitle>
          <CardDescription>
            Shown in the dashboard header, generated reports and PDF exports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.role === "admin" ? (
            <BrandingForm companyName={user.companyName} logoUrl={user.companyLogoUrl} />
          ) : (
            <Alert>
              <AlertDescription>Only admins can update company branding.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Create an account directly with a password you set, or team members can sign
              themselves up from the sign-in screen. Captains and viewers only see the yachts
              checked under Yacht Access — admins and technical staff always see the full fleet.
            </CardDescription>
          </div>
          {user.role === "admin" && <CreateUserDialog />}
        </CardHeader>
        <CardContent>
          {user.role === "admin" ? (
            <UserRoleTable
              users={users ?? []}
              currentUserId={user.id}
              yachts={allYachts.map((y) => ({ id: y.id, name: y.name }))}
              yachtAccessByUser={yachtAccessByUser}
            />
          ) : (
            <Alert>
              <AlertDescription>Only admins can manage user roles.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scoring Weights</CardTitle>
          <CardDescription>
            Relative importance of each factor in the Comfort, Biological Safety, Luxury Perception
            and Overall scores. Values don&apos;t need to sum to 100 — they&apos;re normalised
            automatically — but percentages make the relative weighting easiest to reason about.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.role === "admin" ? (
            <div className="space-y-6">
              <ScoringWeightsForm
                configType="comfort"
                title="Comfort Index"
                fields={[
                  { key: "temperature", label: "Temperature" },
                  { key: "relative_humidity", label: "Humidity" },
                  { key: "co2", label: "CO2" },
                  { key: "tvoc", label: "TVOC" },
                ]}
                weights={weightsByType.get("comfort") ?? {}}
              />
              <ScoringWeightsForm
                configType="biological_safety"
                title="Biological Safety Index"
                fields={[
                  { key: "relative_humidity", label: "Humidity" },
                  { key: "temperature", label: "Temperature" },
                  { key: "co2", label: "CO2" },
                  { key: "tvoc", label: "TVOC" },
                  { key: "pm2_5", label: "PM2.5" },
                  { key: "pm10", label: "PM10" },
                ]}
                weights={weightsByType.get("biological_safety") ?? {}}
              />
              <ScoringWeightsForm
                configType="luxury_perception"
                title="Luxury Perception Index"
                fields={[
                  { key: "level", label: "Current level" },
                  { key: "stability", label: "Stability" },
                ]}
                weights={weightsByType.get("luxury_perception") ?? {}}
              />
              <ScoringWeightsForm
                configType="overall"
                title="Overall Environmental Score"
                fields={[
                  { key: "comfort", label: "Comfort" },
                  { key: "biological_safety", label: "Biological Safety" },
                  { key: "mould_risk", label: "Mould Risk (inverted)" },
                  { key: "luxury_perception", label: "Luxury Perception" },
                ]}
                weights={weightsByType.get("overall") ?? {}}
              />
            </div>
          ) : (
            <Alert>
              <AlertDescription>Only admins can edit scoring weights.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thresholds{yacht ? ` — ${yacht.name}` : ""}</CardTitle>
          <CardDescription>
            Preferred range, warning/critical bounds and alert persistence per parameter. Sourced
            from ASHRAE, WELL Building Standard and EPA/WHO air quality guidance by default — override
            per yacht when a vessel or jurisdiction needs different bounds. Switch yachts from the
            sidebar to edit another vessel&apos;s overrides.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!yacht ? (
            <Alert>
              <AlertDescription>Create a yacht profile to configure thresholds.</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Preferred</TableHead>
                  <TableHead>Warning</TableHead>
                  <TableHead>Critical</TableHead>
                  <TableHead>Persistence</TableHead>
                  <TableHead>Scope</TableHead>
                  {canEditThresholds && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {thresholds.map((t) => {
                  const isOverride = t.yacht_id === yacht.id;
                  return (
                    <TableRow key={t.parameter}>
                      <TableCell className="font-medium">{parameterMeta(t.parameter).label}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.preferred_min ?? "—"} – {t.preferred_max ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.warning_threshold ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.critical_threshold ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.persistence_minutes} min</TableCell>
                      <TableCell>
                        <Badge variant={isOverride ? "default" : "secondary"}>
                          {isOverride ? "Yacht override" : "Company default"}
                        </Badge>
                      </TableCell>
                      {canEditThresholds && (
                        <TableCell>
                          <ThresholdOverrideDialog
                            yachtId={yacht.id}
                            parameter={t.parameter}
                            label={parameterMeta(t.parameter).label}
                            threshold={t}
                            isOverride={isOverride}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
