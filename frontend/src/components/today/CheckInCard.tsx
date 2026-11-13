import { useEffect, useRef, useState } from "react";
import { ChevronDown, Minus, Plus, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { inputClass } from "@/components/ui/input";
import { trackingApi, type HealthEntry, type MoodEntry } from "@/lib/api";
import { useI18n } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

// Five quick levels mapped onto the stored 1–10 scale.
const LEVELS = [
  { score: 2, emoji: "😞" },
  { score: 4, emoji: "😕" },
  { score: 6, emoji: "😐" },
  { score: 8, emoji: "🙂" },
  { score: 10, emoji: "😄" },
];
const ENERGY = [
  { score: 2, emoji: "🪫" },
  { score: 4, emoji: "😴" },
  { score: 6, emoji: "🙂" },
  { score: 8, emoji: "💪" },
  { score: 10, emoji: "⚡" },
];
const nearest = (s?: number) => (s == null ? undefined : LEVELS.reduce((a, b) => (Math.abs(b.score - s) < Math.abs(a.score - s) ? b : a)).score);

type HealthField = "sleep_hours" | "water_glasses" | "exercise_minutes" | "steps" | "weight_kg";

/** One card replaces the old Tracking page's Mood + Health tabs. Saves as you tap. */
export function CheckInCard({ dateStr }: { dateStr: string }) {
  const { t } = useI18n();
  const [mood, setMood] = useState<number | undefined>();
  const [energy, setEnergy] = useState<number | undefined>();
  const [health, setHealth] = useState<Partial<HealthEntry>>({});
  const [more, setMore] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const savedTimer = useRef<number>();

  useEffect(() => {
    let cancelled = false;
    setMood(undefined); setEnergy(undefined); setHealth({});
    Promise.all([trackingApi.getMood(dateStr, dateStr), trackingApi.getHealth(dateStr, dateStr)])
      .then(([m, h]) => {
        if (cancelled) return;
        const me: MoodEntry | undefined = m[0];
        setMood(nearest(me?.mood_score));
        setEnergy(nearest(me?.energy_score));
        setHealth(h[0] ?? {});
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [dateStr]);

  const flashSaved = () => {
    setSaved(true);
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 1800);
  };

  const run = async (fn: () => Promise<unknown>) => {
    try { setError(false); await fn(); flashSaved(); } catch { setError(true); }
  };

  const pickMood = (score: number, which: "mood" | "energy") => {
    const m = which === "mood" ? score : mood;
    const e = which === "energy" ? score : energy;
    if (which === "mood") setMood(score); else setEnergy(score);
    // The API stores both together; save once both are known.
    if (m != null && e != null) run(() => trackingApi.createMood({ entry_date: dateStr, mood_score: m, energy_score: e }));
  };

  const setHealthField = (field: HealthField, value: number | undefined) => {
    setHealth((h) => ({ ...h, [field]: value }));
    if (value != null && !Number.isNaN(value)) run(() => trackingApi.upsertHealth({ entry_date: dateStr, [field]: value }));
  };

  const scale = (label: string, levels: typeof LEVELS, value: number | undefined, which: "mood" | "energy") => (
    <div className="flex items-center justify-between gap-3">
      <span id={`ci-${which}`} className="w-16 shrink-0 text-sm font-medium">{label}</span>
      <div role="radiogroup" aria-labelledby={`ci-${which}`} className="flex flex-1 justify-between gap-1 sm:justify-start sm:gap-2">
        {levels.map((l, i) => (
          <button
            key={l.score}
            type="button"
            role="radio"
            aria-checked={value === l.score}
            aria-label={`${label} ${i + 1}/5`}
            onClick={() => pickMood(l.score, which)}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full text-xl transition-[background-color,transform] duration-150 active:scale-90",
              value === l.score ? "bg-primary-soft ring-2 ring-primary" : "grayscale-[60%] hover:bg-accent hover:grayscale-0",
            )}
          >
            <span aria-hidden>{l.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const stepper = (field: HealthField, label: string, step: number, unit: string) => {
    const v = health[field] as number | undefined;
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg bg-sunken px-3 py-1.5">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-1">
          <button type="button" aria-label={`${label} −`} onClick={() => setHealthField(field, Math.max(0, (v ?? 0) - step))}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <span className="w-12 text-center text-sm font-semibold tabular-nums" aria-live="polite">{v ?? "–"}{v != null ? unit : ""}</span>
          <button type="button" aria-label={`${label} +`} onClick={() => setHealthField(field, (v ?? 0) + step)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    );
  };

  const numberField = (field: HealthField, label: string) => (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        defaultValue={(health[field] as number | undefined) ?? ""}
        key={`${dateStr}-${field}-${health[field] ?? ""}`}
        onBlur={(e) => e.target.value !== "" && setHealthField(field, Number(e.target.value))}
        className={cn(inputClass, "h-10")}
      />
    </label>
  );

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("today.checkIn")}</h2>
        <span role="status" className={cn("flex items-center gap-1 text-xs font-medium text-success transition-opacity", saved ? "opacity-100" : "opacity-0")}>
          <Check className="h-3.5 w-3.5" aria-hidden />{t("common.savedShort")}
        </span>
      </div>
      {scale(t("tracking.mood"), LEVELS, mood, "mood")}
      {scale(t("tracking.energy"), ENERGY, energy, "energy")}
      <div className="grid gap-2">
        {stepper("sleep_hours", t("tracking.sleepShort"), 0.5, "h")}
        {stepper("water_glasses", t("tracking.waterShort"), 1, "")}
      </div>
      <button
        type="button"
        onClick={() => setMore((m) => !m)}
        aria-expanded={more}
        className="flex min-h-[36px] items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform duration-150", !more && "-rotate-90")} aria-hidden />
        {t("today.moreHealth")}
      </button>
      {more && (
        <div className="grid grid-cols-3 gap-2">
          {numberField("exercise_minutes", t("tracking.exerciseShort"))}
          {numberField("steps", t("tracking.steps"))}
          {numberField("weight_kg", t("tracking.weightShort"))}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-danger">{t("common.saveError")}</p>}
    </Card>
  );
}
