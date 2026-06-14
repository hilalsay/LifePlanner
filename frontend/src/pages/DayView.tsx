import { useState, useEffect, useRef } from "react";
import { Plus, Check, Trash2, ChevronLeft, ChevronRight, GripVertical, Pencil, X } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { planningApi, type DailyTask } from "@/lib/api";
import { toDateString } from "@/lib/utils";

const PRIORITY_COLORS = {
  high: "destructive",
  medium: "default",
  low: "secondary",
} as const;

const PRIORITY_CYCLE: Record<string, "low" | "medium" | "high"> = {
  low: "medium",
  medium: "high",
  high: "low",
};

function orderKey(dateStr: string) {
  return `lp-task-order-${dateStr}`;
}

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

export function DayView() {
  const [date, setDate] = useState(new Date());
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const dateStr = toDateString(date);

  useEffect(() => {
    setLoading(true);
    planningApi
      .getDailyTasks(dateStr)
      .then((fetched) => setTasks(applyStoredOrder(fetched, dateStr)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dateStr]);

  const addTask = async () => {
    if (!newTitle.trim()) return;
    const task = await planningApi.createDailyTask({
      title: newTitle.trim(),
      task_date: dateStr,
      priority: "medium",
    });
    setTasks((prev) => {
      const next = [...prev, task];
      persistOrder(next, dateStr);
      return next;
    });
    setNewTitle("");
  };

  const toggleTask = async (task: DailyTask) => {
    const updated = await planningApi.updateDailyTask(task.id, {
      is_completed: !task.is_completed,
    });
    setTasks((ts) => ts.map((t) => (t.id === task.id ? updated : t)));
  };

  const deleteTask = async (id: string) => {
    await planningApi.deleteDailyTask(id);
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      persistOrder(next, dateStr);
      return next;
    });
  };

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const saveEdit = async (id: string) => {
    if (!editingValue.trim()) { setEditingId(null); return; }
    const updated = await planningApi.updateDailyTask(id, { title: editingValue.trim() });
    setTasks((ts) => ts.map((t) => (t.id === id ? updated : t)));
    setEditingId(null);
  };

  const cyclePriority = async (task: DailyTask) => {
    const next = PRIORITY_CYCLE[task.priority] ?? "medium";
    const updated = await planningApi.updateDailyTask(task.id, { priority: next });
    setTasks((ts) => ts.map((t) => (t.id === task.id ? updated : t)));
  };

  // ── drag handlers ──────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragId) setDragOverId(id);
  };

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setTasks((prev) => {
      const next = [...prev];
      const from = next.findIndex((t) => t.id === dragId);
      const to = next.findIndex((t) => t.id === targetId);
      next.splice(to, 0, next.splice(from, 1)[0]);
      persistOrder(next, dateStr);
      return next;
    });
    setDragId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
  };

  const completed = tasks.filter((t) => t.is_completed).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <MotivationalBanner />

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setDate((d) => subDays(d, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium">{format(date, "EEEE")}</p>
          <p className="text-xs text-muted-foreground">{format(date, "MMMM d, yyyy")}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setDate((d) => addDays(d, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Tasks</CardTitle>
            <span className="text-xs text-muted-foreground">
              {completed} / {tasks.length} done
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet. Add one below.</p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragOver={(e) => handleDragOver(e, task.id)}
                onDrop={() => handleDrop(task.id)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 rounded-md border px-2 py-2 transition-all select-none ${
                  dragId === task.id ? "opacity-40" : "opacity-100"
                } ${
                  dragOverId === task.id ? "border-primary border-dashed bg-primary/5" : ""
                }`}
              >
                {/* drag handle */}
                <span className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing shrink-0">
                  <GripVertical className="h-4 w-4" />
                </span>

                {/* completion toggle */}
                <button
                  onClick={() => toggleTask(task)}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    task.is_completed
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground"
                  }`}
                >
                  {task.is_completed && <Check className="h-3 w-3" />}
                </button>

                {/* title / inline edit */}
                {editingId === task.id ? (
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
                    <button onClick={() => saveEdit(task.id)} className="text-primary hover:opacity-70 shrink-0">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:opacity-70 shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span
                      className={`flex-1 text-sm ${
                        task.is_completed ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {task.title}
                    </span>

                    {/* priority badge — click to cycle */}
                    <Badge
                      variant={PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] ?? "outline"}
                      className="cursor-pointer text-xs shrink-0"
                      title="Click to change priority"
                      onClick={() => cyclePriority(task)}
                    >
                      {task.priority}
                    </Badge>

                    {/* edit */}
                    <button
                      onClick={() => { setEditingId(task.id); setEditingValue(task.title); }}
                      className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    {/* delete */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}

          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="Add a task..."
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
            />
            <Button size="sm" onClick={addTask}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
