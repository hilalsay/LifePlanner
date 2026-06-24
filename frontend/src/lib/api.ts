import type { DragItem } from "./dragItem";

const BASE = "/api/v1";

let isRefreshing = false;
let sessionExpiredNotified = false;

// Signal an unrecoverable auth failure (access token expired AND refresh failed).
// AuthContext listens for this and performs a clean logout.
export const SESSION_EXPIRED_EVENT = "auth:session-expired";
function notifySessionExpired() {
  if (sessionExpiredNotified) return;
  sessionExpiredNotified = true;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    credentials: "include",
    ...options,
  });
  if (res.status === 401 && !isRefreshing && !path.startsWith("/auth/")) {
    isRefreshing = true;
    try {
      const refreshRes = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshRes.ok) {
        const retryRes = await fetch(`${BASE}${path}`, {
          headers: { "Content-Type": "application/json", ...options?.headers },
          credentials: "include",
          ...options,
        });
        if (!retryRes.ok) throw new Error(await retryRes.text() || `HTTP ${retryRes.status}`);
        if (retryRes.status === 204) return undefined as T;
        return retryRes.json() as Promise<T>;
      }
    } finally {
      isRefreshing = false;
    }
    notifySessionExpired();
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Planning ──────────────────────────────────────────────────────────────────

