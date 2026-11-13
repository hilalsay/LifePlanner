import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus, Check, Trash2, ChevronLeft, ChevronRight, ChevronDown,
  GripVertical, Pencil, X, Clock, Sun, PartyPopper, CalendarDays, Flag,
} from "lucide-react";
import { format, addDays, subDays, isToday, differenceInMinutes, differenceInCalendarDays, parseISO, type Locale } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { inputClass } from "@/components/ui/input";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { HabitsStrip } from "@/components/today/HabitsStrip";
import { CheckInCard } from "@/components/today/CheckInCard";
import { RolloverBanner } from "@/components/today/RolloverBanner";
import { parseQuickAdd } from "@/lib/quickParse";
import { planningApi, type DailyTask } from "@/lib/api";
import { cn, toDateString } from "@/lib/utils";
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

const STATUS_CLASSES: Record<DeadlineStatus, string> = {
  overdue:  "text-danger",
  urgent:   "text-warning",
  upcoming: "text-info",
};

const PRIORITY_STYLE: Record<DailyTask["priority"], string> = {
  high:   "bg-danger-soft text-danger",
  medium: "bg-warning-soft text-warning",
  low:    "bg-secondary text-muted-foreground",
};
const PRIORITY_CYCLE: Record<string, "low" | "medium" | "high"> = { low: "medium", medium: "high", high: "low" };

// ── Inline deadline picker ────────────────────────────────────────────────────

interface DeadlinePickerProps {
  date: string;
  time: string;
  onDate: (d: string) => void;
  onTime: (t: string) => void;
  onClear: () => void;
}

