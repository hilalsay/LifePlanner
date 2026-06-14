import { NavLink } from "react-router-dom";
import { CalendarDays, CalendarRange, Target, Flame, CalendarCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", icon: CalendarDays, label: "Today" },
  { to: "/week", icon: CalendarRange, label: "Week" },
  { to: "/vision", icon: Target, label: "Vision" },
  { to: "/habits", icon: Flame, label: "Habits" },
  { to: "/overview", icon: CalendarCheck2, label: "Overview" },
];

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card">
      <ul className="flex h-16 items-center justify-around px-2">
        {nav.map(({ to, icon: Icon, label }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
