import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/LanguageContext";
import { SidebarContent } from "./Sidebar";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Slide-in navigation drawer for mobile (< md). Animated with a CSS transform
 * so no extra dependency is needed. Stays above the bottom nav (z-50).
 */
export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const { t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // `inert` keeps the off-screen drawer out of the tab order (React 18 has no prop for it).
  useEffect(() => {
    rootRef.current?.toggleAttribute("inert", !open);
  }, [open]);

  // Lock body scroll, move focus into the drawer, and close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div className="md:hidden" aria-hidden={!open} ref={rootRef}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[55] bg-black/40 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-y-0 left-0 z-[60] flex w-72 max-w-[82%] flex-col border-r bg-card shadow-lg",
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label={t("nav.close")}
          className="absolute right-2 top-3 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  );
}
