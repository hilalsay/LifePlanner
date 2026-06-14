import { NavLink } from "react-router-dom";
import {
  CalendarDays,
  CalendarRange,
  Calendar,
  LayoutGrid,
  Target,
  Flame,
  BarChart3,
  CalendarCheck2,
  Settings,
  Sparkles,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const nav = [
  { to: "/", icon: CalendarDays, label: "Today" },
  { to: "/week", icon: CalendarRange, label: "Week" },
  { to: "/month", icon: Calendar, label: "Month" },
  { to: "/year", icon: LayoutGrid, label: "Year" },
  { to: "/vision", icon: Target, label: "Vision" },
  { to: "/habits", icon: Flame, label: "Habits" },
  { to: "/tracking", icon: BarChart3, label: "Tracking" },
  { to: "/overview", icon: CalendarCheck2, label: "Overview" },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="hidden md:flex h-screen w-60 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <span className="font-semibold tracking-tight">Life Planner</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {nav.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t px-2 py-4 space-y-1">
        {user && (
          <div className="flex items-center gap-3 rounded-md px-3 py-2">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                {user.email[0].toUpperCase()}
              </div>
            )}
            <span className="flex-1 truncate text-xs text-muted-foreground">
              {user.display_name || user.email}
            </span>
            <button
              onClick={logout}
              title="Sign out"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )
          }
        >
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
