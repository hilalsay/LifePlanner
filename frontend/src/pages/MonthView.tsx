import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { format, getDaysInMonth, startOfMonth, getDay, addMonths, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { planningApi, type MonthlyFocus } from "@/lib/api";

export function MonthView() {
  const [month, setMonth] = useState(new Date());
  const [focuses, setFocuses] = useState<MonthlyFocus[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const year = month.getFullYear();
  const monthNum = month.getMonth() + 1;

  useEffect(() => {
    planningApi.getMonthlyFocuses(year, monthNum).then(setFocuses).catch(console.error);
  }, [year, monthNum]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const addFocus = async () => {
    if (!newTitle.trim()) return;
    const f = await planningApi.createMonthlyFocus({ year, month: monthNum, title: newTitle.trim() });
    setFocuses((fs) => [...fs, f]);
    setNewTitle("");
  };

  const saveEdit = async (id: string) => {
    if (!editingValue.trim()) { setEditingId(null); return; }
    const updated = await planningApi.updateMonthlyFocus(id, { title: editingValue.trim() });
    setFocuses((fs) => fs.map((f) => (f.id === id ? updated : f)));
    setEditingId(null);
  };

  const deleteFocus = async (id: string) => {
    await planningApi.deleteMonthlyFocus(id);
    setFocuses((fs) => fs.filter((f) => f.id !== id));
  };

  const daysInMonth = getDaysInMonth(month);
  const firstDayOffset = (getDay(startOfMonth(month)) + 6) % 7; // Mon=0
  const today = new Date();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setMonth((m) => subMonths(m, 1))}>
          Prev
        </Button>
        <h2 className="font-semibold">{format(month, "MMMM yyyy")}</h2>
        <Button variant="outline" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))}>
          Next
        </Button>
      </div>

      <div className="rounded-xl border">
        <div className="grid grid-cols-7 border-b">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDayOffset }, (_, i) => (
            <div key={`empty-${i}`} className="h-10 border-b border-r last:border-r-0" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const isToday =
              today.getDate() === day &&
              today.getMonth() + 1 === monthNum &&
              today.getFullYear() === year;
            return (
              <div
                key={day}
                className={`flex h-10 items-center justify-center border-b border-r text-sm last:border-r-0 ${
                  isToday ? "bg-primary/10 font-bold text-primary" : "text-foreground"
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Monthly Focus Areas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {focuses.length === 0 && (
            <p className="text-sm text-muted-foreground">No focus areas yet.</p>
          )}
          {focuses.map((f) => (
            <div key={f.id} className="group rounded-md border px-3 py-2">
              {editingId === f.id ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(f.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 rounded border bg-background px-2 py-0.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button onClick={() => saveEdit(f.id)} className="text-primary hover:opacity-70">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:opacity-70">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{f.title}</p>
                    {f.description && <p className="mt-1 text-xs text-muted-foreground">{f.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => { setEditingId(f.id); setEditingValue(f.title); }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteFocus(f.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFocus()}
              placeholder="Add a focus area..."
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button size="sm" onClick={addFocus}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
