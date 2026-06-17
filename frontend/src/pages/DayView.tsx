import { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus, Check, Trash2, ChevronLeft, ChevronRight,
  GripVertical, Pencil, X, Clock,
} from "lucide-react";
import { format, addDays, subDays, differenceInMinutes, differenceInCalendarDays, parseISO, type Locale } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { planningApi, type DailyTask } from "@/lib/api";
import { toDateString } from "@/lib/utils";
import { setChatDragItem } from "@/lib/dragItem";
import { useI18n } from "@/contexts/LanguageContext";
import { dateLocale } from "@/lib/dateLocale";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

// ── Deadline helpers ──────────────────────────────────────────────────────────

function hhmm(s: string): string {
  return s.slice(0, 5); // "HH:MM:SS" → "HH:MM"
}

type DeadlineStatus = "overdue" | "urgent" | "upcoming";

function deadlineInfo(
  deadline_date: string | undefined,
  deadline_time: string | undefined,
  t: TFn,
  locale: Locale,
): { text: string; status: DeadlineStatus } | null {
  if (!deadline_date) return null;

  const now = new Date();
  const todayStr = toDateString(now);
  const fmtTime = (h: number, m: number) => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return format(d, "p", { locale });
  };

  if (deadline_date === todayStr && deadline_time) {
    const [h, m] = hhmm(deadline_time).split(":").map(Number);
    const dl = new Date();
    dl.setHours(h, m, 0, 0);
    const diff = differenceInMinutes(dl, now);
    if (diff < 0) {
      const abs = Math.abs(diff);
      return { text: abs < 60 ? t("deadline.overdueByMin", { n: abs }) : t("deadline.overdueByHours", { n: Math.round(abs / 60) }), status: "overdue" };
    }
    if (diff < 60) return { text: t("deadline.dueInMin", { n: diff }), status: "urgent" };
    if (diff <= 120) {
      const hrs = Math.floor(diff / 60);
      const mins = diff % 60;
      return { text: mins ? t("deadline.dueInHoursMin", { h: hrs, m: mins }) : t("deadline.dueInHours", { n: hrs }), status: "urgent" };
    }
    return { text: t("deadline.dueToday") + t("deadline.atTime", { time: fmtTime(h, m) }), status: "urgent" };
  }

  const daysDiff = differenceInCalendarDays(parseISO(deadline_date), parseISO(todayStr));
  let timeSuffix = "";
  if (deadline_time) {
    const [h, m] = hhmm(deadline_time).split(":").map(Number);
    timeSuffix = t("deadline.atTime", { time: fmtTime(h, m) });
  }

  if (daysDiff < 0) {
    return { text: t("deadline.overdueByDays", { n: Math.abs(daysDiff) }), status: "overdue" };
  }
  if (daysDiff === 0) return { text: t("deadline.dueToday") + timeSuffix, status: "urgent" };
  if (daysDiff === 1) return { text: t("deadline.dueTomorrow") + timeSuffix, status: "upcoming" };
  if (daysDiff <= 6) return { text: t("deadline.dueOn", { date: format(parseISO(deadline_date), "EEE", { locale }) }) + timeSuffix, status: "upcoming" };
  return { text: t("deadline.dueOn", { date: format(parseISO(deadline_date), "MMM d", { locale }) }) + timeSuffix, status: "upcoming" };
}

function isOverdue(task: DailyTask, now = new Date()): boolean {
  if (task.is_completed || !task.deadline_date) return false;
  const todayStr = toDateString(now);
  if (task.deadline_date < todayStr) return true;
  if (task.deadline_date === todayStr && task.deadline_time) {
    const [h, m] = hhmm(task.deadline_time).split(":").map(Number);
    const dl = new Date();
    dl.setHours(h, m, 0, 0);
    return dl < now;
  }
  return false;
}

const STATUS_CLASSES: Record<DeadlineStatus, string> = {
  overdue:  "text-red-600 dark:text-red-400",
  urgent:   "text-orange-500 dark:text-orange-400",
  upcoming: "text-blue-500 dark:text-blue-400",
};

// ── Quick-time options ────────────────────────────────────────────────────────

function quickTimeOpts(t: TFn, locale: Locale) {
  const now = new Date();
  const in1h = new Date(now.getTime() + 60 * 60_000);
  const in2h = new Date(now.getTime() + 2 * 60 * 60_000);
  const makeTime = (d: Date) => format(d, "HH:mm");
  const makeDate = (d: Date) => toDateString(d);
  const at = (h: number) => { const d = new Date(); d.setHours(h, 0, 0, 0); return format(d, "p", { locale }); };
  return [
    { label: t("day.inHours", { n: 1 }), date: makeDate(in1h), time: makeTime(in1h) },
    { label: t("day.inHours", { n: 2 }), date: makeDate(in2h), time: makeTime(in2h) },
    { label: at(17),  date: makeDate(now),  time: "17:00" },
    { label: at(21),  date: makeDate(now),  time: "21:00" },
  ];
}

