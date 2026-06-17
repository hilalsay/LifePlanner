import { Moon, Sun, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title: string;
  assistantOpen?: boolean;
  onToggleAssistant?: () => void;
}

export function TopBar({ title, assistantOpen, onToggleAssistant }: TopBarProps) {
  const { theme, toggle } = useTheme();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4">
      <div className="flex items-center gap-2">
        <h1 className="text-base font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleAssistant}
          title="Assistant"
          className={cn(assistantOpen && "bg-primary/10 text-primary")}
        >
          <Sparkles className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggle} title="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
