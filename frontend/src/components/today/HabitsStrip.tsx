import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Flame } from "lucide-react";
import { habitsApi, type Habit, type HabitEntry } from "@/lib/api";
import { useI18n } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

/** Today's habits as one-tap chips, so checking in doesn't need a page switch. */
export function HabitsStrip({ dateStr }: { dateStr: string }) {
  const { t } = useI18n();
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [entries, setEntries] = useState<HabitEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([habitsApi.getHabits(true), habitsApi.getEntries(undefined, dateStr, dateStr)])
      .then(([h, e]) => { if (!cancelled) { setHabits(h); setEntries(e); } })
      .catch(() => { if (!cancelled) setHabits([]); });
    return () => { cancelled = true; };
  }, [dateStr]);

  if (!habits || habits.length === 0) return null;

  const isDone = (id: string) => entries.some((e) => e.habit_id === id && e.completed);
  const doneCount = habits.filter((h) => isDone(h.id)).length;

  const toggle = async (h: Habit) => {
    const next = !isDone(h.id);
    // optimistic
    setEntries((es) => [...es.filter((e) => e.habit_id !== h.id), { habit_id: h.id, entry_date: dateStr, completed: next } as HabitEntry]);
    try {
      const saved = await habitsApi.upsertEntry({ habit_id: h.id, entry_date: dateStr, completed: next, count: next ? 1 : 0 });
      setEntries((es) => [...es.filter((e) => e.habit_id !== h.id), saved]);
    } catch {
      setEntries((es) => [...es.filter((e) => e.habit_id !== h.id), { habit_id: h.id, entry_date: dateStr, completed: !next } as HabitEntry]);
    }
  };

  return (
    <section aria-labelledby="habits-today" className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 id="habits-today" className="flex items-center gap-1.5 text-sm font-semibold">
          <Flame className="h-4 w-4 text-warning" aria-hidden />
          {t("nav.habits")}
          <span className="font-normal text-muted-foreground">· {doneCount}/{habits.length}</span>
        </h2>
        <Link to="/habits" className="text-sm font-medium text-primary hover:underline">{t("today.manageHabits")}</Link>
      </div>
      <ul className="flex flex-wrap gap-2">
        {habits.map((h) => {
          const done = isDone(h.id);
          return (
            <li key={h.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                onClick={() => toggle(h)}
                className={cn(
                  "flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors duration-150 active:scale-[0.97]",
                  done ? "border-transparent bg-primary text-primary-foreground" : "bg-card hover:border-primary/50 hover:bg-primary-soft",
                )}
              >
                <span
                  aria-hidden
                  className={cn("flex h-4 w-4 items-center justify-center rounded-full border-2", done ? "border-primary-foreground" : "")}
                  style={done ? undefined : { borderColor: h.color }}
                >
                  {done && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
                </span>
                {h.name}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
