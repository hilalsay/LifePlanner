import { useState, useEffect } from "react";
import {
  format,
  getDaysInMonth,
  startOfMonth,
  getDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { planningApi, trackingApi, type DailyTask, type MoodEntry, type HealthEntry } from "@/lib/api";
import { toDateString } from "@/lib/utils";

const MOOD_EMOJIS = ["", "😞", "😔", "😐", "🙂", "😊", "😄", "😁", "🤩", "🥳", "🌟"];

const PRIORITY_COLORS = {
  high: "destructive",
  medium: "default",
  low: "secondary",
} as const;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

interface Cell {
  dateStr: string;
  day: number;
  isCurrentMonth: boolean;
}

function buildCells(month: Date): Cell[] {
  const year = month.getFullYear();
  const monthNum = month.getMonth() + 1;
  const daysInMonth = getDaysInMonth(month);
  const firstDayOffset = (getDay(startOfMonth(month)) + 6) % 7; // Mon=0

  const cells: Cell[] = [];

  // leading days from previous month
  const prev = subMonths(month, 1);
  const prevDays = getDaysInMonth(prev);
  for (let i = firstDayOffset - 1; i >= 0; i--) {
    const d = prevDays - i;
    cells.push({
      dateStr: `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}-${pad(d)}`,
      day: d,
      isCurrentMonth: false,
    });
  }

  // current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ dateStr: `${year}-${pad(monthNum)}-${pad(d)}`, day: d, isCurrentMonth: true });
  }

  // trailing days from next month
  const remainder = cells.length % 7;
  if (remainder > 0) {
    const next = addMonths(month, 1);
    for (let d = 1; d <= 7 - remainder; d++) {
      cells.push({
        dateStr: `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(d)}`,
        day: d,
        isCurrentMonth: false,
      });
    }
  }

  return cells;
}

