"use client";

import { useActionState, useState } from "react";
import { Anchor } from "lucide-react";
import {
  signIn,
  signUp,
  requestPasswordReset,
  confirmPasswordReset,
  type AuthActionState,
  type RequestPasswordResetState,
  type ConfirmPasswordResetState,
} from "@/lib/actions/auth";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: AuthActionState = { error: null };
const initialResetState: RequestPasswordResetState = { error: null, sent: false, email: null };
const initialConfirmState: ConfirmPasswordResetState = { error: null };

export default function LoginPage() {
  const [signInState, signInAction, signInPending] = useActionState(signIn, initialState);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initialState);
  const [resetState, resetAction, resetPending] = useActionState(
    requestPasswordReset,
    initialResetState,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmPasswordReset,
    initialConfirmState,
  );
  const [showReset, setShowReset] = useState(false);

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
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Access the environmental and biological safety dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-4">
                <form action={signInAction} className="space-y-4">
                  {signInState.error && (
                    <Alert variant="destructive">
                      <AlertDescription>{signInState.error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={signInPending}>
                    {signInPending ? "Signing in..." : "Sign In"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowReset((v) => !v)}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Forgot password?
                  </button>
                </form>

                {showReset && (
                  <form action={resetAction} className="space-y-3 mt-4 pt-4 border-t">
                    {resetState.error && (
                      <Alert variant="destructive">
                        <AlertDescription>{resetState.error}</AlertDescription>
                      </Alert>
                    )}
                    {resetState.sent && resetState.email ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          If an account exists for that email, a message was sent with a reset
                          link and a 6-digit code. The code is more reliable — some email
                          providers&apos; link scanners can invalidate the link before you click
                          it, so enter the code below instead.
                        </p>
                        {confirmState.error && (
                          <Alert variant="destructive">
                            <AlertDescription>{confirmState.error}</AlertDescription>
                          </Alert>
                        )}
                        <form action={confirmAction} className="space-y-3">
                          <input type="hidden" name="email" value={resetState.email} />
                          <div className="space-y-2">
                            <Label htmlFor="reset-token">6-digit code</Label>
                            <Input
                              id="reset-token"
                              name="token"
                              type="text"
                              inputMode="numeric"
                              required
                              autoComplete="one-time-code"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="reset-new-password">New password</Label>
                            <Input
                              id="reset-new-password"
                              name="password"
                              type="password"
                              required
                              minLength={8}
                              autoComplete="new-password"
                            />
                          </div>
                          <Button
                            type="submit"
                            variant="outline"
                            className="w-full"
                            disabled={confirmPending}
                          >
                            {confirmPending ? "Updating..." : "Update password"}
                          </Button>
                        </form>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="reset-email">Email</Label>
                          <Input
                            id="reset-email"
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                          />
                        </div>
                        <Button
                          type="submit"
                          variant="outline"
                          className="w-full"
                          disabled={resetPending}
                        >
                          {resetPending ? "Sending..." : "Send reset link"}
                        </Button>
                      </>
                    )}
                  </form>
                )}
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form action={signUpAction} className="space-y-4">
                  {signUpState.error && (
                    <Alert variant="destructive">
                      <AlertDescription>{signUpState.error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" name="fullName" type="text" autoComplete="name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={signUpPending}>
                    {signUpPending ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
