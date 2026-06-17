import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { AssistantPanel } from "@/components/chat/AssistantPanel";

const PAGE_TITLES: Record<string, string> = {
  "/": "Today",
  "/week": "This Week",
  "/month": "This Month",
  "/year": "This Year",
  "/vision": "Life Vision",
  "/habits": "Habits",
  "/tracking": "Tracking",
  "/settings": "Settings",
};

export function Layout() {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] ?? "Life Planner";
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
