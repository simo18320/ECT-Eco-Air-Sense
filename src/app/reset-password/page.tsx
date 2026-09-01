"use client";

import { useEffect, useState, useActionState } from "react";
import { Anchor } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updatePassword, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: AuthActionState = { error: null };

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, initialState);
  const [sessionReady, setSessionReady] = useState<"pending" | "ready" | "missing">("pending");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setSessionReady(data.session ? "ready" : "missing");
    });
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-sidebar px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
            <Anchor className="h-6 w-6 text-accent-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-sidebar-foreground tracking-tight">
            Yacht Environmental Monitoring
          </h1>
          <p className="text-sm text-sidebar-foreground/60">Eco Cleaning Technologies</p>
        </div>

        <Card className="border-sidebar-border/50">
          <CardHeader>
            <CardTitle>Set a new password</CardTitle>
            <CardDescription>Choose a new password for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionReady === "pending" && (
              <p className="text-sm text-muted-foreground">Verifying your reset link...</p>
            )}
            {sessionReady === "missing" && (
              <Alert variant="destructive">
                <AlertDescription>
                  This reset link is invalid or has expired. Request a new one from the sign-in page.
                </AlertDescription>
              </Alert>
            )}
            {sessionReady === "ready" && (
              <form action={action} className="space-y-4">
                {state.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{state.error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Updating..." : "Update password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
