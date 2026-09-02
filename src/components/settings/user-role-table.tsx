"use client";

import { useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserRole, updateUserYachtAccess } from "@/lib/actions/users";
import { cn } from "@/lib/utils";
import type { Tables, Enums } from "@/types/database";

const ROLES: Enums<"user_role">[] = ["admin", "technical", "captain", "viewer"];
const SCOPED_ROLES: Enums<"user_role">[] = ["captain", "viewer"];

export function UserRoleTable({
  users,
  currentUserId,
  yachts,
  yachtAccessByUser,
}: {
  users: Tables<"app_users">[];
  currentUserId: string;
  yachts: { id: string; name: string }[];
  yachtAccessByUser: Record<string, string[]>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="w-40">Role</TableHead>
          <TableHead>Yacht Access</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => {
          const isScoped = SCOPED_ROLES.includes(u.role);
          const accessible = yachtAccessByUser[u.id] ?? [];
          return (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{u.email}</TableCell>
              <TableCell>
                <Select
                  defaultValue={u.role}
                  disabled={isPending || u.id === currentUserId}
                  onValueChange={(value) =>
                    startTransition(() => updateUserRole(u.id, value as Enums<"user_role">))
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                {!isScoped ? (
                  <span className="text-xs text-muted-foreground">All yachts</span>
                ) : yachts.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No yachts yet</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {yachts.map((yacht) => {
                      const isChecked = accessible.includes(yacht.id);
                      return (
                        <button
                          key={yacht.id}
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(() =>
                              updateUserYachtAccess(
                                u.id,
                                isChecked
                                  ? accessible.filter((id) => id !== yacht.id)
                                  : [...accessible, yacht.id],
                              ),
                            )
                          }
                          className={cn(
                            "rounded-md px-2 py-1 text-xs border",
                            isChecked
                              ? "bg-secondary border-secondary-foreground/20 font-medium"
                              : "border-border text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {yacht.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
