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
  Target,
  Paperclip,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn, getISOWeek, toDateString } from "@/lib/utils";
import { dateLocale } from "@/lib/dateLocale";
import { Button } from "@/components/ui/button";
import { aiApi, planningApi, habitsApi, type Conversation } from "@/lib/api";
import { hasChatDragItem, readChatDragItem, type DragItem, type DragItemKind } from "@/lib/dragItem";
import { useI18n } from "@/contexts/LanguageContext";
import { usePreferences } from "@/contexts/PreferencesContext";
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

const KIND_META: Record<SuggestionKind, { icon: typeof Calendar; className: string }> = {
  monthly: { icon: Calendar, className: "text-violet-500" },
  weekly: { icon: CalendarRange, className: "text-sky-500" },
  habit: { icon: Flame, className: "text-orange-500" },
  task: { icon: CheckSquare, className: "text-emerald-500" },
};

// Fallback for non-actionable / unknown kinds (e.g. "insight") the model may
// emit. Without this, indexing KIND_META returns undefined and crashes render.
const KIND_FALLBACK = { icon: Sparkles, className: "text-muted-foreground" };

const ATTACH_ICON: Record<DragItemKind, typeof Calendar> = {
  monthly: Calendar,
  weekly: CalendarRange,
  yearly: Target,
  habit: Flame,
  task: CheckSquare,
};

