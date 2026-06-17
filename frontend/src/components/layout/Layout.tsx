import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { AssistantPanel } from "@/components/chat/AssistantPanel";
import { useI18n } from "@/contexts/LanguageContext";

const TITLE_PATHS = new Set(["/", "/week", "/month", "/year", "/vision", "/habits", "/tracking", "/settings"]);

export function Layout() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const title = TITLE_PATHS.has(pathname) ? t(`title.${pathname}`) : t("title.default");
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          title={title}
          assistantOpen={assistantOpen}
          onToggleAssistant={() => setAssistantOpen((o) => !o)}
        />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
          <Outlet />
        </main>
        <BottomNav />
      </div>
      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}