export const planningApi = {
  getLifeAreas: () => request<LifeArea[]>("/planning/life-areas"),
  createLifeArea: (data: Partial<LifeArea>) =>
    request<LifeArea>("/planning/life-areas", { method: "POST", body: JSON.stringify(data) }),
  updateLifeArea: (id: string, data: Partial<LifeArea>) =>
    request<LifeArea>(`/planning/life-areas/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteLifeArea: (id: string) =>
    request<void>(`/planning/life-areas/${id}`, { method: "DELETE" }),

  getYearlyGoals: (year?: number) =>
    request<YearlyGoal[]>(`/planning/yearly-goals${year ? `?year=${year}` : ""}`),
  createYearlyGoal: (data: Partial<YearlyGoal>) =>
    request<YearlyGoal>("/planning/yearly-goals", { method: "POST", body: JSON.stringify(data) }),
  updateYearlyGoal: (id: string, data: Partial<YearlyGoal>) =>
    request<YearlyGoal>(`/planning/yearly-goals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteYearlyGoal: (id: string) =>
    request<void>(`/planning/yearly-goals/${id}`, { method: "DELETE" }),

  getMonthlyFocuses: (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year) params.set("year", String(year));
    if (month) params.set("month", String(month));
    return request<MonthlyFocus[]>(`/planning/monthly-focuses?${params}`);
  },
  createMonthlyFocus: (data: Partial<MonthlyFocus>) =>
    request<MonthlyFocus>("/planning/monthly-focuses", { method: "POST", body: JSON.stringify(data) }),
  updateMonthlyFocus: (id: string, data: Partial<MonthlyFocus>) =>
    request<MonthlyFocus>(`/planning/monthly-focuses/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteMonthlyFocus: (id: string) =>
    request<void>(`/planning/monthly-focuses/${id}`, { method: "DELETE" }),

  getWeeklyPriorities: (year?: number, week?: number) => {
    const params = new URLSearchParams();
    if (year) params.set("year", String(year));
    if (week) params.set("week_number", String(week));
    return request<WeeklyPriority[]>(`/planning/weekly-priorities?${params}`);
  },
  createWeeklyPriority: (data: Partial<WeeklyPriority>) =>
    request<WeeklyPriority>("/planning/weekly-priorities", { method: "POST", body: JSON.stringify(data) }),
  updateWeeklyPriority: (id: string, data: Partial<WeeklyPriority>) =>
    request<WeeklyPriority>(`/planning/weekly-priorities/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteWeeklyPriority: (id: string) =>
    request<void>(`/planning/weekly-priorities/${id}`, { method: "DELETE" }),

  getDailyTasks: (date?: string) =>
    request<DailyTask[]>(`/planning/daily-tasks${date ? `?task_date=${date}` : ""}`),
  getOverdueTasks: () =>
    request<DailyTask[]>("/planning/daily-tasks?overdue=true"),
  createDailyTask: (data: Partial<DailyTask>) =>
    request<DailyTask>("/planning/daily-tasks", { method: "POST", body: JSON.stringify(data) }),
  updateDailyTask: (id: string, data: Partial<DailyTask>) =>
    request<DailyTask>(`/planning/daily-tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteDailyTask: (id: string) =>
    request<void>(`/planning/daily-tasks/${id}`, { method: "DELETE" }),

  getNotes: (type?: string, date?: string) => {
    const params = new URLSearchParams();
    if (type) params.set("note_type", type);
    if (date) params.set("note_date", date);
    return request<PlanningNote[]>(`/planning/notes?${params}`);
  },
  createNote: (data: Partial<PlanningNote>) =>
    request<PlanningNote>("/planning/notes", { method: "POST", body: JSON.stringify(data) }),
  deleteNote: (id: string) =>
    request<void>(`/planning/notes/${id}`, { method: "DELETE" }),
};

// ── Habits ────────────────────────────────────────────────────────────────────

export const habitsApi = {
  getHabits: (activeOnly = true) =>
    request<Habit[]>(`/habits?active_only=${activeOnly}`),
  createHabit: (data: Partial<Habit>) =>
    request<Habit>("/habits", { method: "POST", body: JSON.stringify(data) }),
  updateHabit: (id: string, data: Partial<Habit>) =>
    request<Habit>(`/habits/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteHabit: (id: string) =>
    request<void>(`/habits/${id}`, { method: "DELETE" }),

  getEntries: (habitId?: string, fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams();
    if (habitId) params.set("habit_id", habitId);
    if (fromDate) params.set("from_date", fromDate);
    if (toDate) params.set("to_date", toDate);
    return request<HabitEntry[]>(`/habits/entries?${params}`);
  },
  upsertEntry: (data: Partial<HabitEntry>) =>
    request<HabitEntry>("/habits/entries", { method: "POST", body: JSON.stringify(data) }),

  getStreak: (habitId: string) =>
    request<{ current_streak: number; longest_streak: number }>(`/habits/${habitId}/streak`),
};

// ── Tracking ──────────────────────────────────────────────────────────────────

export const trackingApi = {
  getMood: (fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams();
    if (fromDate) params.set("from_date", fromDate);
    if (toDate) params.set("to_date", toDate);
    return request<MoodEntry[]>(`/tracking/mood?${params}`);
  },
  createMood: (data: Partial<MoodEntry>) =>
    request<MoodEntry>("/tracking/mood", { method: "POST", body: JSON.stringify(data) }),
  updateMood: (id: string, data: Partial<MoodEntry>) =>
    request<MoodEntry>(`/tracking/mood/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  getHealth: (fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams();
    if (fromDate) params.set("from_date", fromDate);
    if (toDate) params.set("to_date", toDate);
    return request<HealthEntry[]>(`/tracking/health?${params}`);
  },
  upsertHealth: (data: Partial<HealthEntry>) =>
    request<HealthEntry>("/tracking/health", { method: "POST", body: JSON.stringify(data) }),
  updateHealth: (id: string, data: Partial<HealthEntry>) =>
    request<HealthEntry>(`/tracking/health/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  getBooks: (status?: string) =>
    request<BookEntry[]>(`/tracking/books${status ? `?status=${status}` : ""}`),
  createBook: (data: Partial<BookEntry>) =>
    request<BookEntry>("/tracking/books", { method: "POST", body: JSON.stringify(data) }),
  updateBook: (id: string, data: Partial<BookEntry>) =>
    request<BookEntry>(`/tracking/books/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteBook: (id: string) =>
    request<void>(`/tracking/books/${id}`, { method: "DELETE" }),
};

// ── AI ────────────────────────────────────────────────────────────────────────

export const aiApi = {
  getMotivational: (useAI = true) =>
    request<{ message: string; source: string }>(`/ai/motivational?ai=${useAI}`),
  parseTask: (text: string) =>
    request<Partial<DailyTask>>("/ai/parse-task", { method: "POST", body: JSON.stringify({ text }) }),
  generateWeeklyReview: () =>
    request<WeeklyAIReview>("/ai/weekly-review", { method: "POST", body: JSON.stringify({}) }),
  getWeeklyReviews: () =>
    request<WeeklyAIReview[]>("/ai/weekly-reviews"),
  chat: (content: string, conversationId?: string, attachments?: DragItem[], language?: string) =>
    request<ChatResponse>("/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        content,
        conversation_id: conversationId ?? null,
        attachments: attachments ?? [],
        language: language ?? "en",
      }),
    }),
  listConversations: () => request<Conversation[]>("/ai/conversations"),
  getConversation: (id: string) => request<ConversationDetail>(`/ai/conversations/${id}`),
  deleteConversation: (id: string) =>
    request<void>(`/ai/conversations/${id}`, { method: "DELETE" }),
};

export interface ChatSuggestion {
  kind: "monthly" | "weekly" | "habit" | "task";
  title: string;
  description?: string | null;
  date?: string | null; // YYYY-MM-DD, tasks only
}

export interface ChatResponse {
  conversation_id: string;
  title: string;
  message: string;
  suggestions: ChatSuggestion[];
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface StoredChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: ChatSuggestion[] | null;
  attachments?: DragItem[] | null;
  created_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: StoredChatMessage[];
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LifeArea {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface YearlyGoal {
  id: string;
  life_area_id?: string;
  year: number;
  title: string;
  description?: string;
  status: string;
  progress: number;
  deadline_date?: string;
  created_at: string;
}

export interface MonthlyFocus {
  id: string;
  yearly_goal_id?: string;
  year: number;
  month: number;
  title: string;
  description?: string;
  reflection?: string;
  deadline_date?: string;
  created_at: string;
}

export interface WeeklyPriority {
  id: string;
  monthly_focus_id?: string;
  year: number;
  week_number: number;
  title: string;
  description?: string;
  is_completed: boolean;
  reflection?: string;
  deadline_date?: string;
  created_at: string;
}

export interface DailyTask {
  id: string;
  weekly_priority_id?: string;
  task_date: string;
  title: string;
  description?: string;
  is_completed: boolean;
  priority: "low" | "medium" | "high";
  estimated_minutes?: number;
  actual_minutes?: number;
  tags?: string;
  deadline_date?: string;   // "YYYY-MM-DD"
  deadline_time?: string;   // "HH:MM:SS" from Postgres
  created_at: string;
}

export interface PlanningNote {
  id: string;
  note_date?: string;
  week_number?: number;
  month?: number;
  year?: number;
  content: string;
  note_type: string;
  created_at: string;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: string;
  target_count: number;
  color: string;
  icon: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

export interface HabitEntry {
  id: string;
  habit_id: string;
  entry_date: string;
  completed: boolean;
  count: number;
  notes?: string;
  created_at: string;
}

export interface MoodEntry {
  id: string;
  entry_date: string;
  mood_score: number;
  energy_score: number;
  notes?: string;
  tags?: string;
  created_at: string;
}

export interface HealthEntry {
  id: string;
  entry_date: string;
  sleep_hours?: number;
  water_glasses?: number;
  exercise_minutes?: number;
  weight_kg?: number;
  steps?: number;
  notes?: string;
  created_at: string;
}

export interface BookEntry {
  id: string;
  title: string;
  author?: string;
  status: string;
  genre?: string;
  total_pages?: number;
  current_page?: number;
  start_date?: string;
  end_date?: string;
  rating?: number;
  notes?: string;
  cover_url?: string;
  review?: string;
  created_at: string;
}

export interface GoogleBookResult {
  title: string;
  author?: string;
  cover_url?: string;
}

export async function searchGoogleBooks(query: string): Promise<GoogleBookResult[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.items ?? [])
      .map((item: Record<string, unknown>) => {
        const info = (item.volumeInfo ?? {}) as Record<string, unknown>;
        const links = (info.imageLinks ?? {}) as Record<string, string>;
        const thumbnail = links.thumbnail ?? links.smallThumbnail;
        const authors = info.authors as string[] | undefined;
        return {
          title: (info.title as string) ?? "",
          author: authors?.[0],
          cover_url: normalizeCoverUrl(thumbnail),
        };
      })
      .filter((r: GoogleBookResult) => r.title);
  } catch {
    return [];
  }
}

// Force https and request a higher-resolution cover (zoom=2 instead of zoom=1).
function normalizeCoverUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace("http://", "https://").replace("zoom=1", "zoom=2");
}

// Fetch the single best-matching cover for a title (used while editing a book).
export async function fetchBookCover(title: string): Promise<string | undefined> {
  const [best] = await searchGoogleBooks(title);
  return best?.cover_url;
}

export interface WeeklyAIReview {
  id: string;
  year: number;
  week_number: number;
  content: string;
  model_used: string;
  created_at: string;
}
