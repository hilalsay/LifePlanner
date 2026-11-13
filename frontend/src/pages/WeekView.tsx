import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Check, Clock, X, Loader2, Sparkles, CalendarPlus } from "lucide-react";
import { format, startOfWeek, addWeeks, subWeeks, addDays, differenceInCalendarDays, parseISO, type Locale } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { planningApi, aiApi, type WeeklyPriority, type WeeklyAIReview, type DailyTask } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getISOWeek, toDateString } from "@/lib/utils";
import { setChatDragItem } from "@/lib/dragItem";
import { useI18n } from "@/contexts/LanguageContext";
import { dateLocale } from "@/lib/dateLocale";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

// ── Deadline helpers ──────────────────────────────────────────────────────────

function weekDeadlineText(
  deadline_date: string | undefined,
  t: TFn,
  locale: Locale
): { text: string; overdue: boolean; urgent: boolean } | null {
  if (!deadline_date) return null;
  const today = new Date();
  const todayStr = toDateString(today);
  const diff = differenceInCalendarDays(parseISO(deadline_date), parseISO(todayStr));
  if (diff < 0) return { text: t("deadline.overdueByDays", { n: Math.abs(diff) }), overdue: true, urgent: false };
  if (diff === 0) return { text: t("deadline.dueToday"), overdue: false, urgent: true };
  if (diff === 1) return { text: t("deadline.dueTomorrow"), overdue: false, urgent: true };
  return { text: t("deadline.dueOn", { date: format(parseISO(deadline_date), "EEE, MMM d", { locale }) }), overdue: false, urgent: false };
}

// ── Component ─────────────────────────────────────────────────────────────────

