import { useState, useEffect, useRef } from "react";
import { Plus, Check, Pencil, Trash2, X } from "lucide-react";
import { format, startOfWeek, addWeeks, subWeeks, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { planningApi, type WeeklyPriority } from "@/lib/api";
import { getISOWeek } from "@/lib/utils";

export function WeekView() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [priorities, setPriorities] = useState<WeeklyPriority[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const year = weekStart.getFullYear();
  const week = getISOWeek(weekStart);

  useEffect(() => {
    planningApi.getWeeklyPriorities(year, week).then(setPriorities).catch(console.error);
  }, [year, week]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const addPriority = async () => {
    if (!newTitle.trim()) return;
    const p = await planningApi.createWeeklyPriority({ year, week_number: week, title: newTitle.trim() });
    setPriorities((ps) => [...ps, p]);
    setNewTitle("");
  };

  const toggle = async (p: WeeklyPriority) => {
    const updated = await planningApi.updateWeeklyPriority(p.id, { is_completed: !p.is_completed });
    setPriorities((ps) => ps.map((x) => (x.id === p.id ? updated : x)));
  };

  const saveEdit = async (id: string) => {
    if (!editingValue.trim()) { setEditingId(null); return; }
    const updated = await planningApi.updateWeeklyPriority(id, { title: editingValue.trim() });
    setPriorities((ps) => ps.map((x) => (x.id === id ? updated : x)));
    setEditingId(null);
  };

  const deletePriority = async (id: string) => {
    await planningApi.deleteWeeklyPriority(id);
    setPriorities((ps) => ps.filter((x) => x.id !== id));
  };

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => subWeeks(w, 1))}>
          Prev
        </Button>
        <div className="text-center">
          <p className="font-medium">Week {week}</p>
          <p className="text-xs text-muted-foreground">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
          Next
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`rounded-md border p-2 text-center text-xs ${
              format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                ? "border-primary bg-primary/5 font-semibold text-primary"
                : "text-muted-foreground"
            }`}
          >
            <p>{format(day, "EEE")}</p>
            <p className="text-base font-medium">{format(day, "d")}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly Priorities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {priorities.length === 0 && (
            <p className="text-sm text-muted-foreground">No priorities yet.</p>
          )}
          {priorities.map((p) => (
            <div key={p.id} className="group flex items-center gap-3 rounded-md border px-3 py-2">
              <button
                onClick={() => toggle(p)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  p.is_completed
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground"
                }`}
              >
                {p.is_completed && <Check className="h-3 w-3" />}
              </button>
              {editingId === p.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(p.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 rounded border bg-background px-2 py-0.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button onClick={() => saveEdit(p.id)} className="text-primary hover:opacity-70">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:opacity-70">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className={`flex-1 text-sm ${p.is_completed ? "line-through text-muted-foreground" : ""}`}>
                    {p.title}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingId(p.id); setEditingValue(p.title); }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deletePriority(p.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPriority()}
              placeholder="Add a priority..."
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button size="sm" onClick={addPriority}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
