import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserVisitStats } from "@/lib/data/user-visits";

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function UserVisitStatsTable({ stats }: { stats: UserVisitStats[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="w-24">Role</TableHead>
          <TableHead className="w-32">Days Visited</TableHead>
          <TableHead className="w-32">Last Visit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stats.map((s) => (
          <TableRow key={s.userId}>
            <TableCell className="font-medium">{s.fullName ?? "—"}</TableCell>
            <TableCell className="text-muted-foreground">{s.email}</TableCell>
            <TableCell className="capitalize">{s.role}</TableCell>
            <TableCell>{s.totalVisitDays}</TableCell>
            <TableCell className="text-muted-foreground">{formatDate(s.lastVisitDate)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
