import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  X,
  Send,
  Plus,
  Check,
  Loader2,
  CalendarRange,
  Calendar,
  Flame,
  CheckSquare,
  MessageSquare,
  ListChecks,
  SquarePen,
  History,
  Trash2,
} from "lucide-react";
import { cn, getISOWeek, toDateString } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { aiApi, planningApi, habitsApi, type Conversation } from "@/lib/api";
import {
  uid,
  type ChatMessage,
  type Suggestion,
  type SuggestionKind,
} from "./types";

interface AssistantPanelProps {
  open: boolean;
  onClose: () => void;
}

const KIND_META: Record<
  SuggestionKind,
  { label: string; icon: typeof Calendar; className: string }
> = {
  monthly: { label: "Monthly focus", icon: Calendar, className: "text-violet-500" },
  weekly: { label: "Weekly priority", icon: CalendarRange, className: "text-sky-500" },
  habit: { label: "Habit", icon: Flame, className: "text-orange-500" },
  task: { label: "Task", icon: CheckSquare, className: "text-emerald-500" },
};

const GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  content:
    "Hi! Tell me what you'd like to work on — a goal, a habit, anything — and I'll suggest how to add it to your plan. Try \"I want to read more\" or \"help me get fit\".",
};

type Tab = "chat" | "plan";

const COOLDOWN_SECONDS = 3;