function DeadlinePicker({ date, time, onDate, onTime, onClear }: DeadlinePickerProps) {
  const { t, lang } = useI18n();
  const opts = quickTimeOpts(t, dateLocale(lang));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {opts.map((o) => {
        const active = date === o.date && time === o.time;
        return (
          <button
            key={o.label}
            type="button"
            aria-pressed={active}
            onClick={() => { onDate(o.date); onTime(o.time); }}
            className={cn(
              "h-8 rounded-full px-3 text-xs font-semibold transition-colors duration-150",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-primary-soft hover:text-primary"
            )}
          >
            {o.label}
          </button>
        );
      })}
      <input
        type="time"
        aria-label={t("day.deadlineTime")}
        value={time}
        onChange={(e) => { onTime(e.target.value); if (!date) onDate(toDateString(new Date())); }}
        className="h-8 rounded-full border border-input bg-card px-3 text-xs"
      />
      {(date || time) && (
        <button
          type="button"
          onClick={onClear}
          aria-label={t("common.cancel")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

// ── DeadlineBadge ─────────────────────────────────────────────────────────────

function DeadlineBadge({ task, onClick }: { task: DailyTask; onClick?: () => void }) {
  const { t, lang } = useI18n();
  if (task.is_completed || !task.deadline_date) return null;
  const info = deadlineInfo(task.deadline_date, task.deadline_time, t, dateLocale(lang));
  if (!info) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("inline-flex items-center gap-1 rounded-md text-xs font-semibold hover:underline", STATUS_CLASSES[info.status])}
      title={t("day.editDeadline")} aria-label={t("day.editDeadline")}
    >
      <Clock className="h-3 w-3" aria-hidden />
      {info.text}
    </button>
  );
}

// ── Undo toast ────────────────────────────────────────────────────────────────

function UndoToast({ message, actionLabel, onAction, onDismiss }: {
  message: string; actionLabel?: string; onAction?: () => void; onDismiss: () => void;
}) {
  useEffect(() => {
    const id = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(id);
  }, [onDismiss]);
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-[70] mx-auto flex max-w-sm animate-fade-in items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-sm text-background shadow-lg md:bottom-6"
    >
      <span className="flex-1">{message}</span>
      {onAction && (
        <button onClick={onAction} className="rounded-md px-2 py-1 font-semibold text-primary-soft underline-offset-4 hover:underline">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DayView() {
  const { t, lang } = useI18n();
  const locale = dateLocale(lang);
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate]   = useState(() => {
    const q = searchParams.get("date");
    return q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? parseISO(q) : new Date();
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [reload, setReload] = useState(0);
  const [showCompleted, setShowCompleted] = useState(true);
  const [lastDeleted, setLastDeleted] = useState<DailyTask | null>(null);

  // new task form
  const [newTitle, setNewTitle]           = useState("");
  const [adding, setAdding]               = useState(false);
  const [showDlPicker, setShowDlPicker]   = useState(false);
  const [newDlDate, setNewDlDate]         = useState("");
  const [newDlTime, setNewDlTime]         = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

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
  const viewingToday = isToday(date);
  const todayStr = toDateString(new Date());

  // Keep ?date= in the URL so a day can be linked to (Week/Month) and reloaded.
  useEffect(() => {
    const current = searchParams.get("date");
    const want = viewingToday ? null : dateStr;
    if (current !== want) setSearchParams(want ? { date: want } : {}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  const parsed = useMemo(() => parseQuickAdd(newTitle), [newTitle]);
  const hasParsed = !!(parsed.date || parsed.time || parsed.priority) && parsed.title !== newTitle.trim();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    planningApi
      .getDailyTasks(dateStr)
      .then((fetched) => { if (!cancelled) setTasks(applyStoredOrder(fetched, dateStr)); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dateStr, reload]);

  // Keyboard: "n" focuses quick-add, ←/→ change day, "t" jumps to today
  // (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "n") { e.preventDefault(); addInputRef.current?.focus(); }
      else if (e.key === "ArrowLeft") setDate((d) => subDays(d, 1));
      else if (e.key === "ArrowRight") setDate((d) => addDays(d, 1));
      else if (e.key === "t") setDate(new Date());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Overdue first (by deadline), then open tasks in stored order; completed separately.
  const { openTasks, doneTasks } = useMemo(() => {
    const now = new Date();
    const overdue = tasks.filter((t) => isOverdue(t, now));
    const rest    = tasks.filter((t) => !isOverdue(t, now) && !t.is_completed);
    overdue.sort((a, b) =>
      ((a.deadline_date ?? "") + (a.deadline_time ?? "")).localeCompare((b.deadline_date ?? "") + (b.deadline_time ?? "")));
    return { openTasks: [...overdue, ...rest], doneTasks: tasks.filter((t) => t.is_completed) };
  }, [tasks]);

  /** Run a mutation; surface a dismissible error instead of failing silently. */
  const guard = async (fn: () => Promise<void>) => {
    try { setSaveError(false); await fn(); }
    catch { setSaveError(true); }
  };

  // ── Task mutations ─────────────────────────────────────────────────────────

  const addTask = () => guard(async () => {
    if (!newTitle.trim() || adding) return;
    setAdding(true);
    try {
      // Typed shortcuts ("tomorrow 10am !high") fill in what the pickers didn't.
      const p = parseQuickAdd(newTitle);
      const taskDate = p.date ?? dateStr;
      const dlTime = newDlTime || p.time;
      const dlDate = newDlDate || (dlTime ? taskDate : "");
      const task = await planningApi.createDailyTask({
        title: p.title,
        task_date: taskDate,
        priority: p.priority ?? "medium",
        deadline_date: dlDate || undefined,
        deadline_time: dlTime ? dlTime + ":00" : undefined,
      });
      if (task.task_date === dateStr) {
        setTasks((prev) => { const next = [...prev, task]; persistOrder(next, dateStr); return next; });
      } else {
        setNotice(t("today.addedTo", { date: format(parseISO(task.task_date), "EEEE d MMM", { locale }) }));
      }
      setNewTitle("");
      setNewDlDate("");
      setNewDlTime("");
      setShowDlPicker(false);
      addInputRef.current?.focus();
    } finally {
      setAdding(false);
    }
  });

  // Optimistic: flip immediately, roll back if the server refuses.
  const toggleTask = (task: DailyTask) => guard(async () => {
    setTasks((ts) => ts.map((x) => (x.id === task.id ? { ...x, is_completed: !x.is_completed } : x)));
    try {
      const updated = await planningApi.updateDailyTask(task.id, { is_completed: !task.is_completed });
      setTasks((ts) => ts.map((x) => (x.id === task.id ? updated : x)));
    } catch (e) {
      setTasks((ts) => ts.map((x) => (x.id === task.id ? task : x)));
      throw e;
    }
  });

  const deleteTask = (task: DailyTask) => guard(async () => {
    await planningApi.deleteDailyTask(task.id);
    setTasks((prev) => { const next = prev.filter((x) => x.id !== task.id); persistOrder(next, dateStr); return next; });
    setLastDeleted(task);
  });

  const undoDelete = () => guard(async () => {
    const task = lastDeleted;
    setLastDeleted(null);
    if (!task) return;
    const restored = await planningApi.createDailyTask({
      title: task.title,
      task_date: task.task_date,
      priority: task.priority,
      description: task.description,
      weekly_priority_id: task.weekly_priority_id,
      deadline_date: task.deadline_date,
      deadline_time: task.deadline_time,
      is_completed: task.is_completed,
    });
    if (restored.task_date === dateStr) setTasks((prev) => [...prev, restored]);
  });
  const dismissUndo = useCallback(() => setLastDeleted(null), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  useEffect(() => { if (editingId) editInputRef.current?.focus(); }, [editingId]);

  const saveEdit = (id: string) => guard(async () => {
    if (!editingValue.trim()) { setEditingId(null); return; }
    const updated = await planningApi.updateDailyTask(id, { title: editingValue.trim() });
    setTasks((ts) => ts.map((x) => (x.id === id ? updated : x)));
    setEditingId(null);
  });

  const cyclePriority = (task: DailyTask) => guard(async () => {
    const next    = PRIORITY_CYCLE[task.priority] ?? "medium";
    const updated = await planningApi.updateDailyTask(task.id, { priority: next });
    setTasks((ts) => ts.map((x) => (x.id === task.id ? updated : x)));
  });

  const openDeadlinePicker = (task: DailyTask) => {
    setDlPickerId(task.id);
    setDlPickerDate(task.deadline_date ?? "");
    setDlPickerTime(task.deadline_time ? hhmm(task.deadline_time) : "");
  };

  const saveDeadline = (id: string) => guard(async () => {
    const updated = await planningApi.updateDailyTask(id, {
      deadline_date: dlPickerDate || null,
      deadline_time: dlPickerTime ? dlPickerTime + ":00" : null,
    } as Parameters<typeof planningApi.updateDailyTask>[1]);
    setTasks((ts) => ts.map((x) => (x.id === id ? updated : x)));
    setDlPickerId(null);
  });

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
      const from = next.findIndex((x) => x.id === dragId);
      const to   = next.findIndex((x) => x.id === targetId);
      next.splice(to, 0, next.splice(from, 1)[0]);
      persistOrder(next, dateStr);
      return next;
    });
    setDragId(null);
    setDragOverId(null);
  };
  const handleDragEnd = () => { setDragId(null); setDragOverId(null); };

  const completed = doneTasks.length;
  const pct = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const now = new Date();

  // ── Row renderer ───────────────────────────────────────────────────────────

  const renderTask = (task: DailyTask) => {
    const overdue    = isOverdue(task, now);
    const isEditing  = editingId === task.id;
    const isPicking  = dlPickerId === task.id;
    const canReorder = !overdue && !task.is_completed;

    return (
      <li
        key={task.id}
        draggable={!isEditing}
        onDragStart={(e) => {
          // Reorder first (sets effectAllowed="move"), then the chat
          // payload, which sets "copyMove" so the panel can accept it.
          if (canReorder) handleDragStart(e, task.id);
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
        className={cn(
          "group relative rounded-lg px-1.5 py-1 transition-colors duration-150",
          overdue ? "bg-danger-soft/70" : "hover:bg-accent/60",
          dragId === task.id && "opacity-40",
          dragOverId === task.id && "ring-2 ring-dashed ring-primary/50",
        )}
      >
        <div className="flex min-h-[44px] items-center gap-2">
          <span
            title={t("day.dragToReorder")}
            className={cn(
              "row-action hidden shrink-0 cursor-grab text-muted-foreground/60 active:cursor-grabbing sm:block",
              !canReorder && "invisible",
            )}
            aria-hidden
          >
            <GripVertical className="h-4 w-4" />
          </span>

          {/* Completion toggle — 44px hit area around a 22px circle */}
          <button
            type="button"
            role="checkbox"
            aria-checked={task.is_completed}
            aria-label={t(task.is_completed ? "day.markUndone" : "day.markDone", { title: task.title })}
            onClick={() => toggleTask(task)}
            className="-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          >
            <span className={cn(
              "flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 transition-[background-color,border-color,transform] duration-150 active:scale-90",
              task.is_completed
                ? "border-primary bg-primary text-primary-foreground"
                : overdue
                ? "border-danger hover:bg-danger/10"
                : "border-muted-foreground/50 hover:border-primary hover:bg-primary-soft",
            )}>
              {task.is_completed && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
            </span>
          </button>

          {isEditing ? (
            <div className="flex flex-1 items-center gap-1">
              <input
                ref={editInputRef}
                type="text"
                aria-label={t("day.editTask")}
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit(task.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className={cn(inputClass, "h-9")}
              />
              <Button size="icon-sm" variant="subtle" onClick={() => { setEditingId(null); openDeadlinePicker(task); }} aria-label={t("day.setDeadline")} title={t("day.setDeadline")}>
                <Clock className="h-4 w-4" aria-hidden />
              </Button>
              <Button size="icon-sm" onClick={() => saveEdit(task.id)} aria-label={t("common.save")}>
                <Check className="h-4 w-4" aria-hidden />
              </Button>
              <Button size="icon-sm" variant="subtle" onClick={() => setEditingId(null)} aria-label={t("common.cancel")}>
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ) : (
            <>
              <div className="min-w-0 flex-1 py-1">
                <p
                  onClick={() => { if (!task.is_completed) { setEditingId(task.id); setEditingValue(task.title); } }}
                  title={task.is_completed ? undefined : t("day.editTask")}
                  className={cn(
                    "break-words text-[15px] leading-snug",
                    !task.is_completed && "cursor-text",
                    task.is_completed && "text-muted-foreground line-through decoration-muted-foreground/50",
                  )}
                >
                  {task.title}
                </p>
                {!isPicking && task.deadline_date && !task.is_completed && (
                  <DeadlineBadge task={task} onClick={() => openDeadlinePicker(task)} />
                )}
              </div>

              {!task.is_completed && (
                <button
                  type="button"
                  onClick={() => cyclePriority(task)}
                  title={t("day.changePriority")}
                  aria-label={t("day.priority", { p: t(`day.priority.${task.priority}`) })}
                  className={cn(
                    "h-7 shrink-0 rounded-full px-2.5 text-xs font-semibold transition-opacity hover:opacity-80",
                    PRIORITY_STYLE[task.priority],
                  )}
                >
                  {t(`day.priority.${task.priority}`)}
                </button>
              )}

              <div className="row-action flex shrink-0 items-center [&>.pointer-only]:hidden [@media(hover:hover)]:[&>.pointer-only]:inline-flex">
                {!task.deadline_date && !task.is_completed && !isPicking && (
                  <Button size="icon-sm" variant="subtle" className="pointer-only" onClick={() => openDeadlinePicker(task)} aria-label={t("day.addDeadline")} title={t("day.addDeadline")}>
                    <Clock className="h-4 w-4" aria-hidden />
                  </Button>
                )}
                <Button
                  size="icon-sm"
                  variant="subtle"
                  className="pointer-only"
                  onClick={() => { setEditingId(task.id); setEditingValue(task.title); }}
                  aria-label={t("day.editTask")}
                  title={t("day.editTask")}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  size="icon-sm"
                  variant="subtle"
                  className="hover:bg-danger-soft hover:text-danger"
                  onClick={() => deleteTask(task)}
                  aria-label={t("day.deleteTask")}
                  title={t("day.deleteTask")}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </>
          )}
        </div>

        {isPicking && (
          <div className="mb-1 ml-9 mt-1 space-y-2 rounded-lg bg-sunken p-3">
            <DeadlinePicker
              date={dlPickerDate}
              time={dlPickerTime}
              onDate={setDlPickerDate}
              onTime={setDlPickerTime}
              onClear={() => { setDlPickerDate(""); setDlPickerTime(""); }}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => saveDeadline(task.id)}>{t("common.save")}</Button>
              <Button size="sm" variant="ghost" onClick={() => setDlPickerId(null)}>{t("common.cancel")}</Button>
            </div>
          </div>
        )}
      </li>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto grid max-w-5xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
    <div className="min-w-0 space-y-5">
      {/* Date header: the day is the anchor of this screen */}
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            {format(date, "EEEE", { locale })}
            {viewingToday && (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs">{t("day.isToday")}</span>
            )}
          </p>
          <p className="whitespace-nowrap font-display text-[28px] font-semibold leading-tight md:text-4xl">
            {format(date, "d MMMM", { locale })}
            <span className="text-muted-foreground/70"> {format(date, "yyyy")}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!viewingToday && (
            <Button variant="outline" size="sm" onClick={() => setDate(new Date())} title={`${t("day.goToToday")} (T)`}>
              <Sun className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t("common.today")}</span>
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setDate((d) => subDays(d, 1))} aria-label={t("day.prevDay")} title={`${t("day.prevDay")} (←)`}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setDate((d) => addDays(d, 1))} aria-label={t("day.nextDay")} title={`${t("day.nextDay")} (→)`}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </header>

      {/* Progress */}
      {tasks.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{t("common.doneCount", { done: completed, total: tasks.length })}</span>
            <span className="tabular-nums text-muted-foreground">{pct}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("day.tasks")}
            className="h-2 overflow-hidden rounded-full bg-secondary"
          >
            <div className="h-full origin-left rounded-full bg-primary transition-transform duration-300 ease-out" style={{ transform: `scaleX(${pct / 100})` }} />
          </div>
        </div>
      )}

      {viewingToday && (
        <RolloverBanner
          todayStr={todayStr}
          onMoved={(moved) => setTasks((prev) => {
            const next = [...prev, ...moved.filter((m) => !prev.some((p) => p.id === m.id))];
            persistOrder(next, dateStr);
            return next;
          })}
        />
      )}

      {/* Quick add: the primary action, always at the top */}
      <Card className="p-2 shadow-sm">
        <form
          onSubmit={(e) => { e.preventDefault(); addTask(); }}
          className="flex items-center gap-2"
        >
          <label htmlFor="new-task" className="sr-only">{t("day.newTaskLabel")}</label>
          <Plus className="ml-2 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <input
            id="new-task"
            ref={addInputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t("day.addPlaceholder")}
            autoComplete="off"
            enterKeyHint="done"
            className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/80"
          />
          <Button
            type="button"
            size="icon"
            variant={showDlPicker || newDlDate || newDlTime ? "secondary" : "subtle"}
            onClick={() => setShowDlPicker((v) => !v)}
            aria-label={t("day.setDeadline")}
            aria-expanded={showDlPicker}
            title={t("day.setDeadline")}
          >
            <Clock className="h-4 w-4" aria-hidden />
          </Button>
          <Button type="submit" disabled={!newTitle.trim()} loading={adding}>
            {t("common.add")}
          </Button>
        </form>
        {hasParsed && (
          <div aria-live="polite" className="flex flex-wrap items-center gap-1.5 px-2 pb-1 pt-2 text-xs">
            <span className="text-muted-foreground">{t("today.willAdd")}</span>
            <span className="font-semibold">“{parsed.title}”</span>
            {parsed.date && (
              <span className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 font-semibold text-info">
                <CalendarDays className="h-3 w-3" aria-hidden />
                {format(parseISO(parsed.date), "EEE d MMM", { locale })}
              </span>
            )}
            {parsed.time && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 font-semibold text-warning">
                <Clock className="h-3 w-3" aria-hidden />{parsed.time}
              </span>
            )}
            {parsed.priority && (
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold", PRIORITY_STYLE[parsed.priority])}>
                <Flag className="h-3 w-3" aria-hidden />{t(`day.priority.${parsed.priority}`)}
              </span>
            )}
          </div>
        )}
        {(showDlPicker || newDlDate || newDlTime) && (
          <div className="space-y-1.5 border-t px-2 pb-1 pt-3 mt-2">
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
                <p className={cn("inline-flex items-center gap-1 text-xs font-semibold", STATUS_CLASSES[info.status])}>
                  <Clock className="h-3 w-3" aria-hidden />
                  {info.text}
                </p>
              ) : null;
            })()}
          </div>
        )}
      </Card>

      {saveError && (
        <ErrorState message={t("common.saveError")} onRetry={() => setSaveError(false)} retryLabel={t("common.dismiss")} />
      )}

      {/* Task list */}
      <section aria-labelledby="tasks-heading" className="space-y-2">
        <h2 id="tasks-heading" className="sr-only">{t("day.tasks")}</h2>
        {loading ? (
          <SkeletonRows rows={4} label={t("day.loading")} />
        ) : loadError ? (
          <ErrorState message={t("common.loadError")} onRetry={() => setReload((n) => n + 1)} retryLabel={t("common.retry")} />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={Sun}
            title={t("day.emptyTitle")}
            hint={t("day.emptyHint")}
            action={<Button variant="outline" size="sm" onClick={() => addInputRef.current?.focus()}><Plus className="h-4 w-4" aria-hidden />{t("day.newTaskLabel")}</Button>}
          />
        ) : (
          <>
            {openTasks.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success">
                <PartyPopper className="h-5 w-5 shrink-0" aria-hidden />
                {t("day.allDone")}
              </div>
            ) : (
              <ul className="space-y-0.5">{openTasks.map(renderTask)}</ul>
            )}

            {doneTasks.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompleted((v) => !v)}
                  aria-expanded={showCompleted}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-lg px-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-150", !showCompleted && "-rotate-90")} aria-hidden />
                  {t("day.completedSection", { n: doneTasks.length })}
                </button>
                {showCompleted && <ul className="space-y-0.5">{doneTasks.map(renderTask)}</ul>}
              </div>
            )}
          </>
        )}
      </section>

    </div>

      {/* Side column: daily rituals (below the tasks on phones) */}
      <aside className="space-y-5">
        <HabitsStrip dateStr={dateStr} />
        <CheckInCard dateStr={dateStr} />
        <MotivationalBanner />
      </aside>

      {notice && <UndoToast message={notice} onDismiss={dismissNotice} />}

      {lastDeleted && (
        <UndoToast
          message={t("day.taskDeleted")}
          actionLabel={t("common.undo")}
          onAction={undoDelete}
          onDismiss={dismissUndo}
        />
      )}
    </div>
  );
}
