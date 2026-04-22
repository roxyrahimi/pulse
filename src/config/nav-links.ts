import { LayoutDashboard, ListChecks, Timer, Calendar, Link2, Settings, type LucideIcon } from "lucide-react";

export type NavLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_LINKS: NavLink[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Tasks", href: "/tasks", icon: ListChecks },
  { label: "Focus", href: "/focus", icon: Timer },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Quick Links", href: "/quicklinks", icon: Link2 },
  { label: "Settings", href: "/settings", icon: Settings },
];
