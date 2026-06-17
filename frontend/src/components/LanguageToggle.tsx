import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/LanguageContext";
import { LANG_LABEL } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, toggle, t } = useI18n();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      title={t("topbar.language")}
      className={cn("gap-1.5 px-2", className)}
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs font-semibold">{LANG_LABEL[lang]}</span>
    </Button>
  );
}