// ── Drag order helpers ────────────────────────────────────────────────────────

function orderKey(dateStr: string) { return `lp-task-order-${dateStr}`; }

function applyStoredOrder(tasks: DailyTask[], dateStr: string): DailyTask[] {
  const raw = localStorage.getItem(orderKey(dateStr));
  if (!raw) return tasks;
  const ids: string[] = JSON.parse(raw);
  const rank = new Map(ids.map((id, i) => [id, i]));
  return [...tasks].sort((a, b) => {
    const ai = rank.has(a.id) ? rank.get(a.id)! : Infinity;
    const bi = rank.has(b.id) ? rank.get(b.id)! : Infinity;
    return ai - bi;
  });
}

function persistOrder(tasks: DailyTask[], dateStr: string) {
  localStorage.setItem(orderKey(dateStr), JSON.stringify(tasks.map((t) => t.id)));
}

const PRIORITY_COLORS = { high: "destructive", medium: "default", low: "secondary" } as const;
const PRIORITY_CYCLE: Record<string, "low" | "medium" | "high"> = { low: "medium", medium: "high", high: "low" };

// ── Inline deadline picker ────────────────────────────────────────────────────

interface DeadlinePickerProps {
  date: string;
  time: string;
  onDate: (d: string) => void;
  onTime: (t: string) => void;
  onClear: () => void;
  compact?: boolean;
}

