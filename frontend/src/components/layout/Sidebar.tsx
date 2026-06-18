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
import { useI18n } from "@/contexts/LanguageContext";

const nav = [
  { to: "/", icon: CalendarDays, key: "nav.today" },
  { to: "/week", icon: CalendarRange, key: "nav.week" },
  { to: "/month", icon: Calendar, key: "nav.month" },
  { to: "/year", icon: LayoutGrid, key: "nav.year" },
  { to: "/vision", icon: Target, key: "nav.vision" },
  { to: "/habits", icon: Flame, key: "nav.habits" },
  { to: "/tracking", icon: BarChart3, key: "nav.tracking" },
  { to: "/overview", icon: CalendarCheck2, key: "nav.overview" },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary/10 text-primary"
      : "text-muted-foreground hover:bg-accent hover:text-foreground"
  );

/** Shared sidebar body, used by the desktop sidebar and the mobile drawer. */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <span className="font-semibold tracking-tight">Life Planner</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {nav.map(({ to, icon: Icon, key }) => (
            <li key={to}>
              <NavLink to={to} end={to === "/"} onClick={onNavigate} className={linkClass}>
                <Icon className="h-4 w-4 shrink-0" />
                {t(key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t px-2 py-4 space-y-1">
        {user && (
          <div className="flex items-center gap-3 rounded-md px-3 py-2">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
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
              title={t("nav.signOut")}
              className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}

        <NavLink to="/settings" onClick={onNavigate} className={linkClass}>
          <Settings className="h-4 w-4 shrink-0" />
          {t("nav.settings")}
        </NavLink>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex h-screen w-60 flex-col border-r bg-card">
      <SidebarContent />
    </aside>
  );
}
