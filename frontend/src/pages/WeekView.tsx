import { useState, useEffect } from "react";
import { Plus, Check, Clock, X } from "lucide-react";
import { format, startOfWeek, addWeeks, subWeeks, addDays, differenceInCalendarDays, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { planningApi, type WeeklyPriority } from "@/lib/api";
import { getISOWeek, toDateString } from "@/lib/utils";

// ── Deadline helpers ──────────────────────────────────────────────────────────

function weekDeadlineText(deadline_date?: string): { text: string; overdue: boolean; urgent: boolean } | null {
  if (!deadline_date) return null;
  const today = new Date();
  const todayStr = toDateString(today);
  const diff = differenceInCalendarDays(parseISO(deadline_date), parseISO(todayStr));
  if (diff < 0) return { text: `Overdue by ${Math.abs(diff)}d`, overdue: true, urgent: false };
  if (diff === 0) return { text: "Due today", overdue: false, urgent: true };
  if (diff === 1) return { text: "Due tomorrow", overdue: false, urgent: true };
  return { text: `Due ${format(parseISO(deadline_date), "EEE, MMM d")}`, overdue: false, urgent: false };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WeekView() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [priorities, setPriorities] = useState<WeeklyPriority[]>([]);
  const [newTitle, setNewTitle]     = useState("");
  const [showDlPicker, setShowDlPicker] = useState(false);
  const [newDeadline, setNewDeadline]   = useState("");
  const [dlPickerId, setDlPickerId]     = useState<string | null>(null);
  const [dlPickerDate, setDlPickerDate] = useState("");

  const year = weekStart.getFullYear();
  const week = getISOWeek(weekStart);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  useEffect(() => {
    planningApi.getWeeklyPriorities(year, week).then(setPriorities).catch(console.error);
  }, [year, week]);

  // Past days in the current week jump to next week's same day.
  // Past days in other weeks are kept as-is (allow setting historical deadlines).
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const isCurrentWeek    = toDateString(weekStart) === toDateString(currentWeekStart);
  const todayStr         = toDateString(today);

  const quickDayOpts = days.map((d) => {
    const ds        = toDateString(d);
    const pastToday = ds < todayStr;
    const date      = pastToday && isCurrentWeek ? toDateString(addDays(d, 7)) : ds;
    return { label: format(d, "EEE"), date, nextWeek: pastToday && isCurrentWeek };
  });

  const addPriority = async () => {
    if (!newTitle.trim()) return;
    const p = await planningApi.createWeeklyPriority({
      year,
      week_number: week,
      title: newTitle.trim(),
      deadline_date: newDeadline || undefined,
    });
    setPriorities((ps) => [...ps, p]);
    setNewTitle("");
    setNewDeadline("");
    setShowDlPicker(false);
  };

  const toggle = async (p: WeeklyPriority) => {
    const updated = await planningApi.updateWeeklyPriority(p.id, { is_completed: !p.is_completed });
    setPriorities((ps) => ps.map((x) => (x.id === p.id ? updated : x)));
  };

  const openDlPicker = (p: WeeklyPriority) => {
    setDlPickerId(p.id);
    setDlPickerDate(p.deadline_date ?? "");
  };

  const saveDeadline = async (id: string) => {
    const updated = await planningApi.updateWeeklyPriority(id, {
      deadline_date: dlPickerDate || null,
    } as Parameters<typeof planningApi.updateWeeklyPriority>[1]);
    setPriorities((ps) => ps.map((p) => (p.id === id ? updated : p)));
    setDlPickerId(null);
  };

  // Day-of-week quick picker sub-component
  function DayPicker({ value, onChange, onClear }: { value: string; onChange: (d: string) => void; onClear: () => void }) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {quickDayOpts.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => onChange(o.date)}
            title={o.nextWeek ? `Next ${o.label} · ${o.date}` : o.date}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
              value === o.date
                ? "bg-blue-500 text-white"
                : "bg-muted text-muted-foreground hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
            }`}
          >
            {o.label}{o.nextWeek ? " ›" : ""}
          </button>
        ))}
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded border bg-background px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-ring"
        />
        {value && (
          <button onClick={onClear} className="text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => subWeeks(w, 1))}>Prev</Button>
        <div className="text-center">
          <p className="font-medium">Week {week}</p>
          <p className="text-xs text-muted-foreground">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>Next</Button>
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const ds = toDateString(day);
          const isToday = ds === toDateString(today);
          return (
            <div
              key={ds}
              className={`rounded-md border p-2 text-center text-xs ${
                isToday
                  ? "border-primary bg-primary/5 font-semibold text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <p>{format(day, "EEE")}</p>
              <p className="text-base font-medium">{format(day, "d")}</p>
            </div>
          );
        })}
      </div>

      {/* Priorities */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly Priorities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {priorities.length === 0 && (
            <p className="text-sm text-muted-foreground">No priorities yet.</p>
          )}

          {priorities.map((p) => {
            const dlInfo  = weekDeadlineText(p.deadline_date);
            const picking = dlPickerId === p.id;
            return (
              <div
                key={p.id}
                className={`group flex flex-col rounded-md border px-3 py-2 transition-colors ${
                  dlInfo?.overdue && !p.is_completed
                    ? "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggle(p)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      p.is_completed
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground hover:border-primary"
                    }`}
                  >
                    {p.is_completed && <Check className="h-3 w-3" />}
                  </button>

                  <span className={`flex-1 text-sm ${p.is_completed ? "line-through text-muted-foreground" : ""}`}>
                    {p.title}
                  </span>

                  {/* Deadline badge */}
                  {!picking && dlInfo && !p.is_completed && (
                    <button
                      onClick={() => openDlPicker(p)}
                      className={`flex items-center gap-1 text-xs font-medium ${
                        dlInfo.overdue ? "text-red-500 dark:text-red-400"
                        : dlInfo.urgent ? "text-orange-500 dark:text-orange-400"
                        : "text-blue-500 dark:text-blue-400"
                      } hover:opacity-70`}
                    >
                      <Clock className="h-3 w-3" />
                      {dlInfo.text}
                    </button>
                  )}

                  {/* Ghost clock — shown on hover when no deadline */}
                  {!p.deadline_date && !p.is_completed && !picking && (
                    <button
                      onClick={() => openDlPicker(p)}
                      className="text-muted-foreground/0 transition-all group-hover:text-muted-foreground/40 hover:!text-muted-foreground"
                    >
                      <Clock className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Inline day picker */}
                {picking && (
                  <div className="mt-2 pl-8 space-y-1.5">
                    <DayPicker
                      value={dlPickerDate}
                      onChange={setDlPickerDate}
                      onClear={() => setDlPickerDate("")}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveDeadline(p.id)}
                        className="rounded px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Save
                      </button>
                      <button onClick={() => setDlPickerId(null)} className="text-xs text-muted-foreground hover:text-foreground">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add form */}
          <div className="space-y-1 pt-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPriority()}
                placeholder="Add a priority..."
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button size="sm" onClick={addPriority}><Plus className="h-4 w-4" /></Button>
            </div>

            {!showDlPicker && !newDeadline ? (
              <button
                type="button"
                onClick={() => setShowDlPicker(true)}
                className="flex items-center gap-1 pl-1 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                <Clock className="h-3 w-3" />
                Due by...
              </button>
            ) : (
              <div className="pl-1">
                <DayPicker
                  value={newDeadline}
                  onChange={setNewDeadline}
                  onClear={() => { setNewDeadline(""); setShowDlPicker(false); }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
