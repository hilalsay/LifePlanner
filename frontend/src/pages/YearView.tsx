import { useState, useEffect, useRef } from "react";
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { planningApi, type YearlyGoal } from "@/lib/api";
import { setChatDragItem } from "@/lib/dragItem";

const STATUS_VARIANT = {
  active: "default",
  completed: "secondary",
  abandoned: "destructive",
} as const;

export function YearView() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [goals, setGoals] = useState<YearlyGoal[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    planningApi.getYearlyGoals(year).then(setGoals).catch(console.error);
  }, [year]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const addGoal = async () => {
    if (!newTitle.trim()) return;
    const g = await planningApi.createYearlyGoal({ year, title: newTitle.trim() });
    setGoals((gs) => [...gs, g]);
    setNewTitle("");
  };

  const toggleStatus = async (goal: YearlyGoal) => {
    const next = goal.status === "active" ? "completed" : "active";
    const updated = await planningApi.updateYearlyGoal(goal.id, { status: next });
    setGoals((gs) => gs.map((g) => (g.id === goal.id ? updated : g)));
  };

  const startEdit = (goal: YearlyGoal) => {
    setEditingId(goal.id);
    setEditingValue(goal.title);
  };

  const saveEdit = async (id: string) => {
    if (!editingValue.trim()) { setEditingId(null); return; }
    const updated = await planningApi.updateYearlyGoal(id, { title: editingValue.trim() });
    setGoals((gs) => gs.map((g) => (g.id === id ? updated : g)));
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const deleteGoal = async (id: string) => {
    await planningApi.deleteYearlyGoal(id);
    setGoals((gs) => gs.filter((g) => g.id !== id));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setYear((y) => y - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold">{year}</h2>
        <Button variant="ghost" size="icon" onClick={() => setYear((y) => y + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Yearly Goals</CardTitle>
            <span className="text-xs text-muted-foreground">
              {goals.filter((g) => g.status === "completed").length} / {goals.length} completed
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {goals.length === 0 && (
            <p className="text-sm text-muted-foreground">No goals set for {year}.</p>
          )}
          {goals.map((goal) => (
            <div
              key={goal.id}
              draggable
              onDragStart={(e) =>
                setChatDragItem(e, {
                  kind: "yearly",
                  title: goal.title,
                  description: goal.description,
                })
              }
              className="group flex items-start gap-3 rounded-md border px-3 py-3"
            >
              <div className="flex-1 min-w-0">
                {editingId === goal.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(goal.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="flex-1 rounded border bg-background px-2 py-0.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button onClick={() => saveEdit(goal.id)} className="text-primary hover:opacity-70">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={cancelEdit} className="text-muted-foreground hover:opacity-70">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-medium">{goal.title}</p>
                )}
                {goal.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{goal.description}</p>
                )}
                {goal.progress > 0 && (
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(goal.progress, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {editingId !== goal.id && (
                  <button
                    onClick={() => startEdit(goal)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <Badge
                  variant={STATUS_VARIANT[goal.status as keyof typeof STATUS_VARIANT] ?? "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => toggleStatus(goal)}
                >
                  {goal.status}
                </Badge>
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addGoal()}
              placeholder="Add a yearly goal..."
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button size="sm" onClick={addGoal}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
