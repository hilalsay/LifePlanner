import { Moon, Sun, Sparkles, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useI18n } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title: string;
  assistantOpen?: boolean;
  onToggleAssistant?: () => void;
  onOpenMenu?: () => void;
}

export function TopBar({ title, assistantOpen, onToggleAssistant, onOpenMenu }: TopBarProps) {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/90 px-2 backdrop-blur md:h-16 md:px-6">
      <div className="flex min-w-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMenu}
          aria-label={t("nav.menu")}
          className="h-11 w-11 md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
        <h1 className="truncate font-display text-xl font-semibold md:text-2xl">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <LanguageToggle className="hidden sm:inline-flex" />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={t("topbar.toggleTheme")}
          title={t("topbar.toggleTheme")}
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" aria-hidden /> : <Moon className="h-[18px] w-[18px]" aria-hidden />}
        </Button>
        <Button
          variant={assistantOpen ? "default" : "outline"}
          onClick={onToggleAssistant}
          aria-pressed={assistantOpen}
          title={t("topbar.assistant")} aria-label={t("topbar.assistant")}
          className={cn("ml-1 h-10 gap-1.5 rounded-full px-3.5")}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          <span>AIzen</span>
        </Button>
      </div>
    </header>
  );
}