export function CalendarOverview() {
  const [month, setMonth] = useState(new Date());
  const [moodMap, setMoodMap] = useState<Record<string, MoodEntry>>({});

  const [selectedDate, setSelectedDate] = useState<string | null>(() => toDateString(new Date()));
  const [selectedTasks, setSelectedTasks] = useState<DailyTask[]>([]);
  const [selectedMood, setSelectedMood] = useState<MoodEntry | null>(null);
  const [selectedHealth, setSelectedHealth] = useState<HealthEntry | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);

  const year = month.getFullYear();
  const monthNum = month.getMonth() + 1;
  const today = toDateString(new Date());

  // fetch mood indicators for the whole visible month
  useEffect(() => {
    const daysInMonth = getDaysInMonth(month);
    const from = `${year}-${pad(monthNum)}-01`;
    const to = `${year}-${pad(monthNum)}-${pad(daysInMonth)}`;
    trackingApi.getMood(from, to).then((entries) => {
      const map: Record<string, MoodEntry> = {};
      entries.forEach((e) => { map[e.entry_date] = e; });
      setMoodMap(map);
    }).catch(console.error);
  }, [year, monthNum]);

  // fetch detail for a day
  const loadDay = async (dateStr: string) => {
    setLoadingDay(true);
    try {
      const [tasks, moods, healths] = await Promise.all([
        planningApi.getDailyTasks(dateStr),
        trackingApi.getMood(dateStr, dateStr),
        trackingApi.getHealth(dateStr, dateStr),
      ]);
      setSelectedTasks(tasks);
      setSelectedMood(moods[0] ?? null);
      setSelectedHealth(healths[0] ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDay(false);
    }
  };

  // load today on first render
  useEffect(() => {
    loadDay(today);
  }, []);

  const selectDay = (dateStr: string) => {
    if (selectedDate === dateStr) return;
    setSelectedDate(dateStr);
    loadDay(dateStr);
  };

  const cells = buildCells(month);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setMonth((m) => subMonths(m, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="font-semibold">{format(month, "MMMM yyyy")}</h2>
        <Button variant="outline" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* calendar grid */}
      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map(({ dateStr, day, isCurrentMonth }) => {
            const moodEntry = moodMap[dateStr];
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;
            return (
              <button
                key={dateStr}
                onClick={() => selectDay(dateStr)}
                className={`flex flex-col items-center gap-0.5 border-b border-r py-1.5 transition-colors hover:bg-accent focus:outline-none last:border-r-0 ${
                  isSelected ? "bg-primary/10 ring-1 ring-inset ring-primary" : ""
                } ${!isCurrentMonth ? "opacity-30" : ""}`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium leading-none ${
                    isToday ? "bg-primary text-primary-foreground" : ""
                  }`}
                >
                  {day}
                </span>
                <span className="h-4 text-sm leading-none">
                  {moodEntry ? MOOD_EMOJIS[moodEntry.mood_score] : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* day detail */}
      {selectedDate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {format(new Date(selectedDate + "T00:00:00"), "EEEE, MMMM d")}
              {selectedDate === today && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">Today</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDay ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <div className="space-y-5">

                {/* tasks */}
                <section>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tasks
                    {selectedTasks.length > 0 && (
                      <span className="ml-2 font-normal normal-case">
                        {selectedTasks.filter((t) => t.is_completed).length}/{selectedTasks.length} done
                      </span>
                    )}
                  </p>
                  {selectedTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tasks recorded.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedTasks.map((t) => (
                        <div key={t.id} className="flex items-center gap-2">
                          {t.is_completed
                            ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                            : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                          <span className={`flex-1 text-sm ${t.is_completed ? "line-through text-muted-foreground" : ""}`}>
                            {t.title}
                          </span>
                          <Badge
                            variant={PRIORITY_COLORS[t.priority as keyof typeof PRIORITY_COLORS] ?? "outline"}
                            className="shrink-0 text-xs"
                          >
                            {t.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* mood */}
                <section>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mood</p>
                  {!selectedMood ? (
                    <p className="text-sm text-muted-foreground">No mood recorded.</p>
                  ) : (
                    <div className="flex items-start gap-3">
                      <span className="text-3xl leading-none">{MOOD_EMOJIS[selectedMood.mood_score]}</span>
                      <div>
                        <p className="text-sm">
                          Mood <span className="font-semibold">{selectedMood.mood_score}/10</span>
                          <span className="mx-1.5 text-muted-foreground">·</span>
                          Energy <span className="font-semibold">{selectedMood.energy_score}/10</span>
                        </p>
                        {selectedMood.notes && (
                          <p className="mt-1 text-sm text-muted-foreground">{selectedMood.notes}</p>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                {/* health */}
                <section>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Health</p>
                  {!selectedHealth ? (
                    <p className="text-sm text-muted-foreground">No health data recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        {selectedHealth.sleep_hours != null && (
                          <div className="rounded-md border px-3 py-2 text-center">
                            <p className="text-lg font-semibold">{selectedHealth.sleep_hours}h</p>
                            <p className="text-xs text-muted-foreground">Sleep</p>
                          </div>
                        )}
                        {selectedHealth.water_glasses != null && (
                          <div className="rounded-md border px-3 py-2 text-center">
                            <p className="text-lg font-semibold">{selectedHealth.water_glasses}</p>
                            <p className="text-xs text-muted-foreground">Water</p>
                          </div>
                        )}
                        {selectedHealth.exercise_minutes != null && (
                          <div className="rounded-md border px-3 py-2 text-center">
                            <p className="text-lg font-semibold">{selectedHealth.exercise_minutes}m</p>
                            <p className="text-xs text-muted-foreground">Exercise</p>
                          </div>
                        )}
                        {selectedHealth.weight_kg != null && (
                          <div className="rounded-md border px-3 py-2 text-center">
                            <p className="text-lg font-semibold">{selectedHealth.weight_kg}kg</p>
                            <p className="text-xs text-muted-foreground">Weight</p>
                          </div>
                        )}
                        {selectedHealth.steps != null && (
                          <div className="rounded-md border px-3 py-2 text-center">
                            <p className="text-lg font-semibold">{selectedHealth.steps.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Steps</p>
                          </div>
                        )}
                      </div>
                      {selectedHealth.notes && (
                        <p className="text-sm text-muted-foreground">{selectedHealth.notes}</p>
                      )}
                    </div>
                  )}
                </section>

              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
