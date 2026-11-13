import {
  CalendarDays, CalendarRange, Calendar, Target, Flame, BookOpen,
  type LucideIcon,
} from "lucide-react";

export interface NavItem { to: string; icon: LucideIcon; key: string }

/** Single source of truth for app navigation, grouped by intent. */
export const NAV_GROUPS: { key: string; items: NavItem[] }[] = [
  {
    key: "nav.groupPlan",
    items: [
      { to: "/today", icon: CalendarDays, key: "nav.today" },
      { to: "/week", icon: CalendarRange, key: "nav.week" },
      { to: "/month", icon: Calendar, key: "nav.month" },
      { to: "/vision", icon: Target, key: "nav.vision" },
    ],
  },
  {
    key: "nav.groupTrack",
    items: [
      { to: "/habits", icon: Flame, key: "nav.habits" },
      { to: "/reading", icon: BookOpen, key: "nav.reading" },
    ],
  },
];

/** The five most-used destinations, shown in the phone bottom bar. */
export const BOTTOM_NAV = ["/today", "/week", "/month", "/habits", "/vision"]
  .map((to) => NAV_GROUPS.flatMap((g) => g.items).find((i) => i.to === to)!);