export function AssistantPanel({ open, onClose }: AssistantPanelProps) {
  const [tab, setTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [plan, setPlan] = useState<Suggestion[]>([]);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0); // seconds left before next send

  // Conversation history
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convosLoaded, setConvosLoaded] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  // Tick down the post-send cooldown that throttles requests against the rate limit.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Load the user's real current plan the first time the panel opens.
  useEffect(() => {
    if (!open || planLoaded) return;
    (async () => {
      try {
        const now = new Date();
        const [focuses, priorities, habits, tasks] = await Promise.all([
          planningApi.getMonthlyFocuses(now.getFullYear(), now.getMonth() + 1),
          planningApi.getWeeklyPriorities(now.getFullYear(), getISOWeek(now)),
          habitsApi.getHabits(true),
          planningApi.getDailyTasks(toDateString(now)),
        ]);
        setPlan([
          ...focuses.map((f) => ({ id: uid("plan"), kind: "monthly" as const, title: f.title, description: f.description })),
          ...priorities.map((p) => ({ id: uid("plan"), kind: "weekly" as const, title: p.title, description: p.description })),
          ...habits.map((h) => ({ id: uid("plan"), kind: "habit" as const, title: h.name, description: h.description })),
          ...tasks.map((t) => ({ id: uid("plan"), kind: "task" as const, title: t.title, description: t.description })),
        ]);
      } catch {
        /* leave plan empty on failure */
      } finally {
        setPlanLoaded(true);
      }
    })();
  }, [open, planLoaded]);

  // Load the conversation list the first time the panel opens.
  useEffect(() => {
    if (!open || convosLoaded) return;
    (async () => {
      try {
        setConversations(await aiApi.listConversations());
      } catch {
        /* ignore */
      } finally {
        setConvosLoaded(true);
      }
    })();
  }, [open, convosLoaded]);

  const refreshConversations = async () => {
    try {
      setConversations(await aiApi.listConversations());
    } catch {
      /* ignore */
    }
  };

  const startNewChat = () => {
    setMessages([GREETING]);
    setCurrentId(null);
    setAddedIds(new Set());
    setShowHistory(false);
    setTab("chat");
  };

  const loadConversation = async (id: string) => {
    try {
      const detail = await aiApi.getConversation(id);
      const mapped: ChatMessage[] = detail.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        suggestions: m.suggestions?.map((s) => ({
          id: uid("sug"),
          kind: s.kind as SuggestionKind,
          title: s.title,
          description: s.description ?? undefined,
        })),
      }));
      setMessages(mapped.length ? mapped : [GREETING]);
      setCurrentId(id);
      setAddedIds(new Set());
      setShowHistory(false);
      setTab("chat");
    } catch {
      /* ignore */
    }
  };

  const removeConversation = async (id: string) => {
    try {
      await aiApi.deleteConversation(id);
      setConversations((cs) => cs.filter((c) => c.id !== id));
      if (id === currentId) startNewChat();
    } catch {
      /* ignore */
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || thinking || cooldown > 0) return;

    const userMsg: ChatMessage = { id: uid("msg"), role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);

    try {
      const reply = await aiApi.chat(text, currentId ?? undefined);
      setCurrentId(reply.conversation_id);
      const suggestions: Suggestion[] = (reply.suggestions || []).map((s) => ({
        id: uid("sug"),
        kind: s.kind as SuggestionKind,
        title: s.title,
        description: s.description ?? undefined,
      }));
      setMessages((m) => [
        ...m,
        { id: uid("msg"), role: "assistant", content: reply.message, suggestions },
      ]);
      refreshConversations(); // pick up the new/updated title and ordering
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: uid("msg"),
          role: "assistant",
          content:
            "Sorry — I couldn't reach the assistant. Check that the backend is running and GEMINI_API_KEY is set in backend/.env.",
        },
      ]);
    } finally {
      setThinking(false);
      setCooldown(COOLDOWN_SECONDS);
    }
  };

  // Persist an accepted suggestion as the matching planner entity.
  const persist = async (s: Suggestion) => {
    const now = new Date();
    switch (s.kind) {
      case "monthly":
        await planningApi.createMonthlyFocus({
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          title: s.title,
          description: s.description,
        });
        break;
      case "weekly":
        await planningApi.createWeeklyPriority({
          year: now.getFullYear(),
          week_number: getISOWeek(now),
          title: s.title,
          description: s.description,
        });
        break;
      case "habit":
        await habitsApi.createHabit({
          name: s.title,
          description: s.description,
          frequency: "daily",
          target_count: 1,
        });
        break;
      case "task":
        await planningApi.createDailyTask({
          task_date: toDateString(now),
          title: s.title,
          description: s.description,
          priority: "medium",
        });
        break;
    }
  };

  const addSuggestion = async (s: Suggestion) => {
    if (addedIds.has(s.id) || savingId) return;
    setSavingId(s.id);
    try {
      await persist(s);
      setAddedIds((prev) => new Set(prev).add(s.id));
      setPlan((p) => [{ ...s, id: uid("plan") }, ...p]);
    } catch {
      /* keep the Add button active so the user can retry */
    } finally {
      setSavingId(null);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/40 sm:hidden"
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l bg-card shadow-xl",
          "sm:static sm:z-auto sm:w-[380px] sm:max-w-none sm:shadow-none"
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold tracking-tight">Assistant</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" onClick={startNewChat} title="New chat">
              <SquarePen className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory((v) => !v)}
              title="Chat history"
              className={cn(showHistory && "bg-primary/10 text-primary")}
            >
              <History className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} title="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showHistory ? (
          <HistoryView
            conversations={conversations}
            currentId={currentId}
            onSelect={loadConversation}
            onDelete={removeConversation}
            onNewChat={startNewChat}
          />
        ) : (
          <>
        {/* Tabs */}
        <div className="flex border-b p-1 gap-1">
          <TabButton active={tab === "chat"} onClick={() => setTab("chat")} icon={MessageSquare} label="Chat" />
          <TabButton
            active={tab === "plan"}
            onClick={() => setTab("plan")}
            icon={ListChecks}
            label={`My Plan${plan.length ? ` (${plan.length})` : ""}`}
          />
        </div>

        {tab === "chat" ? (
          <>
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  addedIds={addedIds}
                  savingId={savingId}
                  onAdd={addSuggestion}
                />
              ))}
              {thinking && <TypingIndicator />}
            </div>

            {/* Composer */}
            <div className="border-t p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder="Tell me about a goal…"
                  className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button
                  size="icon"
                  onClick={send}
                  disabled={!input.trim() || thinking || cooldown > 0}
                  title={cooldown > 0 ? `Wait ${cooldown}s` : "Send"}
                >
                  {cooldown > 0 ? <span className="text-xs font-semibold">{cooldown}</span> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                {cooldown > 0
                  ? `You can send again in ${cooldown}s…`
                  : "Powered by Gemini · suggestions save to your plan."}
              </p>
            </div>
          </>
        ) : (
          <PlanTab plan={plan} />
        )}
          </>
        )}
      </aside>
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Calendar;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function MessageBubble({
  message,
  addedIds,
  savingId,
  onAdd,
}: {
  message: ChatMessage;
  addedIds: Set<string>;
  savingId: string | null;
  onAdd: (s: Suggestion) => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground"
        )}
      >
        {message.content}
      </div>

      {message.suggestions && message.suggestions.length > 0 && (
        <div className="w-full space-y-2">
          {message.suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              added={addedIds.has(s.id)}
              saving={savingId === s.id}
              onAdd={() => onAdd(s)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  added,
  saving,
  onAdd,
}: {
  suggestion: Suggestion;
  added: boolean;
  saving: boolean;
  onAdd: () => void;
}) {
  const meta = KIND_META[suggestion.kind];
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-background p-3">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.className)} />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {meta.label}
        </div>
        <div className="truncate text-sm font-medium">{suggestion.title}</div>
        {suggestion.description && (
          <div className="mt-0.5 text-xs text-muted-foreground">{suggestion.description}</div>
        )}
      </div>
      <Button
        size="sm"
        variant={added ? "secondary" : "default"}
        onClick={onAdd}
        disabled={added || saving}
        className="shrink-0"
      >
        {added ? (
          <>
            <Check className="h-3.5 w-3.5" /> Added
          </>
        ) : saving ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding
          </>
        ) : (
          <>
            <Plus className="h-3.5 w-3.5" /> Add
          </>
        )}
      </Button>
    </div>
  );
}

