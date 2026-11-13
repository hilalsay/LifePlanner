import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, BookOpen, Calendar, CalendarDays, CalendarRange, Check, Clock, Flag,
  Flame, Github, HeartPulse, Loader2, Sparkles, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// Copy is English-only, like the rest of the public page.
const LADDER = [
  { Icon: Target, label: "Vision", text: "Life areas and the few goals that matter this year." },
  { Icon: Calendar, label: "Month", text: "Monthly focuses that move each goal forward." },
  { Icon: CalendarRange, label: "Week", text: "Priorities for the week, one tap from today's list." },
  { Icon: CalendarDays, label: "Today", text: "Tasks, habits and a 30-second check-in." },
] as const;

const FEATURES = [
  { Icon: CalendarDays, title: "Today, in one screen", text: "Type “Call Ali tomorrow 10am !high” and it's scheduled. Unfinished tasks from earlier in the week are one tap from today." },
  { Icon: Flame, title: "Habits that stick", text: "Check off today's habits right next to your tasks. Streaks and a weekly grid show where you're consistent." },
  { Icon: HeartPulse, title: "Daily check-in", text: "Mood, energy, sleep and water in a few taps. It saves as you go." },
  { Icon: Calendar, title: "Month at a glance", text: "A calendar tinted by mood. Tap any day to see what you did and how you felt." },
  { Icon: Target, title: "Vision board", text: "Group goals into life areas, break them into monthly milestones, and track progress." },
  { Icon: BookOpen, title: "Reading list", text: "Search any book, track pages, rate it and keep your notes." },
] as const;

// ── Product mockups (static, built from the app's own tokens) ────────────────

