import { useEffect } from "react";
import { cn } from "@/lib/utils";
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
  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="md:hidden" aria-hidden={!open}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[55] bg-black/50 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-y-0 left-0 z-[60] flex w-72 max-w-[82%] flex-col border-r bg-card shadow-xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  );
}
