import { NavLink } from "react-router-dom";
import { CalendarDays, CalendarRange, Calendar, Flame, CalendarCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/LanguageContext";

const nav = [
  { to: "/", icon: CalendarDays, key: "nav.today" },
  { to: "/week", icon: CalendarRange, key: "nav.week" },
  { to: "/month", icon: Calendar, key: "nav.month" },
  { to: "/habits", icon: Flame, key: "nav.habits" },
  { to: "/overview", icon: CalendarCheck2, key: "nav.overview" },
];

export function BottomNav() {
  const { t } = useI18n();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 border-t bg-card">
      <ul className="flex h-full items-stretch justify-around px-1">
        {nav.map(({ to, icon: Icon, key }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground active:bg-accent"
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate px-0.5">{t(key)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
