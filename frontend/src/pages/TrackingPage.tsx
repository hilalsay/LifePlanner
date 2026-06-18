import { useState, useEffect } from "react";
import { BookOpen, Heart, Activity, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trackingApi, type MoodEntry, type HealthEntry, type BookEntry } from "@/lib/api";
import { toDateString } from "@/lib/utils";
import { format, subDays } from "date-fns";
import { useI18n } from "@/contexts/LanguageContext";
import { dateLocale } from "@/lib/dateLocale";

const MOOD_EMOJIS = ["", "😞", "😔", "😐", "🙂", "😊", "😄", "😁", "🤩", "🥳", "🌟"];

export function TrackingPage() {
  const { t, lang } = useI18n();
  const locale = dateLocale(lang);
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
        {(["mood", "health", "books"] as const).map((tk) => (
          <button
            key={tk}
            onClick={() => setTab(tk)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${
              tab === tk ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tk === "mood" && <Heart className="h-4 w-4" />}
            {tk === "health" && <Activity className="h-4 w-4" />}
            {tk === "books" && <BookOpen className="h-4 w-4" />}
            {tk === "mood" ? t("tracking.tabMood") : tk === "health" ? t("tracking.tabHealth") : t("tracking.tabBooks")}
          </button>
        ))}
      </div>

      {tab === "mood" && (
        <>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("tracking.todaysMood")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">{t("tracking.mood")}</span>
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
                <span className="text-sm font-medium">{t("tracking.energy")}</span>
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
              placeholder={t("tracking.moodNotesPlaceholder")}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={saveMood} className="w-full">
              {mood ? t("tracking.updateMood") : t("tracking.saveMood")}
            </Button>
          </CardContent>
        </Card>

        {moodHistory.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("tracking.pastMoods")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {moodHistory.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 rounded-md border px-3 py-2">
                  <span className="text-xl leading-none mt-0.5">{MOOD_EMOJIS[entry.mood_score]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {format(new Date(entry.entry_date + "T00:00:00"), "EEE, MMM d", { locale })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t("tracking.moodEnergyLine", { m: entry.mood_score, e: entry.energy_score })}
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
            <CardTitle className="text-base">{t("tracking.todaysHealth")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("tracking.sleep")}</label>
                <input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  placeholder={t("tracking.egSleep")}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("tracking.water")}</label>
                <input
                  type="number"
                  min={0}
                  value={waterGlasses}
                  onChange={(e) => setWaterGlasses(e.target.value)}
                  placeholder={t("tracking.egWater")}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("tracking.exercise")}</label>
                <input
                  type="number"
                  min={0}
                  value={exerciseMinutes}
                  onChange={(e) => setExerciseMinutes(e.target.value)}
                  placeholder={t("tracking.egExercise")}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("tracking.weight")}</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder={t("tracking.egWeight")}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("tracking.steps")}</label>
                <input
                  type="number"
                  min={0}
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  placeholder={t("tracking.egSteps")}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <textarea
              value={healthNotes}
              onChange={(e) => setHealthNotes(e.target.value)}
              placeholder={t("tracking.notesOptional")}
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={saveHealth} className="w-full">
              {health ? t("tracking.updateHealth") : t("tracking.saveHealth")}
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "books" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("tracking.readingList")}</CardTitle>
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
                  <option value="to_read">{t("tracking.bookToRead")}</option>
                  <option value="reading">{t("tracking.bookReading")}</option>
                  <option value="completed">{t("tracking.bookCompleted")}</option>
                  <option value="abandoned">{t("tracking.bookAbandoned")}</option>
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
                placeholder={t("tracking.addBookPlaceholder")}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button size="sm" onClick={addBook}>{t("common.add")}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
