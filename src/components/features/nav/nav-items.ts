import { LayoutDashboard, LineChart, User } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/profile", label: "Profile", icon: User },
] as const;
