import { useState, useEffect } from "react";
import { BookOpen, Heart, Activity, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trackingApi, type MoodEntry, type HealthEntry, type BookEntry } from "@/lib/api";
import { toDateString } from "@/lib/utils";
import { format, subDays } from "date-fns";

const MOOD_EMOJIS = ["", "😞", "😔", "😐", "🙂", "😊", "😄", "😁", "🤩", "🥳", "🌟"];

export function TrackingPage() {
  const [tab, setTab] = useState<"mood" | "health" | "books">("mood");
  const [mood, setMood] = useState<MoodEntry | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [health, setHealth] = useState<HealthEntry | null>(null);
  const [books, setBooks] = useState<BookEntry[]>([]);

  const [moodScore, setMoodScore] = useState(7);
  const [energyScore, setEnergyScore] = useState(7);
  const [moodNotes, setMoodNotes] = useState("");

  const [sleepHours, setSleepHours] = useState("");
  const [waterGlasses, setWaterGlasses] = useState("");
  const [exerciseMinutes, setExerciseMinutes] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [steps, setSteps] = useState("");
  const [healthNotes, setHealthNotes] = useState("");

  const [newBookTitle, setNewBookTitle] = useState("");

  const today = toDateString(new Date());

  useEffect(() => {
    const thirtyDaysAgo = toDateString(subDays(new Date(), 30));
    trackingApi.getMood(thirtyDaysAgo, today).then((ms) => {
      const todayEntry = ms.find((m) => m.entry_date === today) ?? null;
      if (todayEntry) {
        setMood(todayEntry);
        setMoodScore(todayEntry.mood_score);
        setEnergyScore(todayEntry.energy_score);
        setMoodNotes(todayEntry.notes ?? "");
      }
      setMoodHistory(ms.filter((m) => m.entry_date !== today).sort(
        (a, b) => b.entry_date.localeCompare(a.entry_date)
      ));
    }).catch(console.error);
    trackingApi.getHealth(today, today).then((hs) => {
      const h = hs[0] ?? null;
      setHealth(h);
      if (h) {
        setSleepHours(h.sleep_hours != null ? String(h.sleep_hours) : "");
        setWaterGlasses(h.water_glasses != null ? String(h.water_glasses) : "");
        setExerciseMinutes(h.exercise_minutes != null ? String(h.exercise_minutes) : "");
        setWeightKg(h.weight_kg != null ? String(h.weight_kg) : "");
        setSteps(h.steps != null ? String(h.steps) : "");
        setHealthNotes(h.notes ?? "");
      }
    }).catch(console.error);
    trackingApi.getBooks().then(setBooks).catch(console.error);
  }, []);

  const saveMood = async () => {
    const entry = await trackingApi.createMood({
      entry_date: today,
      mood_score: moodScore,
      energy_score: energyScore,
      notes: moodNotes || undefined,
    });
    setMood(entry);
    // keep history list up to date (doesn't include today)
    setMoodHistory((prev) => prev.filter((m) => m.entry_date !== today));
  };

  const saveHealth = async () => {
    const data: Partial<HealthEntry> = {
      entry_date: today,
      sleep_hours: sleepHours ? Number(sleepHours) : undefined,
      water_glasses: waterGlasses ? Number(waterGlasses) : undefined,
      exercise_minutes: exerciseMinutes ? Number(exerciseMinutes) : undefined,
      weight_kg: weightKg ? Number(weightKg) : undefined,
      steps: steps ? Number(steps) : undefined,
      notes: healthNotes || undefined,
    };
    const entry = await trackingApi.upsertHealth(data);
    setHealth(entry);
  };

  const addBook = async () => {
    if (!newBookTitle.trim()) return;
    const b = await trackingApi.createBook({ title: newBookTitle.trim() });
    setBooks((bs) => [b, ...bs]);
    setNewBookTitle("");
  };

  const updateBookStatus = async (book: BookEntry, status: string) => {
    const updated = await trackingApi.updateBook(book.id, { status });
    setBooks((bs) => bs.map((b) => (b.id === book.id ? updated : b)));
  };

  const deleteBook = async (id: string) => {
    await trackingApi.deleteBook(id);
    setBooks((bs) => bs.filter((b) => b.id !== id));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex gap-2 rounded-lg border p-1">
        {(["mood", "health", "books"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "mood" && <Heart className="h-4 w-4" />}
            {t === "health" && <Activity className="h-4 w-4" />}
            {t === "books" && <BookOpen className="h-4 w-4" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "mood" && (
        <>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today's Mood</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Mood</span>
                <span className="text-2xl">{MOOD_EMOJIS[moodScore]}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={moodScore}
                onChange={(e) => setMoodScore(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span><span>10</span>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Energy</span>
                <span className="font-semibold text-primary">{energyScore}/10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={energyScore}
                onChange={(e) => setEnergyScore(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <textarea
              value={moodNotes}
              onChange={(e) => setMoodNotes(e.target.value)}
              placeholder="How are you feeling today? (optional)"
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={saveMood} className="w-full">
              {mood ? "Update" : "Save"} Today's Mood
            </Button>
          </CardContent>
        </Card>

        {moodHistory.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Past Moods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {moodHistory.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 rounded-md border px-3 py-2">
                  <span className="text-xl leading-none mt-0.5">{MOOD_EMOJIS[entry.mood_score]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {format(new Date(entry.entry_date + "T00:00:00"), "EEE, MMM d")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        mood {entry.mood_score}/10 · energy {entry.energy_score}/10
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        </>
      )}

      {tab === "health" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today's Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Sleep (hours)</label>
                <input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  placeholder="e.g. 7.5"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Water (glasses)</label>
                <input
                  type="number"
                  min={0}
                  value={waterGlasses}
                  onChange={(e) => setWaterGlasses(e.target.value)}
                  placeholder="e.g. 8"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Exercise (minutes)</label>
                <input
                  type="number"
                  min={0}
                  value={exerciseMinutes}
                  onChange={(e) => setExerciseMinutes(e.target.value)}
                  placeholder="e.g. 30"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Weight (kg)</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="e.g. 65.0"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Steps</label>
                <input
                  type="number"
                  min={0}
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  placeholder="e.g. 8000"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <textarea
              value={healthNotes}
              onChange={(e) => setHealthNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={saveHealth} className="w-full">
              {health ? "Update" : "Save"} Today's Health
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "books" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reading List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {books.map((book) => (
              <div key={book.id} className="group flex items-center gap-3 rounded-md border px-3 py-2">
                <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{book.title}</p>
                  {book.author && <p className="text-xs text-muted-foreground">{book.author}</p>}
                </div>
                <select
                  value={book.status}
                  onChange={(e) => updateBookStatus(book, e.target.value)}
                  className="rounded border bg-background px-2 py-1 text-xs outline-none"
                >
                  <option value="to_read">To Read</option>
                  <option value="reading">Reading</option>
                  <option value="completed">Completed</option>
                  <option value="abandoned">Abandoned</option>
                </select>
                <button
                  onClick={() => deleteBook(book.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                value={newBookTitle}
                onChange={(e) => setNewBookTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addBook()}
                placeholder="Add a book..."
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button size="sm" onClick={addBook}>Add</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