function DeadlinePicker({ date, time, onDate, onTime, onClear, compact }: DeadlinePickerProps) {
  const { t, lang } = useI18n();
  const opts = quickTimeOpts(t, dateLocale(lang));
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "" : "pt-0.5"}`}>
      {opts.map((o) => {
        const active = date === o.date && time === o.time;
        return (
          <button
            key={o.label}
            type="button"
            onClick={() => { onDate(o.date); onTime(o.time); }}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
              active
                ? "bg-orange-500 text-white"
                : "bg-muted text-muted-foreground hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-900/30 dark:hover:text-orange-400"
            }`}
          >
            {o.label}
          </button>
        );
      })}
      <input
        type="time"
        value={time}
        onChange={(e) => { onTime(e.target.value); if (!date) onDate(toDateString(new Date())); }}
        className="rounded border bg-background px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-ring"
      />
      {(date || time) && (
        <button onClick={onClear} className="text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ── DeadlineBadge ─────────────────────────────────────────────────────────────

function DeadlineBadge({
  task,
  onClick,
}: {
  task: DailyTask;
  onClick?: () => void;
}) {
  const { t, lang } = useI18n();
  if (task.is_completed || !task.deadline_date) return null;
  const info = deadlineInfo(task.deadline_date, task.deadline_time, t, dateLocale(lang));
  if (!info) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70 ${STATUS_CLASSES[info.status]}`}
      title={t("day.editDeadline")}
    >
      <Clock className="h-3 w-3" />
      {info.text}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DayView() {
  const { t, lang } = useI18n();
  const locale = dateLocale(lang);
  const [date, setDate]   = useState(new Date());
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);

  // new task form
  const [newTitle, setNewTitle]           = useState("");
  const [showDlPicker, setShowDlPicker]   = useState(false);
  const [newDlDate, setNewDlDate]         = useState("");
  const [newDlTime, setNewDlTime]         = useState("");

  // inline title edit
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [editingValue, setEditingValue]   = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // per-task deadline picker (clicking the badge)
  const [dlPickerId, setDlPickerId]       = useState<string | null>(null);
  const [dlPickerDate, setDlPickerDate]   = useState("");
  const [dlPickerTime, setDlPickerTime]   = useState("");

  // drag-and-drop
  const [dragId, setDragId]               = useState<string | null>(null);
  const [dragOverId, setDragOverId]       = useState<string | null>(null);

  const dateStr = toDateString(date);

  useEffect(() => {
    setLoading(true);
    planningApi
      .getDailyTasks(dateStr)
      .then((fetched) => setTasks(applyStoredOrder(fetched, dateStr)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dateStr]);

  // Sort: overdue tasks float to top; rest keep stored drag order
  const displayedTasks = useMemo(() => {
    const now = new Date();
    const overdue = tasks.filter((t) => isOverdue(t, now));
    const rest    = tasks.filter((t) => !isOverdue(t, now));
    overdue.sort((a, b) => {
      const ka = (a.deadline_date ?? "") + (a.deadline_time ?? "");
      const kb = (b.deadline_date ?? "") + (b.deadline_time ?? "");
      return ka.localeCompare(kb);
    });
    return [...overdue, ...rest];
  }, [tasks]);

  // ── Task mutations ─────────────────────────────────────────────────────────

  const addTask = async () => {
    if (!newTitle.trim()) return;
    const task = await planningApi.createDailyTask({
      title: newTitle.trim(),
      task_date: dateStr,
      priority: "medium",
      deadline_date: newDlDate || undefined,
      deadline_time: newDlTime ? newDlTime + ":00" : undefined,
    });
    setTasks((prev) => { const next = [...prev, task]; persistOrder(next, dateStr); return next; });
    setNewTitle("");
    setNewDlDate("");
    setNewDlTime("");
    setShowDlPicker(false);
  };

  const toggleTask = async (task: DailyTask) => {
    const updated = await planningApi.updateDailyTask(task.id, { is_completed: !task.is_completed });
    setTasks((ts) => ts.map((t) => (t.id === task.id ? updated : t)));
  };

  const deleteTask = async (id: string) => {
    await planningApi.deleteDailyTask(id);
    setTasks((prev) => { const next = prev.filter((t) => t.id !== id); persistOrder(next, dateStr); return next; });
  };

  useEffect(() => { if (editingId) editInputRef.current?.focus(); }, [editingId]);

  const saveEdit = async (id: string) => {
    if (!editingValue.trim()) { setEditingId(null); return; }
    const updated = await planningApi.updateDailyTask(id, { title: editingValue.trim() });
    setTasks((ts) => ts.map((t) => (t.id === id ? updated : t)));
    setEditingId(null);
  };

  const cyclePriority = async (task: DailyTask) => {
    const next    = PRIORITY_CYCLE[task.priority] ?? "medium";
    const updated = await planningApi.updateDailyTask(task.id, { priority: next });
    setTasks((ts) => ts.map((t) => (t.id === task.id ? updated : t)));
  };

  const openDeadlinePicker = (task: DailyTask) => {
    setDlPickerId(task.id);
    setDlPickerDate(task.deadline_date ?? "");
    setDlPickerTime(task.deadline_time ? hhmm(task.deadline_time) : "");
  };

  const saveDeadline = async (id: string) => {
    const updated = await planningApi.updateDailyTask(id, {
      deadline_date: dlPickerDate || null,
      deadline_time: dlPickerTime ? dlPickerTime + ":00" : null,
    } as Parameters<typeof planningApi.updateDailyTask>[1]);
    setTasks((ts) => ts.map((t) => (t.id === id ? updated : t)));
    setDlPickerId(null);
  };

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== dragId) setDragOverId(id);
  };
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setTasks((prev) => {
      const next = [...prev];
      const from = next.findIndex((t) => t.id === dragId);
      const to   = next.findIndex((t) => t.id === targetId);
      next.splice(to, 0, next.splice(from, 1)[0]);
      persistOrder(next, dateStr);
      return next;
    });
    setDragId(null);
    setDragOverId(null);
  };
  const handleDragEnd = () => { setDragId(null); setDragOverId(null); };

  const completed = tasks.filter((task) => task.is_completed).length;
  const now       = new Date();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <MotivationalBanner />

      {/* Day navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setDate((d) => subDays(d, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium">{format(date, "EEEE", { locale })}</p>
          <p className="text-xs text-muted-foreground">{format(date, "MMMM d, yyyy", { locale })}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setDate((d) => addDays(d, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Task list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("day.tasks")}</CardTitle>
            <span className="text-xs text-muted-foreground">{t("common.doneCount", { done: completed, total: tasks.length })}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-1">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("day.loading")}</p>
          ) : displayedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("day.noTasks")}</p>
          ) : (
            displayedTasks.map((task) => {
              const overdue    = isOverdue(task, now);
              const isDragging = dragId === task.id;
              const isDragOver = dragOverId === task.id;
              const isEditing  = editingId === task.id;
              const isPicking  = dlPickerId === task.id;

              return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => {
                    // Reorder first (sets effectAllowed="move"), then the chat
                    // payload, which sets "copyMove" so the panel can accept it.
                    if (!overdue) handleDragStart(e, task.id);
                    setChatDragItem(e, {
                      kind: "task",
                      title: task.title,
                      priority: task.priority,
                      deadline: task.deadline_date,
                      completed: task.is_completed,
                    });
                  }}
                  onDragOver={(e) => handleDragOver(e, task.id)}
                  onDrop={() => handleDrop(task.id)}
                  onDragEnd={handleDragEnd}
                  className={[
                    "group flex flex-col rounded-md border px-2 py-2 transition-all select-none",
                    overdue && !task.is_completed
                      ? "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20"
                      : "",
                    isDragging ? "opacity-40" : "opacity-100",
                    isDragOver ? "!border-primary border-dashed !bg-primary/5" : "",
                  ].join(" ")}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-2">
                    {/* Drag handle — hidden for overdue tasks */}
                    <span
                      className={`shrink-0 text-muted-foreground/30 transition-opacity ${
                        overdue ? "invisible" : "group-hover:text-muted-foreground cursor-grab active:cursor-grabbing"
                      }`}
                    >
                      <GripVertical className="h-4 w-4" />
                    </span>

                    {/* Completion toggle */}
                    <button
                      onClick={() => toggleTask(task)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        task.is_completed
                          ? "border-primary bg-primary text-primary-foreground"
                          : overdue
                          ? "border-red-400 hover:border-red-600"
                          : "border-muted-foreground hover:border-primary"
                      }`}
                    >
                      {task.is_completed && <Check className="h-3 w-3" />}
                    </button>

                    {/* Title (normal or edit mode) */}
                    {isEditing ? (
                      <div className="flex flex-1 items-center gap-1">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(task.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="flex-1 rounded border bg-background px-2 py-0.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button onClick={() => saveEdit(task.id)} className="shrink-0 text-primary hover:opacity-70"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setEditingId(null)} className="shrink-0 text-muted-foreground hover:opacity-70"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <>
                        <span className={`flex-1 text-sm ${task.is_completed ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </span>

                        {/* Deadline badge — click to edit deadline */}
                        {!isPicking && (
                          <DeadlineBadge task={task} onClick={() => openDeadlinePicker(task)} />
                        )}

                        {/* "Add deadline" ghost link — shown on hover when no deadline */}
                        {!task.deadline_date && !task.is_completed && !isPicking && (
                          <button
                            onClick={() => openDeadlinePicker(task)}
                            className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground/0 transition-all group-hover:text-muted-foreground/50 hover:!text-muted-foreground"
                          >
                            <Clock className="h-3 w-3" />
                          </button>
                        )}

                        <Badge
                          variant={PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] ?? "outline"}
                          className="cursor-pointer text-xs shrink-0"
                          onClick={() => cyclePriority(task)}
                          title={t("day.changePriority")}
                        >
                          {task.priority}
                        </Badge>

                        <button
                          onClick={() => { setEditingId(task.id); setEditingValue(task.title); }}
                          className="shrink-0 text-muted-foreground/0 transition-all group-hover:text-muted-foreground/40 hover:!text-muted-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground/0 transition-all group-hover:text-muted-foreground/40 hover:!text-destructive"
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Inline deadline picker for existing task */}
                  {isPicking && (
                    <div className="mt-1.5 pl-10">
                      <DeadlinePicker
                        date={dlPickerDate}
                        time={dlPickerTime}
                        onDate={setDlPickerDate}
                        onTime={setDlPickerTime}
                        onClear={() => { setDlPickerDate(""); setDlPickerTime(""); }}
                        compact
                      />
                      <div className="mt-1.5 flex gap-2">
                        <button
                          onClick={() => saveDeadline(task.id)}
                          className="rounded px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setDlPickerId(null)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Add task form */}
          <div className="space-y-1 pt-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder={t("day.addPlaceholder")}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
              />
              <Button size="sm" onClick={addTask}><Plus className="h-4 w-4" /></Button>
            </div>

            {/* "Add deadline" subtle link */}
            {!showDlPicker && !newDlDate && !newDlTime ? (
              <button
                type="button"
                onClick={() => setShowDlPicker(true)}
                className="flex items-center gap-1 pl-1 text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground"
              >
                <Clock className="h-3 w-3" />
                Add deadline
              </button>
            ) : (
              <div className="pl-1">
                <DeadlinePicker
                  date={newDlDate}
                  time={newDlTime}
                  onDate={setNewDlDate}
                  onTime={setNewDlTime}
                  onClear={() => { setNewDlDate(""); setNewDlTime(""); setShowDlPicker(false); }}
                />
                {(newDlDate || newDlTime) && (() => {
                  const info = deadlineInfo(newDlDate || toDateString(new Date()), newDlTime, t, locale);
                  return info ? (
                    <span className={`mt-0.5 inline-flex items-center gap-1 text-xs font-medium ${STATUS_CLASSES[info.status]}`}>
                      <Clock className="h-3 w-3" />
                      {info.text}
                    </span>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
