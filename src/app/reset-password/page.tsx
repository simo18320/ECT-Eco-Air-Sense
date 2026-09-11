"use client";

import { useEffect, useState, useActionState } from "react";
import Image from "next/image";
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
    const code = new URL(window.location.href).searchParams.get("code");

    // The browser client defaults to the PKCE flow: a recovery link lands
    // here as ?code=... and getSession() alone never picks that up — it
    // has to be explicitly exchanged for a session first. Without this,
    // a perfectly valid, just-clicked link shows as "invalid or expired".
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        setSessionReady(error ? "missing" : "ready");
      });
    } else {
      supabase.auth.getSession().then(({ data }) => {
        setSessionReady(data.session ? "ready" : "missing");
      });
    }
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-sidebar px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex px-4 py-3 items-center justify-center rounded-xl bg-white">
            <Image src="/logo.png" alt="Eco Air Sense" width={192} height={101} className="h-14 w-auto object-contain" />
          </div>
          <h1 className="text-xl font-semibold text-sidebar-foreground tracking-tight">
            Monitoring Platform
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
