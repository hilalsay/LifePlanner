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
    <header className="flex h-14 items-center justify-between border-b bg-card px-2 md:px-4">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMenu}
          title={t("nav.menu")}
          className="h-11 w-11 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleAssistant}
          title={t("topbar.assistant")}
          className={cn(assistantOpen && "bg-primary/10 text-primary")}
        >
          <Sparkles className="h-4 w-4" />
        </Button>
        <LanguageToggle />
        <Button variant="ghost" size="icon" onClick={toggle} title={t("topbar.toggleTheme")}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
