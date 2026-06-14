import { useState, useEffect } from "react";
import { Plus, Clock, X } from "lucide-react";
import {
  format, getDaysInMonth, startOfMonth, getDay,
  addMonths, subMonths, differenceInCalendarDays, parseISO,
  lastDayOfMonth, setDate,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { planningApi, type MonthlyFocus } from "@/lib/api";
import { toDateString } from "@/lib/utils";

// ── Deadline helpers ──────────────────────────────────────────────────────────

function monthDeadlineText(deadline_date?: string): { text: string; overdue: boolean; urgent: boolean } | null {
  if (!deadline_date) return null;
  const today = new Date();
  const todayStr = toDateString(today);
  const diff = differenceInCalendarDays(parseISO(deadline_date), parseISO(todayStr));
  if (diff < 0)  return { text: `Overdue by ${Math.abs(diff)}d`, overdue: true, urgent: false };
  if (diff === 0) return { text: "Due today", overdue: false, urgent: true };
  if (diff === 1) return { text: "Due tomorrow", overdue: false, urgent: true };
  return { text: `Due ${format(parseISO(deadline_date), "MMM d")}`, overdue: false, urgent: false };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MonthView() {
  const [month, setMonth]     = useState(new Date());
  const [focuses, setFocuses] = useState<MonthlyFocus[]>([]);
  const [newTitle, setNewTitle]   = useState("");
  const [showDlPicker, setShowDlPicker] = useState(false);
  const [newDeadline, setNewDeadline]   = useState("");
  const [dlPickerId, setDlPickerId]     = useState<string | null>(null);
  const [dlPickerDate, setDlPickerDate] = useState("");

  const year     = month.getFullYear();
  const monthNum = month.getMonth() + 1;
  const today    = new Date();

  useEffect(() => {
    planningApi.getMonthlyFocuses(year, monthNum).then(setFocuses).catch(console.error);
  }, [year, monthNum]);

  const daysInMonth    = getDaysInMonth(month);
  const firstDayOffset = (getDay(startOfMonth(month)) + 6) % 7; // Mon=0

  // Quick deadline options for this month
  const eom        = toDateString(lastDayOfMonth(month));
  const midMonth   = toDateString(setDate(new Date(year, monthNum - 1, 1), 15));
  const todayStr   = toDateString(today);
  const quickOpts  = [
    ...(midMonth > todayStr ? [{ label: "Mid-month (15th)", date: midMonth }] : []),
    { label: "End of month", date: eom },
  ];

  const addFocus = async () => {
    if (!newTitle.trim()) return;
    const f = await planningApi.createMonthlyFocus({
      year,
      month: monthNum,
      title: newTitle.trim(),
      deadline_date: newDeadline || undefined,
    });
    setFocuses((fs) => [...fs, f]);
    setNewTitle("");
    setNewDeadline("");
    setShowDlPicker(false);
  };

  const openDlPicker = (f: MonthlyFocus) => {
    setDlPickerId(f.id);
    setDlPickerDate(f.deadline_date ?? "");
  };

  const saveDeadline = async (id: string) => {
    const updated = await planningApi.updateMonthlyFocus(id, {
      deadline_date: dlPickerDate || null,
    } as Parameters<typeof planningApi.updateMonthlyFocus>[1]);
    setFocuses((fs) => fs.map((f) => (f.id === id ? updated : f)));
    setDlPickerId(null);
  };

  function DatePicker({ value, onChange, onClear }: { value: string; onChange: (d: string) => void; onClear: () => void }) {
    const monthMin = `${year}-${String(monthNum).padStart(2, "0")}-01`;
    const monthMax = eom;
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {quickOpts.map((o) => (
          <button
            key={o.date}
            type="button"
            onClick={() => onChange(o.date)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
              value === o.date
                ? "bg-blue-500 text-white"
                : "bg-muted text-muted-foreground hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
            }`}
          >
            {o.label}
          </button>
        ))}
        <input
          type="date"
          value={value}
          min={monthMin}
          max={monthMax}
          onChange={(e) => onChange(e.target.value)}
          className="rounded border bg-background px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-ring"
        />
        {value && (
          <button onClick={onClear} className="text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setMonth((m) => subMonths(m, 1))}>Prev</Button>
        <h2 className="font-semibold">{format(month, "MMMM yyyy")}</h2>
        <Button variant="outline" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))}>Next</Button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border">
        <div className="grid grid-cols-7 border-b">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDayOffset }, (_, i) => (
            <div key={`e-${i}`} className="h-10 border-b border-r last:border-r-0" />
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

      {/* Monthly focus areas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Monthly Focus Areas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {focuses.length === 0 && (
            <p className="text-sm text-muted-foreground">No focus areas yet.</p>
          )}

          {focuses.map((f) => {
            const dlInfo  = monthDeadlineText(f.deadline_date);
            const picking = dlPickerId === f.id;
            return (
              <div
                key={f.id}
                className={`group flex flex-col rounded-md border px-3 py-2 transition-colors ${
                  dlInfo?.overdue ? "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{f.title}</p>
                    {f.description && <p className="mt-0.5 text-xs text-muted-foreground">{f.description}</p>}
                  </div>

                  {/* Deadline badge */}
                  {!picking && dlInfo && (
                    <button
                      onClick={() => openDlPicker(f)}
                      className={`flex shrink-0 items-center gap-1 text-xs font-medium ${
                        dlInfo.overdue ? "text-red-500 dark:text-red-400"
                        : dlInfo.urgent ? "text-orange-500 dark:text-orange-400"
                        : "text-blue-500 dark:text-blue-400"
                      } hover:opacity-70`}
                    >
                      <Clock className="h-3 w-3" />
                      {dlInfo.text}
                    </button>
                  )}

                  {/* Ghost clock */}
                  {!f.deadline_date && !picking && (
                    <button
                      onClick={() => openDlPicker(f)}
                      className="shrink-0 text-muted-foreground/0 transition-all group-hover:text-muted-foreground/40 hover:!text-muted-foreground"
                    >
                      <Clock className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Inline date picker */}
                {picking && (
                  <div className="mt-2 space-y-1.5">
                    <DatePicker
                      value={dlPickerDate}
                      onChange={setDlPickerDate}
                      onClear={() => setDlPickerDate("")}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveDeadline(f.id)}
                        className="rounded px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Save
                      </button>
                      <button onClick={() => setDlPickerId(null)} className="text-xs text-muted-foreground hover:text-foreground">
                        Cancel
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
                onKeyDown={(e) => e.key === "Enter" && addFocus()}
                placeholder="Add a focus area..."
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button size="sm" onClick={addFocus}><Plus className="h-4 w-4" /></Button>
            </div>

            {!showDlPicker && !newDeadline ? (
              <button
                type="button"
                onClick={() => setShowDlPicker(true)}
                className="flex items-center gap-1 pl-1 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                <Clock className="h-3 w-3" />
                Due by...
              </button>
            ) : (
              <div className="pl-1">
                <DatePicker
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
