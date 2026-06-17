import { useState, useEffect } from "react";
import { Plus, Flame } from "lucide-react";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { habitsApi, type Habit, type HabitEntry } from "@/lib/api";
import { toDateString } from "@/lib/utils";
import { setChatDragItem } from "@/lib/dragItem";
import { useI18n } from "@/contexts/LanguageContext";
import { dateLocale } from "@/lib/dateLocale";

export function HabitTracker() {
  const { t, lang } = useI18n();
  const locale = dateLocale(lang);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [newName, setNewName] = useState("");

  const today = toDateString(new Date());
  const days = Array.from({ length: 7 }, (_, i) => toDateString(subDays(new Date(), 6 - i)));

  useEffect(() => {
    habitsApi.getHabits().then(setHabits).catch(console.error);
    habitsApi
      .getEntries(undefined, days[0], today)
      .then(setEntries)
      .catch(console.error);
  }, []);

  useEffect(() => {
    habits.forEach(async (h) => {
      try {
        const s = await habitsApi.getStreak(h.id);
        setStreaks((prev) => ({ ...prev, [h.id]: s.current_streak }));
      } catch {}
    });
  }, [habits]);

  const isCompleted = (habitId: string, date: string) =>
    entries.some((e) => e.habit_id === habitId && e.entry_date === date && e.completed);

  const toggle = async (habit: Habit, date: string) => {
    const current = isCompleted(habit.id, date);
    const entry = await habitsApi.upsertEntry({
      habit_id: habit.id,
      entry_date: date,
      completed: !current,
      count: !current ? 1 : 0,
    });
    setEntries((es) => {
      const idx = es.findIndex((e) => e.habit_id === habit.id && e.entry_date === date);
      if (idx >= 0) {
        const copy = [...es];
        copy[idx] = entry;
        return copy;
      }
      return [...es, entry];
    });
    const s = await habitsApi.getStreak(habit.id);
    setStreaks((prev) => ({ ...prev, [habit.id]: s.current_streak }));
  };

  const addHabit = async () => {
    if (!newName.trim()) return;
    const h = await habitsApi.createHabit({ name: newName.trim() });
    setHabits((hs) => [...hs, h]);
    setNewName("");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("habits.trackerTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="pb-2 text-left font-medium text-muted-foreground">{t("habits.habitCol")}</th>
                  {days.map((d) => (
                    <th key={d} className="pb-2 text-center text-xs font-medium text-muted-foreground">
                      {format(new Date(d + "T00:00:00"), "EEE", { locale })}
                      <br />
                      <span className="text-xs">{format(new Date(d + "T00:00:00"), "d", { locale })}</span>
                    </th>
                  ))}
                  <th className="pb-2 text-center text-xs font-medium text-muted-foreground">
                    <Flame className="mx-auto h-4 w-4 text-orange-500" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {habits.map((habit) => (
                  <tr key={habit.id}>
                    <td className="py-2 pr-4 font-medium">
                      <div
                        draggable
                        onDragStart={(e) =>
                          setChatDragItem(e, {
                            kind: "habit",
                            title: habit.name,
                            description: habit.description,
                          })
                        }
                        className="flex cursor-grab items-center gap-2 active:cursor-grabbing"
                        title={t("habits.dragHint")}
                      >
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: habit.color }}
                        />
                        {habit.name}
                      </div>
                    </td>
                    {days.map((d) => {
                      const done = isCompleted(habit.id, d);
                      return (
                        <td key={d} className="py-2 text-center">
                          <button
                            onClick={() => toggle(habit, d)}
                            className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                              done
                                ? "text-white"
                                : "bg-muted hover:bg-muted-foreground/20"
                            }`}
                            style={done ? { backgroundColor: habit.color } : {}}
                          >
                            {done && <span className="text-xs">✓</span>}
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-2 text-center">
                      <span className="text-sm font-semibold text-orange-500">
                        {streaks[habit.id] ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addHabit()}
              placeholder={t("habits.addPlaceholder")}
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button size="sm" onClick={addHabit}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