function WeeklyReviewCard({ year, week, isCurrentWeek }: { year: number; week: number; isCurrentWeek: boolean }) {
  const { t, lang } = useI18n();
  const locale = dateLocale(lang);
  const [reviews, setReviews] = useState<WeeklyAIReview[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    aiApi.getWeeklyReviews().then(setReviews).catch(console.error);
  }, []);

  const review = reviews.find((r) => r.year === year && r.week_number === week) ?? null;

  const generate = async () => {
    setGenerating(true);
    try {
      const created = await aiApi.generateWeeklyReview(lang);
      setReviews((rs) => [created, ...rs.filter((r) => !(r.year === created.year && r.week_number === created.week_number))]);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("week.aiReview")}
          </CardTitle>
          {isCurrentWeek && (
            <Button size="sm" variant="outline" onClick={generate} disabled={generating} className="shrink-0">
              {generating ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{t("week.generatingReview")}</>
              ) : review ? (
                t("week.regenerateReview")
              ) : (
                t("week.generateReview")
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {review ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {t("week.generatedAt", { date: format(parseISO(review.created_at), "MMM d, yyyy · HH:mm", { locale }) })}
            </p>
            <div className="space-y-3 text-sm leading-relaxed">
              {review.content.split(/\n\n+/).map((para, i) => (
                <p key={i}>{para.trim()}</p>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {isCurrentWeek ? t("week.noReviewYet") : t("week.reviewOnlyCurrentWeek")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function WeekView() {
  const { t, lang } = useI18n();
  const locale = dateLocale(lang);
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

  // Task counts per day for the day strip.
  const [dayTasks, setDayTasks] = useState<Record<string, DailyTask[]>>({});
  const [addedToToday, setAddedToToday] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    Promise.all(days.map((d) => planningApi.getDailyTasks(toDateString(d)).catch(() => [] as DailyTask[])))
      .then((lists) => {
        if (cancelled) return;
        const map: Record<string, DailyTask[]> = {};
        days.forEach((d, i) => { map[toDateString(d)] = lists[i]; });
        setDayTasks(map);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toDateString(weekStart)]);

  /** Turn a weekly priority into a task on today's list, linked to it. */
  const addToToday = async (p: WeeklyPriority) => {
    const task = await planningApi.createDailyTask({
      title: p.title,
      task_date: toDateString(new Date()),
      priority: "high",
      weekly_priority_id: p.id,
    });
    setDayTasks((m) => ({ ...m, [task.task_date]: [...(m[task.task_date] ?? []), task] }));
    setAddedToToday(p.id);
    window.setTimeout(() => setAddedToToday((id) => (id === p.id ? null : id)), 2500);
  };

  // Past days in the current week jump to next week's same day.
  // Past days in other weeks are kept as-is (allow setting historical deadlines).
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const isCurrentWeek    = toDateString(weekStart) === toDateString(currentWeekStart);
  const todayStr         = toDateString(today);

  const quickDayOpts = days.map((d) => {
    const ds        = toDateString(d);
    const pastToday = ds < todayStr;
    const date      = pastToday && isCurrentWeek ? toDateString(addDays(d, 7)) : ds;
    return { label: format(d, "EEE", { locale }), date, nextWeek: pastToday && isCurrentWeek };
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
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-info-soft hover:text-info"
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
          <button aria-label={t("common.close")} onClick={onClear} className="text-muted-foreground hover:text-foreground">
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
        <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => subWeeks(w, 1))}>{t("common.prev")}</Button>
        <div className="text-center">
          <p className="font-medium">{t("week.weekNumber", { n: week })}</p>
          <p className="text-xs text-muted-foreground">
            {format(weekStart, "MMM d", { locale })} – {format(addDays(weekStart, 6), "MMM d, yyyy", { locale })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>{t("common.next")}</Button>
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const ds = toDateString(day);
          const isToday = ds === toDateString(today);
          const list = dayTasks[ds] ?? [];
          const done = list.filter((x) => x.is_completed).length;
          return (
            <Link
              key={ds}
              to={isToday ? "/today" : `/today?date=${ds}`}
              aria-label={`${format(day, "EEEE d MMMM", { locale })}: ${t("common.doneCount", { done, total: list.length })}`}
              className={cn(
                "flex flex-col items-center rounded-lg border px-1 py-2 text-xs transition-colors hover:border-primary/50 hover:bg-accent",
                isToday ? "border-primary bg-primary-soft font-semibold text-primary" : "bg-card text-muted-foreground",
              )}
            >
              <span>{format(day, "EEE", { locale })}</span>
              <span className="text-base font-semibold text-foreground">{format(day, "d", { locale })}</span>
              <span className="mt-1 h-4 tabular-nums">
                {list.length > 0 && (
                  <span className={cn("rounded-full px-1.5 text-[11px] font-semibold", done === list.length ? "bg-success-soft text-success" : "bg-secondary text-secondary-foreground")}>
                    {done}/{list.length}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Weekly AI Review */}
      <WeeklyReviewCard year={year} week={week} isCurrentWeek={isCurrentWeek} />

      {/* Priorities */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("week.priorities")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {priorities.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("week.noPriorities")}</p>
          )}

          {priorities.map((p) => {
            const dlInfo  = weekDeadlineText(p.deadline_date, t, locale);
            const picking = dlPickerId === p.id;
            return (
              <div
                key={p.id}
                draggable
                onDragStart={(e) =>
                  setChatDragItem(e, {
                    kind: "weekly",
                    title: p.title,
                    deadline: p.deadline_date,
                    completed: p.is_completed,
                    description: p.description,
                  })
                }
                className={`group flex flex-col rounded-md border px-3 py-2 transition-colors ${
                  dlInfo?.overdue && !p.is_completed
                    ? "border-danger/30 bg-danger-soft/60"
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
                        dlInfo.overdue ? "text-danger"
                        : dlInfo.urgent ? "text-warning"
                        : "text-info"
                      } hover:opacity-70`}
                    >
                      <Clock className="h-3 w-3" />
                      {dlInfo.text}
                    </button>
                  )}

                  {!p.is_completed && (
                    addedToToday === p.id ? (
                      <span role="status" className="flex items-center gap-1 text-xs font-semibold text-success">
                        <Check className="h-3.5 w-3.5" aria-hidden />
                        {t("week.addedToToday")}
                      </span>
                    ) : (
                      <Button
                        size="icon-sm"
                        variant="subtle"
                        onClick={() => addToToday(p)}
                        aria-label={t("week.addToToday")}
                        title={t("week.addToToday")}
                      >
                        <CalendarPlus className="h-4 w-4" aria-hidden />
                      </Button>
                    )
                  )}

                  {/* Ghost clock — shown on hover when no deadline */}
                  {!p.deadline_date && !p.is_completed && !picking && (
                    <button aria-label={t("day.setDeadline")}
                      onClick={() => openDlPicker(p)}
                      className="row-action text-muted-foreground/70 hover:text-foreground"
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
                        {t("common.save")}
                      </button>
                      <button onClick={() => setDlPickerId(null)} className="text-xs text-muted-foreground hover:text-foreground">
                        {t("common.cancel")}
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
                placeholder={t("week.addPriorityPlaceholder")}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button aria-label={t("common.add")} size="sm" onClick={addPriority}><Plus className="h-4 w-4" /></Button>
            </div>

            {!showDlPicker && !newDeadline ? (
              <button
                type="button"
                onClick={() => setShowDlPicker(true)}
                className="flex items-center gap-1 pl-1 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                <Clock className="h-3 w-3" />
                {t("common.dueBy")}
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
