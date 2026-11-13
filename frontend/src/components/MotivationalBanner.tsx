import { useState, useEffect } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiApi } from "@/lib/api";
import { useI18n } from "@/contexts/LanguageContext";

const LOCAL_FALLBACKS: Record<string, string[]> = {
  en: [
    "You didn't come this far to only come this far. Unless you did. In which case, impressive.",
    "Today's agenda: be slightly less chaotic than yesterday. Baby steps.",
    "Your future self is watching you. They look tired but proud.",
    "Goals: written down. Plans: half-formed. Vibes: immaculate.",
    "Discipline is just motivation you remembered to automate.",
  ],
  tr: [
    "Bu kadar yolu sadece burada durmak için gelmedin. Geldiysen de, etkileyici.",
    "Bugünün gündemi: dünden biraz daha az dağınık ol. Küçük adımlar.",
    "Gelecekteki sen seni izliyor. Yorgun ama gururlu görünüyor.",
    "Hedefler: yazıldı. Planlar: yarım. Mod: mükemmel.",
    "Disiplin, otomatikleştirmeyi hatırladığın motivasyondur.",
  ],
};

export function MotivationalBanner() {
  const { t, lang } = useI18n();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"local" | "ai">("local");

  const localMessage = () => {
    const pool = LOCAL_FALLBACKS[lang] ?? LOCAL_FALLBACKS.en;
    setMessage(pool[Math.floor(Math.random() * pool.length)]);
    setSource("local");
  };

  const fetchMessage = async (useAI = false) => {
    // Non-AI path: use the localized fallback pool directly (no round-trip).
    if (!useAI) {
      localMessage();
      return;
    }
    setLoading(true);
    try {
      const data = await aiApi.getMotivational(true, lang);
      setMessage(data.message);
      setSource(data.source as "local" | "ai");
    } catch {
      localMessage();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessage(false);
  }, []);

  return (
    <figure className="rounded-xl bg-sunken px-4 py-3">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p aria-live="polite" className="flex-1 font-display text-[15px] italic leading-relaxed text-muted-foreground">
          {loading ? t("banner.loading") : message}
        </p>
        <div className="flex items-center gap-1">
          {source === "ai" && (
            <span className="text-xs text-primary/60">AI</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="-my-1.5 h-9 w-9 text-muted-foreground"
            onClick={() => fetchMessage(true)}
            disabled={loading}
            aria-label={t("banner.refresh")}
            title={t("banner.refresh")}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
          </Button>
        </div>
      </div>
    </figure>
  );
}