function AttachmentChip({ item, onRemove }: { item: DragItem; onRemove?: () => void }) {
  const { t } = useI18n();
  const Icon = ATTACH_ICON[item.kind] ?? Paperclip;
  return (
    <span className="inline-flex max-w-[220px] items-center gap-1.5 rounded-md border bg-background py-1 pl-2 pr-1.5 text-xs">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate font-medium">{item.title}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          title={t("assistant.removeAttachment")}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

type Tab = "chat" | "plan";

const COOLDOWN_SECONDS = 3;

export function AssistantPanel({ open, onClose }: AssistantPanelProps) {
  const { t, lang } = useI18n();
  const { hideCompleted } = usePreferences();
  const makeGreeting = (): ChatMessage => ({
    id: "greeting",
    role: "assistant",
    content: t("assistant.greeting"),
  });

  const [tab, setTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [makeGreeting()]);
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
  const [dragOver, setDragOver] = useState(false);
  const [attachments, setAttachments] = useState<DragItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  // Tick down the post-send cooldown that throttles requests against the rate limit.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Re-translate the greeting when the language changes, but only while the
  // conversation is still just the fresh greeting (don't touch a real chat).
  useEffect(() => {
    setMessages((m) => (m.length === 1 && m[0].id === "greeting" ? [makeGreeting()] : m));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

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
          ...priorities.map((p) => ({ id: uid("plan"), kind: "weekly" as const, title: p.title, description: p.description, completed: p.is_completed })),
          ...habits.map((h) => ({ id: uid("plan"), kind: "habit" as const, title: h.name, description: h.description })),
          ...tasks.map((dt) => ({ id: uid("plan"), kind: "task" as const, title: dt.title, description: dt.description, completed: dt.is_completed })),
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
    setMessages([makeGreeting()]);
    setCurrentId(null);
    setAddedIds(new Set());
    setAttachments([]);
    setShowPicker(false);
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
        attachments: m.attachments ?? undefined,
      }));
      setMessages(mapped.length ? mapped : [makeGreeting()]);
      setCurrentId(id);
      setAddedIds(new Set());
      setAttachments([]);
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
    if ((!text && attachments.length === 0) || thinking || cooldown > 0) return;

    const sentAttachments = attachments;
    const userMsg: ChatMessage = {
      id: uid("msg"),
      role: "user",
      content: text,
      attachments: sentAttachments.length ? sentAttachments : undefined,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setAttachments([]);
    setThinking(true);

    try {
      const reply = await aiApi.chat(text, currentId ?? undefined, sentAttachments, lang);
      setCurrentId(reply.conversation_id);
      const suggestions: Suggestion[] = (reply.suggestions || []).map((s) => ({
        id: uid("sug"),
        kind: s.kind as SuggestionKind,
        title: s.title,
        description: s.description ?? undefined,
        date: s.date ?? undefined,
      }));
      setMessages((m) => [
        ...m,
        { id: uid("msg"), role: "assistant", content: reply.message, suggestions },
      ]);
      refreshConversations(); // pick up the new/updated title and ordering
    } catch {
      // Restore the draft so nothing is lost on failure.
      setMessages((m) => m.filter((x) => x.id !== userMsg.id));
      setInput(text);
      setAttachments(sentAttachments);
      setMessages((m) => [
        ...m,
        {
          id: uid("msg"),
          role: "assistant",
          content: t("assistant.errorReach"),
        },
      ]);
    } finally {
      setThinking(false);
      setCooldown(COOLDOWN_SECONDS);
    }
  };

  // A plan item was dragged onto the panel — add it as an attachment chip.
  const handleDrop = (e: React.DragEvent) => {
    setDragOver(false);
    const item = readChatDragItem(e);
    if (!item) return;
    e.preventDefault();
    setShowHistory(false);
    setTab("chat");
    setAttachments((prev) =>
      prev.some((a) => a.kind === item.kind && a.title === item.title) ? prev : [...prev, item]
    );
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const removeAttachment = (idx: number) =>
    setAttachments((prev) => prev.filter((_, i) => i !== idx));

  // Toggle an item from the plan-item picker (tap to attach/detach).
  const toggleAttachment = (item: DragItem) => {
    setAttachments((prev) =>
      prev.some((a) => a.kind === item.kind && a.title === item.title)
        ? prev.filter((a) => !(a.kind === item.kind && a.title === item.title))
        : [...prev, item]
    );
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
          task_date: s.date || toDateString(now),
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
        onDragOver={(e) => {
          if (!hasChatDragItem(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          // Only clear when the cursor actually leaves the panel.
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
        }}
        onDrop={handleDrop}
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l bg-card shadow-xl",
          "sm:relative sm:z-auto sm:w-[380px] sm:max-w-none sm:shadow-none"
        )}
      >
        {dragOver && (
          <div className="pointer-events-none absolute inset-0 z-50 m-2 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10">
            <span className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
              {t("assistant.dropHere")}
            </span>
          </div>
        )}
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold tracking-tight">{t("assistant.title")}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" onClick={startNewChat} title={t("assistant.newChat")}>
              <SquarePen className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory((v) => !v)}
              title={t("assistant.history")}
              className={cn(showHistory && "bg-primary/10 text-primary")}
            >
              <History className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} title={t("assistant.close")}>
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
          <TabButton active={tab === "chat"} onClick={() => setTab("chat")} icon={MessageSquare} label={t("assistant.tabChat")} />
          <TabButton
            active={tab === "plan"}
            onClick={() => setTab("plan")}
            icon={ListChecks}
            label={`${t("assistant.tabPlan")}${plan.length ? ` (${plan.length})` : ""}`}
          />
        </div>

        {tab === "chat" ? (
          <>
            {/* Messages, or the attachment picker when open */}
            {showPicker ? (
              <AttachmentPicker
                plan={hideCompleted ? plan.filter((p) => !p.completed) : plan}
                attachments={attachments}
                onToggle={toggleAttachment}
                onClose={() => setShowPicker(false)}
              />
            ) : (
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
            )}

            {/* Composer — extra bottom padding clears the mobile bottom nav (h-16) */}
            <div className="border-t px-3 pt-3 pb-20 md:pb-3">
              {attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {attachments.map((a, i) => (
                    <AttachmentChip key={`${a.kind}-${a.title}-${i}`} item={a} onRemove={() => removeAttachment(i)} />
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPicker((v) => !v)}
                  title={t("assistant.attachTooltip")}
                  className={cn("shrink-0", showPicker && "bg-primary/10 text-primary")}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder={attachments.length ? t("assistant.placeholderAttached") : t("assistant.placeholder")}
                  className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button
                  size="icon"
                  onClick={send}
                  disabled={(!input.trim() && attachments.length === 0) || thinking || cooldown > 0}
                  title={cooldown > 0 ? t("assistant.cooldown", { n: cooldown }) : t("assistant.send")}
                >
                  {cooldown > 0 ? <span className="text-xs font-semibold">{cooldown}</span> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                {cooldown > 0 ? t("assistant.cooldown", { n: cooldown }) : t("assistant.footer")}
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
    <div className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
      {message.attachments && message.attachments.length > 0 && (
        <div className={cn("flex flex-wrap gap-1.5", isUser && "justify-end")}>
          {message.attachments.map((a, i) => (
            <AttachmentChip key={`${a.kind}-${a.title}-${i}`} item={a} />
          ))}
        </div>
      )}

      {message.content && (
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
      )}

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
  const { t, lang } = useI18n();
  // Only the four planner kinds are actionable (persist() has a case for each);
  // others (e.g. "insight") render as read-only cards with no Add button.
  const actionable = suggestion.kind in KIND_META;
  const meta = KIND_META[suggestion.kind] ?? KIND_FALLBACK;
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-background p-3">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.className)} />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {actionable ? t(`kind.${suggestion.kind}`) : suggestion.kind.replace(/_/g, " ")}
          {suggestion.date && (
            <span className="ml-1.5 normal-case text-primary">
              · {format(parseISO(suggestion.date), "EEE, MMM d", { locale: dateLocale(lang) })}
            </span>
          )}
        </div>
        <div className="truncate text-sm font-medium">{suggestion.title}</div>
        {suggestion.description && (
          <div className="mt-0.5 text-xs text-muted-foreground">{suggestion.description}</div>
        )}
      </div>
      {actionable && (
        <Button
          size="sm"
          variant={added ? "secondary" : "default"}
          onClick={onAdd}
          disabled={added || saving}
          className="shrink-0"
        >
          {added ? (
            <>
              <Check className="h-3.5 w-3.5" /> {t("suggestion.added")}
            </>
          ) : saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("suggestion.adding")}
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" /> {t("suggestion.add")}
            </>
          )}
        </Button>
      )}
    </div>
  );
}

function PlanTab({ plan }: { plan: Suggestion[] }) {
  const { t } = useI18n();
  const order: SuggestionKind[] = ["monthly", "weekly", "habit", "task"];
  const groups = order
    .map((kind) => ({ kind, items: plan.filter((p) => p.kind === kind) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex-1 space-y-5 overflow-y-auto px-4 pt-4 pb-20 md:pb-4">
      {plan.length === 0 ? (
        <p className="pt-8 text-center text-sm text-muted-foreground">
          {t("assistant.planEmpty")}
        </p>
      ) : (
        groups.map((g) => {
          const meta = KIND_META[g.kind];
          const Icon = meta.icon;
          return (
            <div key={g.kind}>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Icon className={cn("h-3.5 w-3.5", meta.className)} />
                {t(`kind.${g.kind}`)}
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

function AttachmentPicker({
  plan,
  attachments,
  onToggle,
  onClose,
}: {
  plan: Suggestion[];
  attachments: DragItem[];
  onToggle: (item: DragItem) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const order: SuggestionKind[] = ["monthly", "weekly", "habit", "task"];
  const groups = order
    .map((kind) => ({ kind, items: plan.filter((p) => p.kind === kind) }))
    .filter((g) => g.items.length > 0);

  const isAttached = (item: Suggestion) =>
    attachments.some((a) => a.kind === item.kind && a.title === item.title);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex h-11 items-center justify-between border-b px-3">
        <span className="text-sm font-medium">{t("assistant.attachTitle")}</span>
        <Button variant="ghost" size="sm" onClick={onClose}>{t("assistant.done")}</Button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {plan.length === 0 ? (
          <p className="pt-6 text-center text-sm text-muted-foreground">{t("assistant.noPlanItems")}</p>
        ) : (
          groups.map((g) => {
            const meta = KIND_META[g.kind];
            const Icon = meta.icon;
            return (
              <div key={g.kind}>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Icon className={cn("h-3.5 w-3.5", meta.className)} />
                  {t(`kind.${g.kind}`)}
                </div>
                <ul className="space-y-1.5">
                  {g.items.map((item) => {
                    const on = isAttached(item);
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() =>
                            onToggle({ kind: item.kind, title: item.title, description: item.description })
                          }
                          className={cn(
                            "flex min-h-[44px] w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                            on ? "border-primary bg-primary/5" : "hover:bg-accent"
                          )}
                        >
                          <span className="flex-1 truncate text-sm">{item.title}</span>
                          {on ? (
                            <Check className="h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </div>
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
  const { t } = useI18n();
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="p-3">
        <Button variant="outline" className="w-full justify-start gap-2" onClick={onNewChat}>
          <SquarePen className="h-4 w-4" /> {t("assistant.newChat")}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-20 md:pb-3">
        {conversations.length === 0 ? (
          <p className="px-2 pt-6 text-center text-sm text-muted-foreground">
            {t("assistant.noConversations")}
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
                    <span className="text-[11px] text-muted-foreground">{relativeTime(c.updated_at, t)}</span>
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    title={t("assistant.deleteConversation")}
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

function relativeTime(iso: string, t: (k: string, v?: Record<string, string | number>) => string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return t("time.justNow");
  if (min < 60) return t("time.minutes", { n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("time.hours", { n: hr });
  const day = Math.floor(hr / 24);
  if (day < 7) return t("time.days", { n: day });
  return new Date(iso).toLocaleDateString();
}
