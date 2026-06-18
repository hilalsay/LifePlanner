import { useState, useEffect } from "react";
import { X, Plus, Trash2, Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { planningApi, type YearlyGoal, type LifeArea, type MonthlyFocus } from "@/lib/api";
import { useI18n } from "@/contexts/LanguageContext";
import { dateLocale } from "@/lib/dateLocale";
import { format } from "date-fns";

const STATUS_OPTIONS = ["active", "completed", "abandoned"] as const;

const STATUS_COLORS: Record<string, string> = {
  active: "text-blue-600 bg-blue-50 border-blue-200",
  completed: "text-green-600 bg-green-50 border-green-200",
  abandoned: "text-red-500 bg-red-50 border-red-200",
};

interface Props {
  goal: YearlyGoal;
  areas: LifeArea[];
  onClose: () => void;
  onUpdate: (updated: YearlyGoal) => void;
}

export function GoalDetailPanel({ goal, areas, onClose, onUpdate }: Props) {
  const { t, lang } = useI18n();
  const locale = dateLocale(lang);
  const MONTHS = Array.from({ length: 12 }, (_, i) => format(new Date(2020, i, 1), "MMM", { locale }));
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description ?? "");
  const [progress, setProgress] = useState(goal.progress);
  const [status, setStatus] = useState(goal.status);
  const [deadline, setDeadline] = useState(goal.deadline_date ?? "");
  const [areaId, setAreaId] = useState(goal.life_area_id ?? "");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [focuses, setFocuses] = useState<MonthlyFocus[]>([]);
  const [newFocusTitle, setNewFocusTitle] = useState("");
  const [newFocusMonth, setNewFocusMonth] = useState(new Date().getMonth() + 1);
  const [newFocusYear, setNewFocusYear] = useState(goal.year);

  useEffect(() => {
    planningApi.getMonthlyFocuses(goal.year).then((all) => {
      setFocuses(
        all
          .filter((f) => f.yearly_goal_id === goal.id)
          .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
      );
    }).catch(console.error);
  }, [goal.id, goal.year]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const mark = () => setDirty(true);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await planningApi.updateYearlyGoal(goal.id, {
        title: title.trim() || goal.title,
        description: description.trim() || undefined,
        progress,
        status,
        deadline_date: deadline || undefined,
        life_area_id: areaId || undefined,
      } as Partial<YearlyGoal>);
      onUpdate(updated);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const addFocus = async () => {
    if (!newFocusTitle.trim()) return;
    const f = await planningApi.createMonthlyFocus({
      yearly_goal_id: goal.id,
      year: newFocusYear,
      month: newFocusMonth,
      title: newFocusTitle.trim(),
    });
    setFocuses((prev) =>
      [...prev, f].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    );
    setNewFocusTitle("");
  };

  const deleteFocus = async (id: string) => {
    await planningApi.deleteMonthlyFocus(id);
    setFocuses((prev) => prev.filter((f) => f.id !== id));
  };

  const currentArea = areas.find((a) => a.id === areaId);
  const progressRounded = Math.round(progress);

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-2xl border-l">
        {/* header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            {currentArea && (
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: currentArea.color }}
              />
            )}
            <h3 className="font-semibold truncate max-w-xs">{goal.title}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {dirty && (
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? t("common.saving") : t("common.save")}
              </Button>
            )}
            <button
              onClick={onClose}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("goalDetail.titleLabel")}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); mark(); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("goalDetail.notes")}</label>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); mark(); }}
              rows={3}
              placeholder={t("goalDetail.notesPlaceholder")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> {t("goalDetail.progress")}
              </label>
              <span className="text-sm font-bold tabular-nums">{progressRounded}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => { setProgress(Number(e.target.value)); mark(); }}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Status & Target Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("goalDetail.status")}</label>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); mark(); }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {t(`status.${s}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {t("goalDetail.targetDate")}
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => { setDeadline(e.target.value); mark(); }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Life Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("goalDetail.lifeArea")}</label>
            <select
              value={areaId}
              onChange={(e) => { setAreaId(e.target.value); mark(); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t("common.none")}</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Status badge preview */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "text-muted-foreground"}`}>
              {t(`status.${status}`)}
            </span>
            {deadline && (
              <span className="text-xs text-muted-foreground">
                {t("goalDetail.target", { date: new Date(deadline + "T00:00:00").toLocaleDateString(lang === "tr" ? "tr-TR" : undefined, { year: "numeric", month: "short", day: "numeric" }) })}
              </span>
            )}
          </div>

          <div className="border-t" />

          {/* Monthly Milestones */}
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold">{t("goalDetail.milestones")}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("goalDetail.milestonesHelp")}
              </p>
            </div>

            {focuses.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">{t("goalDetail.noMilestones")}</p>
            ) : (
              <div className="space-y-2">
                {focuses.map((f) => (
                  <div
                    key={f.id}
                    className="group flex items-center gap-2 rounded-md border px-3 py-2.5"
                  >
                    <Badge variant="outline" className="text-xs shrink-0 font-medium">
                      {MONTHS[f.month - 1]} {f.year !== goal.year ? f.year : ""}
                    </Badge>
                    <span className="flex-1 text-sm">{f.title}</span>
                    {f.deadline_date && (
                      <span className="text-xs text-muted-foreground shrink-0 hidden group-hover:inline">
                        {f.deadline_date}
                      </span>
                    )}
                    <button
                      onClick={() => deleteFocus(f.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add milestone */}
            <div className="rounded-md border border-dashed p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("goalDetail.addMilestone")}</p>
              <div className="flex gap-2">
                <select
                  value={newFocusMonth}
                  onChange={(e) => setNewFocusMonth(Number(e.target.value))}
                  className="rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={newFocusYear}
                  onChange={(e) => setNewFocusYear(Number(e.target.value))}
                  className="rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                >
                  {[goal.year - 1, goal.year, goal.year + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newFocusTitle}
                  onChange={(e) => setNewFocusTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addFocus()}
                  placeholder={t("goalDetail.milestonePlaceholder")}
                  className="flex-1 min-w-0 rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                />
                <Button size="sm" variant="outline" onClick={addFocus} className="shrink-0">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
