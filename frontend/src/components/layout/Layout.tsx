import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileDrawer } from "./MobileDrawer";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { AssistantPanel } from "@/components/chat/AssistantPanel";
import { useI18n } from "@/contexts/LanguageContext";

const TITLE_PATHS = new Set([
  "/today", "/week", "/month", "/vision", "/habits", "/reading", "/settings",
]);

export function Layout() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const title = pathname === "/admin" ? "Admin"
    : TITLE_PATHS.has(pathname) ? t(`title.${pathname}`) : t("title.default");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Keep the browser tab title in sync with the page.
  useEffect(() => {
    document.title = title === "Life Planner" ? title : `${title} · Life Planner`;
  }, [title]);

  // On mobile AIzen covers the whole screen, so close it when the route changes
  // (e.g. tapping a bottom-nav tab). On desktop the panel sits beside the content,
  // so leave it open there.
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setAssistantOpen(false);
    }
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <a
        href="#main"
        className="sr-only z-[100] rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {t("nav.skip")}
      </a>
      <Sidebar />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          title={title}
          assistantOpen={assistantOpen}
          onToggleAssistant={() => setAssistantOpen((o) => !o)}
          onOpenMenu={() => setDrawerOpen(true)}
        />
        <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto px-4 pb-24 pt-4 outline-none md:px-8 md:pb-10 md:pt-6">
          <div key={pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </main>
        <BottomNav />
      </div>
      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}
