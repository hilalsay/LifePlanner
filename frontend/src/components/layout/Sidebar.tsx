import { NavLink } from "react-router-dom";
import { Settings, LogOut, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { NAV_GROUPS } from "./nav";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "relative flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
    isActive
      ? "bg-primary-soft text-primary before:absolute before:inset-y-2.5 before:-left-2 before:w-1 before:rounded-full before:bg-primary"
      : "text-muted-foreground hover:bg-accent hover:text-foreground"
  );

/** Shared sidebar body, used by the desktop sidebar and the mobile drawer. */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <img src="/android-chrome-192x192.png" alt="" className="h-7 w-7 rounded-lg dark:invert" />
        <span className="font-display text-lg font-semibold">Life Planner</span>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.key} className="mt-4 first:mt-2">
            <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
              {t(group.key)}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, key }) => (
                <li key={to}>
                  <NavLink to={to} onClick={onNavigate} className={linkClass}>
                    <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                    {t(key)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-0.5 border-t px-3 py-3">
        <NavLink to="/settings" onClick={onNavigate} className={linkClass}>
          <Settings className="h-[18px] w-[18px] shrink-0" aria-hidden />
          {t("nav.settings")}
        </NavLink>
        {user?.is_admin && (
          <NavLink to="/admin" onClick={onNavigate} className={linkClass}>
            <ShieldCheck className="h-[18px] w-[18px] shrink-0" aria-hidden />
            Admin
          </NavLink>
        )}
        {user && (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                {(user.display_name || user.email)[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.display_name || user.email.split("@")[0]}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <button
              onClick={logout}
              aria-label={t("nav.signOut")}
              title={t("nav.signOut")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r bg-card md:flex">
      <SidebarContent />
    </aside>
  );
}