function TodayMockup() {
  const tasks = [
    { done: false, text: "Send the budget draft", meta: "Due 5:00 PM", tone: "text-warning", pri: "High", priCls: "bg-danger-soft text-danger" },
    { done: false, text: "Read 30 pages of Deep Work", meta: "", tone: "", pri: "Medium", priCls: "bg-warning-soft text-warning" },
    { done: true, text: "Morning run, 5 km", meta: "", tone: "", pri: "", priCls: "" },
  ];
  const habits = [
    { name: "Meditate", done: true },
    { name: "Read", done: true },
    { name: "No sugar", done: false },
  ];
  return (
    <div aria-hidden className="rounded-2xl border bg-card p-5 shadow-lg">
      <p className="text-xs font-semibold text-primary">Friday <span className="ml-1 rounded-full bg-primary-soft px-2 py-0.5">Today</span></p>
      <p className="mt-1 font-display text-2xl font-semibold">13 November</p>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-medium">1 / 3 done</span>
        <span className="text-muted-foreground">33%</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-secondary">
        <div className="h-full w-1/3 rounded-full bg-primary" />
      </div>

      <div className="mt-4 rounded-xl border bg-background p-2.5">
        <p className="text-sm">Dentist tomorrow 10am !high<span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-foreground" /></p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 text-info"><CalendarDays className="h-3 w-3" />Sat 14 Nov</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-warning"><Clock className="h-3 w-3" />10:00</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-danger"><Flag className="h-3 w-3" />High</span>
        </div>
      </div>

      <ul className="mt-3 space-y-1">
        {tasks.map((t) => (
          <li key={t.text} className="flex items-center gap-2.5 py-1.5">
            <span className={cn(
              "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2",
              t.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50",
            )}>
              {t.done && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate text-sm", t.done && "text-muted-foreground line-through")}>{t.text}</span>
              {t.meta && <span className={cn("text-[11px] font-semibold", t.tone)}>{t.meta}</span>}
            </span>
            {t.pri && <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", t.priCls)}>{t.pri}</span>}
          </li>
        ))}
      </ul>

      <div className="mt-3 border-t pt-3">
        <p className="mb-2 flex items-center gap-1 text-xs font-semibold"><Flame className="h-3.5 w-3.5 text-warning" />Habits · 2/3</p>
        <div className="flex flex-wrap gap-1.5">
          {habits.map((h) => (
            <span key={h.name} className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              h.done ? "border-transparent bg-primary text-primary-foreground" : "bg-card",
            )}>
              {h.done && <Check className="h-3 w-3" strokeWidth={3} />}{h.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function AizenNote() {
  return (
    <div aria-hidden className="rounded-2xl border bg-card p-4 shadow-md">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-primary"><Sparkles className="h-3.5 w-3.5" /></span>
        AIzen
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        The budget draft has slipped twice. You have a free hour before 5pm. Want me to block it?
      </p>
    </div>
  );
}

function ChatMockup() {
  const Bubble = ({ me, children }: { me?: boolean; children: React.ReactNode }) => (
    <div className={cn("flex gap-2.5", me ? "justify-end" : "items-start")}>
      {!me && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
      )}
      <p className={cn(
        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
        me ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-tl-sm border bg-card",
      )}>{children}</p>
    </div>
  );
  return (
    <div aria-hidden className="overflow-hidden rounded-2xl border bg-background shadow-lg">
      <div className="flex items-center gap-2.5 border-b bg-card px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary"><Sparkles className="h-4 w-4" /></span>
        <div>
          <p className="text-sm font-semibold">AIzen</p>
          <p className="text-xs text-muted-foreground">Your planning companion</p>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <Bubble me>What should I focus on this week?</Bubble>
        <Bubble>Your gym habit dropped to 2 of 7 last week, and “Deep Work” has been on your list for 12 days. Wednesday evening is open. Shall I add gym on Wed and Fri, and reading time on Thursday?</Bubble>
        <Bubble me>Yes, add them.</Bubble>
        <Bubble>Done. Gym on Wed and Fri at 6pm, reading Thu 2–4pm.</Bubble>
        <div className="rounded-xl border bg-card px-3.5 py-2.5 text-sm text-muted-foreground">Ask AIzen about your plans…</div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const container = "mx-auto w-full max-w-6xl px-4 sm:px-6";

export function LandingPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isLoading && user) navigate("/today", { replace: true });
  }, [user, isLoading, navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (isLoading) {
    return (
      <div role="status" className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
        <span className="sr-only">Loading</span>
      </div>
    );
  }
  if (user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ── */}
      <header className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-200",
        scrolled ? "border-border bg-background/90 backdrop-blur" : "border-transparent",
      )}>
        <div className={cn(container, "flex h-16 items-center gap-8")}>
          <a href="/" className="flex shrink-0 items-center gap-2.5">
            <img src="/android-chrome-192x192.png" alt="" className="h-7 w-7 rounded-lg dark:invert" />
            <span className="font-display text-lg font-semibold">Life Planner</span>
          </a>
          <nav aria-label="Sections" className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#aizen" className="hover:text-foreground">AIzen</a>
            <a href="#open-source" className="hover:text-foreground">Open source</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/login">Log in</Link></Button>
            <Button asChild size="sm" className="rounded-full px-4">
              <Link to="/register">Get started <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          <div className={cn(container, "grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16")}>
            <div>
              <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Plan · Track · Reflect, with an AI companion
              </p>
              <h1 className="font-display text-[44px] font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                Plan everything.
                <br />
                <span className="italic text-primary">Act on what matters.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
                Life Planner connects your biggest goals to today's task list. Habits, mood and reading live in the same place,
                and AIzen helps you turn plans into steady daily action.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-full">
                  <Link to="/register">Start planning free <ArrowRight className="h-4 w-4" aria-hidden /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full">
                  <Link to="/login">Sign in</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Free to use · No credit card · English and Türkçe</p>
            </div>

            <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
              <div aria-hidden className="absolute -inset-8 -z-10 rounded-[40px] bg-primary-soft/70 blur-2xl" />
              <TodayMockup />
              <div className="-mt-6 ml-auto w-[85%] translate-x-2 sm:translate-x-6">
                <AizenNote />
              </div>
            </div>
          </div>
        </section>

        {/* ── How it fits together ── */}
        <section id="how" className="border-y bg-card py-16 md:py-20">
          <div className={container}>
            <p className="text-sm font-semibold text-primary">How it works</p>
            <h2 className="mt-2 max-w-xl font-display text-3xl font-semibold leading-tight md:text-4xl">
              From the life you want to what you do today
            </h2>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {LADDER.map(({ Icon, label, text }, i) => (
                <li key={label} className="relative rounded-xl border bg-background p-5">
                  <span className="absolute right-4 top-4 font-display text-3xl font-semibold text-muted-foreground/25">{i + 1}</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-semibold">{label}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-16 md:py-24">
          <div className={container}>
            <p className="text-sm font-semibold text-primary">Features</p>
            <h2 className="mt-2 max-w-xl font-display text-3xl font-semibold leading-tight md:text-4xl">
              Small daily rituals, one calm place
            </h2>
            <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ Icon, title, text }) => (
                <div key={title}>
                  <Icon className="h-6 w-6 text-primary" aria-hidden />
                  <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── AIzen ── */}
        <section id="aizen" className="border-y bg-sunken py-16 md:py-24">
          <div className={cn(container, "grid items-center gap-12 lg:grid-cols-2 lg:gap-16")}>
            <div>
              <p className="text-sm font-semibold text-primary">Your AI companion</p>
              <h2 className="mt-2 font-display text-3xl font-semibold leading-tight md:text-4xl">Meet AIzen</h2>
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted-foreground">
                AIzen knows your tasks, goals, habits and history. Ask it to review your week, suggest priorities, or think
                a decision through, and it answers from <em className="font-display text-foreground">your actual plan</em>, not generic advice.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Reads your habit streaks and mood history",
                  "Connects daily tasks to your long-range goals",
                  "Writes a weekly review of how things went",
                  "Drag any task or goal into the chat to discuss it",
                ].map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <ChatMockup />
          </div>
        </section>

        {/* ── Open source ── */}
        <section id="open-source" className="py-16 md:py-20">
          <div className={cn(container, "max-w-xl text-center")}>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border bg-card">
              <Github className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-5 font-display text-3xl font-semibold">Free and open source</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Life Planner is free to use and the code is on GitHub. Host it yourself, fork it, or contribute a feature.
            </p>
            <Button asChild variant="outline" className="mt-6 rounded-full">
              <a href="https://github.com/hilalsay/LifePlanner" target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" aria-hidden />View on GitHub
              </a>
            </Button>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className={cn(container, "pb-16 md:pb-24")}>
          <div className="rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground md:py-16">
            <h2 className="font-display text-4xl font-semibold leading-tight md:text-5xl">Start planning today.</h2>
            <p className="mx-auto mt-3 max-w-md text-lg opacity-85">Your goals deserve a system you'll actually open every morning.</p>
            <Button asChild size="lg" variant="secondary" className="mt-8 rounded-full">
              <Link to="/register">Create your free account <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </Button>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t">
        <div className={cn(container, "flex flex-wrap items-center justify-between gap-4 py-6 text-sm text-muted-foreground")}>
          <span className="flex items-center gap-2">
            <img src="/android-chrome-192x192.png" alt="" className="h-5 w-5 rounded dark:invert" />
            © {new Date().getFullYear()} Life Planner
          </span>
          <nav aria-label="Footer" className="flex gap-6">
            <a href="https://github.com/hilalsay/LifePlanner" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">GitHub</a>
            <Link to="/login" className="hover:text-foreground">Sign in</Link>
            <Link to="/register" className="hover:text-foreground">Register</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
