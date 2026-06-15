import { useState, useEffect, useRef } from "react";
import { Plus, Target, Pencil, Trash2, Check, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoalDetailPanel } from "@/components/GoalDetailPanel";
import { planningApi, type LifeArea, type YearlyGoal } from "@/lib/api";

const AREA_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6",
];

export function VisionBoard() {
  const [areas, setAreas] = useState<LifeArea[]>([]);
  const [goals, setGoals] = useState<YearlyGoal[]>([]);
  const [newAreaName, setNewAreaName] = useState("");
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingAreaValue, setEditingAreaValue] = useState("");
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingGoalValue, setEditingGoalValue] = useState("");
  const [detailGoal, setDetailGoal] = useState<YearlyGoal | null>(null);
  const areaEditRef = useRef<HTMLInputElement>(null);
  const goalEditRef = useRef<HTMLInputElement>(null);

  const year = new Date().getFullYear();

  useEffect(() => {
    Promise.all([
      planningApi.getLifeAreas(),
      planningApi.getYearlyGoals(year),
    ]).then(([a, g]) => {
      setAreas(a);
      setGoals(g);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (editingAreaId) areaEditRef.current?.focus();
  }, [editingAreaId]);

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

  const saveAreaEdit = async (id: string) => {
    if (!editingAreaValue.trim()) { setEditingAreaId(null); return; }
    const updated = await planningApi.updateLifeArea(id, { name: editingAreaValue.trim() });
    setAreas((as) => as.map((a) => (a.id === id ? updated : a)));
    setEditingAreaId(null);
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

  const deleteGoal = async (id: string) => {
    await planningApi.deleteYearlyGoal(id);
    setGoals((gs) => gs.filter((g) => g.id !== id));
  };

  const handleGoalUpdate = (updated: YearlyGoal) => {
    setGoals((gs) => gs.map((g) => (g.id === updated.id ? updated : g)));
    setDetailGoal(updated);
  };

  const areaGoals = (areaId: string) => goals.filter((g) => g.life_area_id === areaId);
  const visibleGoals = selectedArea ? areaGoals(selectedArea) : goals;

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Life Vision — {year}</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <Card
              key={area.id}
              className={`group transition-shadow hover:shadow-md ${
                selectedArea === area.id ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 shrink-0 rounded-full cursor-pointer"
                    style={{ backgroundColor: area.color }}
                    onClick={() => setSelectedArea(selectedArea === area.id ? null : area.id)}
                  />
                  {editingAreaId === area.id ? (
                    <div className="flex flex-1 items-center gap-1">
                      <input
                        ref={areaEditRef}
                        type="text"
                        value={editingAreaValue}
                        onChange={(e) => setEditingAreaValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveAreaEdit(area.id);
                          if (e.key === "Escape") setEditingAreaId(null);
                        }}
                        className="flex-1 rounded border bg-background px-2 py-0.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button onClick={() => saveAreaEdit(area.id)} className="text-primary hover:opacity-70">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setEditingAreaId(null)} className="text-muted-foreground hover:opacity-70">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <CardTitle
                        className="flex-1 cursor-pointer text-sm"
                        onClick={() => setSelectedArea(selectedArea === area.id ? null : area.id)}
                      >
                        {area.name}
                      </CardTitle>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingAreaId(area.id); setEditingAreaValue(area.name); }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteArea(area.id); }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent
                className="cursor-pointer space-y-1"
                onClick={() => editingAreaId !== area.id && setSelectedArea(selectedArea === area.id ? null : area.id)}
              >
                {areaGoals(area.id).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No goals yet</p>
                ) : (
                  areaGoals(area.id).map((g) => (
                    <div key={g.id} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                      <p className="flex-1 text-xs truncate">{g.title}</p>
                      {g.progress > 0 && (
                        <span className="text-xs text-muted-foreground shrink-0">{Math.round(g.progress)}%</span>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}

          <Card className="border-dashed">
            <CardContent className="flex h-full items-center justify-center p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addArea()}
                  placeholder="New life area..."
                  className="w-32 rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                />
                <Button size="sm" variant="outline" onClick={addArea}>
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
                {selectedArea
                  ? `Goals — ${areas.find((a) => a.id === selectedArea)?.name}`
                  : `All Goals — ${year}`}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {visibleGoals.filter((g) => g.status === "completed").length} / {visibleGoals.length} completed
                </span>
                {selectedArea && (
                  <Badge
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setSelectedArea(null)}
                  >
                    Clear filter
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {visibleGoals.map((g) => {
              const area = areas.find((a) => a.id === g.life_area_id);
              return (
                <div key={g.id} className="group flex items-center gap-3 rounded-md border px-3 py-2">
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: area?.color ?? "#94a3b8" }}
                  />

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
                      <button onClick={() => saveGoalEdit(g.id)} className="text-primary hover:opacity-70">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingGoalId(null)} className="text-muted-foreground hover:opacity-70">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* title + sub-info */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm">{g.title}</span>
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

                      {/* actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {g.progress > 0 && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {Math.round(g.progress)}%
                          </span>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingGoalId(g.id); setEditingGoalValue(g.title); }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteGoal(g.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <Badge variant={g.status === "completed" ? "secondary" : "outline"} className="text-xs">
                          {g.status}
                        </Badge>
                        <button
                          onClick={() => setDetailGoal(g)}
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="View details"
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
                placeholder={selectedArea ? `Add goal to ${areas.find((a) => a.id === selectedArea)?.name}...` : "Add a goal..."}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button size="sm" onClick={addGoal}>
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
