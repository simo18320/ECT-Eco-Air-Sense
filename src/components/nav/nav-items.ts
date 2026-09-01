import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Activity,
  Map,
  MapPin,
  LineChart,
  ShieldAlert,
  Sparkles,
  FileText,
  Ship,
  Settings,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Visible in the simplified Captain view (§33). Everything is visible in full/technical view. */
  captainVisible: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard, captainVisible: true },
  { href: "/live", label: "Live / Monitoring", icon: Activity, captainVisible: false },
  { href: "/yacht-plan", label: "Yacht Plan", icon: Map, captainVisible: true },
  { href: "/locations", label: "Locations", icon: MapPin, captainVisible: false },
  { href: "/analysis", label: "Analysis", icon: LineChart, captainVisible: false },
  { href: "/risk", label: "Risk", icon: ShieldAlert, captainVisible: true },
  { href: "/ai-insights", label: "AI Insights", icon: Sparkles, captainVisible: true },
  { href: "/reports", label: "Reports", icon: FileText, captainVisible: true },
  { href: "/yacht-profile", label: "Yacht Profile", icon: Ship, captainVisible: false },
  { href: "/settings", label: "Settings", icon: Settings, captainVisible: false },
];
