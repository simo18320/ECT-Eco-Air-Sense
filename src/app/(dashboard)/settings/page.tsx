import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/current-user";
import { BrandingForm } from "@/components/settings/branding-form";
import { UserRoleTable } from "@/components/settings/user-role-table";
import { ScoringWeightsForm } from "@/components/settings/scoring-weights-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const [{ data: users }, { data: scoringConfigs }, { data: thresholds }] = await Promise.all([
    supabase.from("app_users").select("*").order("created_at", { ascending: true }),
    supabase
      .from("scoring_configurations")
      .select("config_type, weights")
      .eq("company_id", user.companyId)
      .is("yacht_id", null),
    supabase.from("thresholds").select("*").eq("company_id", user.companyId).is("yacht_id", null).order("parameter"),
  ]);

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
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            New team members create their own account from the sign-in screen, then an admin
            assigns their role here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.role === "admin" ? (
            <UserRoleTable users={users ?? []} currentUserId={user.id} />
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
          <CardTitle>Thresholds</CardTitle>
          <CardDescription>
            Preferred range, warning/critical bounds and alert persistence per parameter. Sourced
            from ASHRAE, WELL Building Standard and EPA/WHO air quality guidance — adjust for your
            vessel and jurisdiction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Preferred</TableHead>
                <TableHead>Warning</TableHead>
                <TableHead>Critical</TableHead>
                <TableHead>Persistence</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(thresholds ?? []).map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium capitalize">{t.parameter.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.preferred_min ?? "—"} – {t.preferred_max ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.warning_threshold ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.critical_threshold ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.persistence_minutes} min</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-48">{t.source_reference}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-3">
            Editable threshold values arrive alongside per-yacht overrides in a follow-up pass —
            for now, ask if you need a specific value changed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
