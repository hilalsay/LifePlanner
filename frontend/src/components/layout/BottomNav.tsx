import { NavLink } from "react-router-dom";
import { CalendarDays, CalendarRange, Target, Flame, CalendarCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/LanguageContext";

const nav = [
  { to: "/", icon: CalendarDays, key: "nav.today" },
  { to: "/week", icon: CalendarRange, key: "nav.week" },
  { to: "/vision", icon: Target, key: "nav.vision" },
  { to: "/habits", icon: Flame, key: "nav.habits" },
  { to: "/overview", icon: CalendarCheck2, key: "nav.overview" },
];

export function BottomNav() {
  const { t } = useI18n();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card">
      <ul className="flex h-16 items-center justify-around px-2">
        {nav.map(({ to, icon: Icon, key }) => (
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
              {t(key)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
