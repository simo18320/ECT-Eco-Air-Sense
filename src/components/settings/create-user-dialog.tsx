"use client";

import { useState, useActionState, useEffect } from "react";
import { UserPlus } from "lucide-react";
import { createUserAccount } from "@/lib/actions/users";
import { ACTION_INITIAL_STATE } from "@/lib/actions/action-state";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Enums } from "@/types/database";

const ROLES: Enums<"user_role">[] = ["admin", "technical", "captain", "viewer"];

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Enums<"user_role">>("viewer");
  const [state, formAction, pending] = useActionState(createUserAccount, ACTION_INITIAL_STATE);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setRole("viewer");
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="h-3.5 w-3.5" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <p className="text-xs text-muted-foreground">
            Creates the account immediately with the password you set here — no email is sent.
            Share the password with them directly.
          </p>
          <div className="space-y-2">
            <Label htmlFor="create-user-name">Full name</Label>
            <Input id="create-user-name" name="fullName" type="text" autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-user-email">Email</Label>
            <Input id="create-user-email" name="email" type="email" required autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-user-password">Password</Label>
            <Input
              id="create-user-password"
              name="password"
              type="text"
              required
              minLength={8}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-user-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Enums<"user_role">)}>
              <SelectTrigger id="create-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="role" value={role} />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating..." : "Create User"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