function PlanTab({ plan }: { plan: Suggestion[] }) {
  const order: SuggestionKind[] = ["monthly", "weekly", "habit", "task"];
  const groups = order
    .map((kind) => ({ kind, items: plan.filter((p) => p.kind === kind) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex-1 space-y-5 overflow-y-auto p-4">
      {plan.length === 0 ? (
        <p className="pt-8 text-center text-sm text-muted-foreground">
          Nothing added yet. Switch to Chat and add a suggestion.
        </p>
      ) : (
        groups.map((g) => {
          const meta = KIND_META[g.kind];
          const Icon = meta.icon;
          return (
            <div key={g.kind}>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Icon className={cn("h-3.5 w-3.5", meta.className)} />
                {meta.label}
              </div>
              <ul className="space-y-2">
                {g.items.map((item) => (
                  <li key={item.id} className="rounded-lg border bg-background p-3">
                    <div className="text-sm font-medium">{item.title}</div>
                    {item.description && (
                      <div className="mt-0.5 text-xs text-muted-foreground">{item.description}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-3 w-fit">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
    </div>
  );
}

function HistoryView({
  conversations,
  currentId,
  onSelect,
  onDelete,
  onNewChat,
}: {
  conversations: Conversation[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="p-3">
        <Button variant="outline" className="w-full justify-start gap-2" onClick={onNewChat}>
          <SquarePen className="h-4 w-4" /> New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {conversations.length === 0 ? (
          <p className="px-2 pt-6 text-center text-sm text-muted-foreground">
            No conversations yet.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => (
              <li key={c.id}>
                <div
                  className={cn(
                    "group flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                    c.id === currentId
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent hover:text-foreground"
                  )}
                >
                  <button onClick={() => onSelect(c.id)} className="flex min-w-0 flex-1 flex-col text-left">
                    <span className="truncate font-medium">{c.title}</span>
                    <span className="text-[11px] text-muted-foreground">{relativeTime(c.updated_at)}</span>
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    title="Delete conversation"
                    className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}
