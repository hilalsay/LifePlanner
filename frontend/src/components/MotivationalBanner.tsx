import { useState, useEffect } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiApi } from "@/lib/api";

const LOCAL_FALLBACKS = [
  "You didn't come this far to only come this far. Unless you did. In which case, impressive.",
  "Today's agenda: be slightly less chaotic than yesterday. Baby steps.",
  "Your future self is watching you. They look tired but proud.",
  "Goals: written down. Plans: half-formed. Vibes: immaculate.",
  "Discipline is just motivation you remembered to automate.",
];

export function MotivationalBanner() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"local" | "ai">("local");

  const fetchMessage = async (useAI = false) => {
    setLoading(true);
    try {
      const data = await aiApi.getMotivational(useAI);
      setMessage(data.message);
      setSource(data.source as "local" | "ai");
    } catch {
      setMessage(LOCAL_FALLBACKS[Math.floor(Math.random() * LOCAL_FALLBACKS.length)]);
      setSource("local");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessage(false);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="flex-1 text-sm italic text-muted-foreground">
          {loading ? "Loading wisdom..." : message}
        </p>
        <div className="flex items-center gap-1">
          {source === "ai" && (
            <span className="text-xs text-primary/60">AI</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => fetchMessage(true)}
            disabled={loading}
            title="Refresh with AI"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
