import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, Check, X, ChevronRight, ChevronLeft, CircleCheck, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoalDetailPanel } from "@/components/GoalDetailPanel";
import { AreaCard, AREA_COLORS } from "@/components/AreaCard";
import { planningApi, type LifeArea, type YearlyGoal } from "@/lib/api";
import { useI18n } from "@/contexts/LanguageContext";

export function VisionBoard() {
  const { t } = useI18n();
  const [areas, setAreas] = useState<LifeArea[]>([]);
  const [goals, setGoals] = useState<YearlyGoal[]>([]);
  const [newAreaName, setNewAreaName] = useState("");
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingGoalValue, setEditingGoalValue] = useState("");
  const [detailGoal, setDetailGoal] = useState<YearlyGoal | null>(null);
  const goalEditRef = useRef<HTMLInputElement>(null);

  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);

  useEffect(() => {
    planningApi.getLifeAreas().then(setAreas).catch(console.error);
  }, []);

  useEffect(() => {
    planningApi.getYearlyGoals(year).then(setGoals).catch(console.error);
  }, [year]);

  useEffect(() => {
    if (editingGoalId) goalEditRef.current?.focus();
  }, [editingGoalId]);

  const addArea = async () => {
    if (!newAreaName.trim()) return;
    const color = AREA_COLORS[areas.length % AREA_COLORS.length];
    const a = await planningApi.createLifeArea({ name: newAreaName.trim(), color });
    setAreas((as) => [...as, a]);
    setNewAreaName("");
  };

  const updateArea = async (id: string, data: Partial<LifeArea>) => {
    const updated = await planningApi.updateLifeArea(id, data);
    setAreas((as) => as.map((a) => (a.id === id ? updated : a)));
  };

  const deleteArea = async (id: string) => {
    await planningApi.deleteLifeArea(id);
    setAreas((as) => as.filter((a) => a.id !== id));
    if (selectedArea === id) setSelectedArea(null);
  };

  const addGoal = async () => {
    if (!newGoalTitle.trim()) return;
    const g = await planningApi.createYearlyGoal({
      year,
      title: newGoalTitle.trim(),
      life_area_id: selectedArea ?? undefined,
    });
    setGoals((gs) => [...gs, g]);
    setNewGoalTitle("");
  };

  const saveGoalEdit = async (id: string) => {
    if (!editingGoalValue.trim()) { setEditingGoalId(null); return; }
    const updated = await planningApi.updateYearlyGoal(id, { title: editingGoalValue.trim() });
    setGoals((gs) => gs.map((g) => (g.id === id ? updated : g)));
    setEditingGoalId(null);
  };

  // One-tap done/undone (carried over from the old Year page).
  const toggleGoalDone = async (g: YearlyGoal) => {
    const updated = await planningApi.updateYearlyGoal(g.id, { status: g.status === "completed" ? "active" : "completed" });
    setGoals((gs) => gs.map((x) => (x.id === g.id ? updated : x)));
  };

  const deleteGoal = async (id: string) => {
    await planningApi.deleteYearlyGoal(id);
    setGoals((gs) => gs.filter((g) => g.id !== id));
  };

  const handleGoalUpdate = (updated: YearlyGoal) => {
    setGoals((gs) => gs.map((g) => (g.id === updated.id ? updated : g)));
    setDetailGoal(updated);
  };

  const areaGoals = (areaId: string) => goals.filter((g) => g.life_area_id === areaId);

  // Active areas first, then inactive (stable within each group)
  const sortedAreas = [...areas].sort((a, b) => Number(b.is_active) - Number(a.is_active));

  // Set of inactive area ids — their goals are hidden from the "All Goals" list
  const inactiveAreaIds = new Set(areas.filter((a) => !a.is_active).map((a) => a.id));

  const visibleGoals = selectedArea
    ? areaGoals(selectedArea)
    : goals.filter((g) => !g.life_area_id || !inactiveAreaIds.has(g.life_area_id));

  const selectedAreaName = areas.find((a) => a.id === selectedArea)?.name;

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">{t("vision.title", { year })}</h2>
          <div className="flex items-center gap-1">
            {year !== thisYear && (
              <Button variant="outline" size="sm" onClick={() => setYear(thisYear)}>{thisYear}</Button>
            )}
            <Button variant="outline" size="icon" aria-label={t("common.prev")} onClick={() => setYear((y) => y - 1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="outline" size="icon" aria-label={t("common.next")} onClick={() => setYear((y) => y + 1)}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedAreas.map((area) => (
            <AreaCard
              key={area.id}
              area={area}
              goals={areaGoals(area.id)}
              selected={selectedArea === area.id}
              onSelect={() => setSelectedArea(selectedArea === area.id ? null : area.id)}
              onUpdate={(data) => updateArea(area.id, data)}
              onDelete={() => deleteArea(area.id)}
            />
          ))}

          <Card className="border-dashed">
            <CardContent className="flex h-full items-center justify-center p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addArea()}
                  placeholder={t("vision.newAreaPlaceholder")}
                  className="w-32 rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                />
                <Button aria-label={t("common.add")} size="sm" variant="outline" onClick={addArea}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {selectedArea ? t("vision.goalsForArea", { name: selectedAreaName ?? "" }) : t("vision.allGoals", { year })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {t("common.completedCount", { done: visibleGoals.filter((g) => g.status === "completed").length, total: visibleGoals.length })}
                </span>
                {selectedArea && (
                  <Badge
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setSelectedArea(null)}
                  >
                    {t("vision.clearFilter")}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {visibleGoals.map((g) => {
              const area = areas.find((a) => a.id === g.life_area_id);
              return (
                <div key={g.id} className="group flex items-center gap-3 rounded-lg border px-3 py-2">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={g.status === "completed"}
                    aria-label={g.title}
                    onClick={() => toggleGoalDone(g)}
                    className="-m-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    style={{ color: area?.color }}
                  >
                    {g.status === "completed"
                      ? <CircleCheck className="h-5 w-5" aria-hidden />
                      : <Circle className="h-5 w-5 text-muted-foreground/60" aria-hidden />}
                  </button>

                  {editingGoalId === g.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        ref={goalEditRef}
                        type="text"
                        value={editingGoalValue}
                        onChange={(e) => setEditingGoalValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveGoalEdit(g.id);
                          if (e.key === "Escape") setEditingGoalId(null);
                        }}
                        className="flex-1 rounded border bg-background px-2 py-0.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button aria-label={t("common.save")} onClick={() => saveGoalEdit(g.id)} className="text-primary hover:opacity-70">
                        <Check className="h-4 w-4" />
                      </button>
                      <button aria-label={t("common.close")} onClick={() => setEditingGoalId(null)} className="text-muted-foreground hover:opacity-70">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <span className={g.status === "completed" ? "text-sm text-muted-foreground line-through" : "text-sm"}>{g.title}</span>
                        {g.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{g.description}</p>
                        )}
                        {g.progress > 0 && (
                          <div className="mt-1.5 h-1 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-1 rounded-full bg-primary transition-all"
                              style={{ width: `${Math.min(g.progress, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {g.progress > 0 && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {Math.round(g.progress)}%
                          </span>
                        )}
                        <div className="row-action flex items-center gap-1">
                          <button aria-label={t("common.edit")}
                            onClick={() => { setEditingGoalId(g.id); setEditingGoalValue(g.title); }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button aria-label={t("common.delete")}
                            onClick={() => deleteGoal(g.id)}
                            className="text-muted-foreground hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <Badge variant={g.status === "completed" ? "secondary" : "outline"} className="text-xs">
                          {t(`status.${g.status}`)}
                        </Badge>
                        <button aria-label={t("common.expand")}
                          onClick={() => setDetailGoal(g)}
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title={t("vision.viewDetails")}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            <div className="flex gap-2 pt-2">
              <input
                type="text"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGoal()}
                placeholder={selectedArea ? t("vision.addGoalToArea", { name: selectedAreaName ?? "" }) : t("vision.addGoalPlaceholder")}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button aria-label={t("common.add")} size="sm" onClick={addGoal}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {detailGoal && (
        <GoalDetailPanel
          goal={detailGoal}
          areas={areas}
          onClose={() => setDetailGoal(null)}
          onUpdate={handleGoalUpdate}
        />
      )}
    </>
  );
}
