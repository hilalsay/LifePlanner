import { useState, useEffect } from "react";
import {
  startOfMonth, lastDayOfMonth, startOfWeek, addWeeks, format, isWithinInterval,
} from "date-fns";
import { Check, Plus, Trash2, Pencil } from "lucide-react";
import { planningApi, type MonthlyFocus, type WeeklyPriority } from "@/lib/api";
import { getISOWeek } from "@/lib/utils";

interface WeekOpt { year: number; week: number; label: string; }

interface Props {
  focus: MonthlyFocus;
  onUpdate: (data: Partial<MonthlyFocus>) => Promise<void> | void;
  onDelete: () => void;
}

// Weeks (Mondays) that overlap the focus's month
function weeksInMonth(year: number, month: number): WeekOpt[] {
  const first = startOfMonth(new Date(year, month - 1, 1));
  const last = lastDayOfMonth(first);
  const opts: WeekOpt[] = [];
  let cur = startOfWeek(first, { weekStartsOn: 1 });
  while (cur <= last) {
    opts.push({
      year: cur.getFullYear(),
      week: getISOWeek(cur),
      label: `Week ${getISOWeek(cur)} · ${format(cur, "MMM d")}`,
    });
    cur = addWeeks(cur, 1);
  }
  return opts;
}

export function MonthlyFocusDetail({ focus, onUpdate, onDelete }: Props) {
  // ── Edit title/description ──
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(focus.title);
  const [description, setDescription] = useState(focus.description ?? "");
  const [savingEdit, setSavingEdit] = useState(false);

  // ── Linked weekly tasks ──
  const [tasks, setTasks] = useState<WeeklyPriority[]>([]);
  const [newTask, setNewTask] = useState("");
  const weekOpts = weeksInMonth(focus.year, focus.month);

  // Default to the week containing today if it's in this month, else first week
  const defaultWeek = (() => {
    const today = new Date();
    const monthStart = startOfMonth(new Date(focus.year, focus.month - 1, 1));
    const monthEnd = lastDayOfMonth(monthStart);
    if (isWithinInterval(today, { start: monthStart, end: monthEnd })) {
      return getISOWeek(startOfWeek(today, { weekStartsOn: 1 }));
    }
    return weekOpts[0]?.week ?? getISOWeek(monthStart);
  })();
  const [selectedWeek, setSelectedWeek] = useState(defaultWeek);

  useEffect(() => {
    // Pull all of this year's priorities, keep the ones linked to this focus
    planningApi.getWeeklyPriorities(focus.year)
      .then((all) => setTasks(all.filter((p) => p.monthly_focus_id === focus.id)))
      .catch(console.error);
  }, [focus.id, focus.year]);

  const saveEdit = async () => {
    const t = title.trim();
    if (!t) { setEditing(false); return; }
    setSavingEdit(true);
    try {
      await onUpdate({ title: t, description: description.trim() || undefined });
      setEditing(false);
    } finally {
      setSavingEdit(false);
    }
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    const opt = weekOpts.find((o) => o.week === selectedWeek) ?? weekOpts[0];
    const p = await planningApi.createWeeklyPriority({
      year: opt?.year ?? focus.year,
      week_number: selectedWeek,
      title: newTask.trim(),
      monthly_focus_id: focus.id,
    });
    setTasks((ts) => [...ts, p]);
    setNewTask("");
  };

  const toggleTask = async (p: WeeklyPriority) => {
    const updated = await planningApi.updateWeeklyPriority(p.id, { is_completed: !p.is_completed });
    setTasks((ts) => ts.map((x) => (x.id === p.id ? updated : x)));
  };

  const deleteTask = async (id: string) => {
    await planningApi.deleteWeeklyPriority(id);
    setTasks((ts) => ts.filter((x) => x.id !== id));
  };

  const sortedTasks = [...tasks].sort((a, b) =>
    a.week_number !== b.week_number ? a.week_number - b.week_number
      : a.created_at.localeCompare(b.created_at)
  );
  const doneCount = tasks.filter((t) => t.is_completed).length;

  return (
    <div className="mt-2 space-y-4 border-t pt-3">
      {/* ── Detail plan (title + description) ── */}
      {editing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
            className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Detail plan — what does this focus involve? Key steps, context, why it matters…"
            className="w-full resize-none rounded-md border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              disabled={savingEdit}
              className="rounded px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {savingEdit ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">
              Cancel
            </button>
            <button onClick={onDelete} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" /> Delete focus
            </button>
          </div>
        </div>
      ) : (
        <div className="group/desc">
          {focus.description ? (
            <p className="whitespace-pre-wrap text-xs text-muted-foreground">{focus.description}</p>
          ) : (
            <p className="text-xs italic text-muted-foreground/60">No detail plan yet.</p>
          )}
          <button
            onClick={() => { setTitle(focus.title); setDescription(focus.description ?? ""); setEditing(true); }}
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/50 transition-colors hover:text-foreground"
          >
            <Pencil className="h-3 w-3" /> Edit plan
          </button>
        </div>
      )}

      {/* ── Linked weekly tasks ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weekly Tasks</p>
          {tasks.length > 0 && (
            <span className="text-xs text-muted-foreground">{doneCount} / {tasks.length} done</span>
          )}
        </div>

        {sortedTasks.map((p) => (
          <div key={p.id} className="group/task flex items-center gap-2 rounded-md border px-2.5 py-1.5">
            <button
              onClick={() => toggleTask(p)}
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                p.is_completed
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground hover:border-primary"
              }`}
            >
              {p.is_completed && <Check className="h-2.5 w-2.5" />}
            </button>
            <span className={`flex-1 text-xs ${p.is_completed ? "line-through text-muted-foreground" : ""}`}>
              {p.title}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground">Wk {p.week_number}</span>
            <button
              onClick={() => deleteTask(p.id)}
              className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/task:opacity-100"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Add weekly task */}
        <div className="flex gap-1.5 pt-0.5">
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="shrink-0 rounded-md border bg-background px-1.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
            title="Which week"
          >
            {weekOpts.map((o) => (
              <option key={o.week} value={o.week}>{o.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Add a weekly task…"
            className="min-w-0 flex-1 rounded-md border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={addTask}
            className="shrink-0 rounded-md bg-primary px-2 text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
