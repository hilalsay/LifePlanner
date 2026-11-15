import { useState, useEffect } from "react";
import { Plus, Flame, MoreVertical, Pencil, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { format, subDays, addDays, isAfter, startOfDay } from "date-fns";
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
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [deleting, setDeleting] = useState<Habit | null>(null);

  // `anchor` is the last (rightmost) day of the visible 7-day window. The user can
  // page backwards without limit; forward is capped at today.
  const todayDate = startOfDay(new Date());
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));

  const today = toDateString(new Date());
  const days = Array.from({ length: 7 }, (_, i) => toDateString(subDays(anchor, 6 - i)));
  const from = days[0];
  const to = days[6];
  const atToday = !isAfter(todayDate, anchor); // anchor >= today → can't go forward

  useEffect(() => {
    habitsApi.getHabits().then(setHabits).catch(console.error);
  }, []);

  // Load completion entries for the currently visible window.
  useEffect(() => {
    habitsApi.getEntries(undefined, from, to).then(setEntries).catch(console.error);
  }, [from, to]);

  useEffect(() => {
    habits.forEach(async (h) => {
      try {
        const s = await habitsApi.getStreak(h.id);
        setStreaks((prev) => ({ ...prev, [h.id]: s.current_streak }));
      } catch {}
    });
  }, [habits]);

  const goPrev = () => setAnchor((a) => subDays(a, 7));
  const goNext = () =>
    setAnchor((a) => {
      const next = addDays(a, 7);
      return isAfter(next, todayDate) ? todayDate : next;
    });

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

  const rangeLabel = `${format(new Date(from + "T00:00:00"), "MMM d", { locale })} – ${format(
    new Date(to + "T00:00:00"),
    "MMM d",
    { locale },
  )}`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{t("habits.trackerTitle")}</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={goPrev} title={t("habits.prevWeek")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[7.5rem] text-center text-xs font-medium text-muted-foreground">
                {rangeLabel}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={goNext}
                disabled={atToday}
                title={t("habits.nextWeek")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
                  <th className="w-8 pb-2" />
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
                    <td className="py-2 text-center">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setMenuFor((m) => (m === habit.id ? null : habit.id))}
                          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title={t("habits.options")}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menuFor === habit.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setMenuFor(null)} />
                            <div className="absolute right-0 z-50 mt-1 w-36 overflow-hidden rounded-md border bg-card shadow-md">
                              <button
                                onClick={() => {
                                  setEditing(habit);
                                  setMenuFor(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                              >
                                <Pencil className="h-3.5 w-3.5" /> {t("habits.edit")}
                              </button>
                              <button
                                onClick={() => {
                                  setDeleting(habit);
                                  setMenuFor(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-accent"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> {t("habits.delete")}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
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

      {editing && (
        <HabitEditModal
          habit={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setHabits((hs) => hs.map((h) => (h.id === updated.id ? updated : h)));
            setEditing(null);
          }}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          habit={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await habitsApi.deleteHabit(deleting.id);
            setHabits((hs) => hs.filter((h) => h.id !== deleting.id));
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

function HabitEditModal({
  habit,
  onClose,
  onSaved,
}: {
  habit: Habit;
  onClose: () => void;
  onSaved: (h: Habit) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(habit.name);
  const [description, setDescription] = useState(habit.description ?? "");
  const [frequency, setFrequency] = useState(habit.frequency);
  const [target, setTarget] = useState(habit.target_count);
  const [color, setColor] = useState(habit.color);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const updated = await habitsApi.updateHabit(habit.id, {
        name: name.trim(),
        description: description.trim(),
        frequency,
        target_count: target,
        color,
      });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border bg-card p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">{t("habits.editTitle")}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("habits.name")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("habits.description")}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("habits.frequency")}</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="daily">{t("habits.daily")}</option>
                <option value="weekly">{t("habits.weekly")}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("habits.target")}</label>
              <input
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("habits.color")}</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-16 cursor-pointer rounded-md border bg-background p-1"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("habits.cancel")}
          </Button>
          <Button size="sm" onClick={save} disabled={saving || !name.trim()}>
            {t("habits.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  habit,
  onCancel,
  onConfirm,
}: {
  habit: Habit;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-xl border bg-card p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold">{t("habits.deleteTitle")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t("habits.deleteBody", { name: habit.name })}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            {t("habits.cancel")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("habits.delete")}
          </Button>
        </div>
      </div>
    </div>
  );
}
