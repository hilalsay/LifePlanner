import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/LanguageContext";
import { BOTTOM_NAV } from "./nav";

export function BottomNav() {
  const { t } = useI18n();
  return (
    <nav aria-label="Primary" className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t bg-card/95 backdrop-blur md:hidden">
      <ul className="flex h-16 items-stretch justify-around px-1">
        {BOTTOM_NAV.map(({ to, icon: Icon, key }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  "group flex h-full min-h-[44px] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150",
                    isActive ? "bg-primary-soft" : "group-active:bg-accent"
                  )}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="max-w-full truncate px-0.5">{t(key)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
