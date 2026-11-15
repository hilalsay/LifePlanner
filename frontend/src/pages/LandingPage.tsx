import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CalendarRange,
  Target,
  Flame,
  BarChart3,
  BookOpen,
  Sparkles,
  ArrowRight,
  Github,
  Check,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// ── Design tokens ─────────────────────────────────────────────────────────────
const ink    = "#E8E6FF";
const inkDim = "#B8B4DC";
const muted  = "#6B7499";
const violet = "#6366f1";
const vLight = "#a5b4fc";
const bg     = "#06091A";
const surf   = "#0B1228";
const border = "rgba(99,102,241,0.18)";

// ── Features data ─────────────────────────────────────────────────────────────
const features = [
  {
    Icon: CalendarDays,
    title: "Day & Week Planning",
    desc: "Drag tasks between days, see your week at a glance, and adjust priorities without friction.",
  },
  {
    Icon: Target,
    title: "Vision Board",
    desc: "Define where you're headed. Break big goals into yearly and monthly focus areas.",
  },
  {
    Icon: Flame,
    title: "Habit Tracker",
    desc: "Build the routines that shape who you're becoming. Streaks, logs, and honest data.",
  },
  {
    Icon: BarChart3,
    title: "Health & Mood",
    desc: "Track sleep, workouts, and mood. Understand what fuels your best days.",
  },
  {
    Icon: BookOpen,
    title: "Book Log",
    desc: "Record what you're reading and what it teaches you — in context with your goals.",
  },
  {
    Icon: CalendarRange,
    title: "Year at a Glance",
    desc: "A bird's-eye view of your entire year. Spot patterns. Protect what matters.",
  },
] as const;

// ── Planner card mockup ───────────────────────────────────────────────────────
function PlannerCard() {
  const now   = new Date();
  const days  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const mons  = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const label = `${days[now.getDay()]}, ${mons[now.getMonth()]} ${now.getDate()}`;

  const tasks = [
    { done: true,  text: "Morning run",          time: "8:00 AM"  },
    { done: true,  text: "Review Q3 goals",       time: "10:30 AM" },
    { done: false, text: "Write proposal draft",  time: "2:00 PM"  },
    { done: false, text: "Gym session",           time: "6:00 PM"  },
  ];

  const habits = [
    { name: "Gym",      filled: 4 },
    { name: "Read",     filled: 3 },
    { name: "Meditate", filled: 5 },
  ];

  return (
    <div style={{
      background: "rgba(11,18,40,0.97)",
      border: `1px solid ${border}`,
      borderRadius: 14,
      padding: 20,
    }}>
      {/* Window chrome */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 16 }}>
        {[0.5, 0.3, 0.15].map((o, i) => (
          <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: `rgba(99,102,241,${o})` }} />
        ))}
        <span style={{ marginLeft: 8, fontSize: 11, color: muted, fontWeight: 500, letterSpacing: "0.03em" }}>
          Life Planner
        </span>
      </div>

      <div style={{ fontSize: 12, color: muted, marginBottom: 14, letterSpacing: "0.01em" }}>{label}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 18 }}>
        {tasks.map((t) => (
          <div key={t.text} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
              border: `1.5px solid ${t.done ? violet : "rgba(107,116,153,0.45)"}`,
              background: t.done ? violet : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {t.done && <Check size={9} color="#fff" strokeWidth={3} />}
            </div>
            <span style={{
              flex: 1, fontSize: 13,
              color: t.done ? muted : ink,
              textDecoration: t.done ? "line-through" : "none",
            }}>
              {t.text}
            </span>
            <span style={{ fontSize: 11, color: muted }}>{t.time}</span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${border}`, paddingTop: 14 }}>
        <div style={{ fontSize: 10, color: muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Habits this week
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {habits.map((h) => (
            <div key={h.name} style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 2 }}>
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: i < h.filled ? violet : "rgba(99,102,241,0.15)",
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 10, color: muted }}>{h.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AizenBubble() {
  return (
    <div style={{
      background: "rgba(99,102,241,0.07)",
      border: `1px solid rgba(99,102,241,0.28)`,
      borderRadius: 12,
      padding: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "rgba(99,102,241,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Sparkles size={13} color={vLight} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: vLight }}>AIzen</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
          <span style={{ fontSize: 11, color: muted }}>online</span>
        </div>
      </div>
      <p style={{ fontSize: 13, color: inkDim, lineHeight: 1.55, margin: 0 }}>
        Your proposal has been pending 3 days — you have a clear 2-hour window before your 6pm gym session. That's your best shot today.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function LandingPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isLoading && user) navigate("/today", { replace: true });
  }, [user, isLoading, navigate]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: bg }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          border: `4px solid ${violet}`, borderTopColor: "transparent",
          animation: "lp-spin 0.75s linear infinite",
        }} />
        <style>{`@keyframes lp-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (user) return null;

  return (
    <div style={{ background: bg, color: ink, minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <style>{`
        .lp-serif {
          font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif;
        }

        .lp-nav-link {
          color: ${muted};
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: color 0.15s;
        }
        .lp-nav-link:hover { color: ${ink}; }

        .lp-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: ${violet};
          color: #fff;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          white-space: nowrap;
          font-family: inherit;
        }
        .lp-btn-primary:hover { background: #5254cc; transform: translateY(-1px); }
        .lp-btn-primary:focus-visible { outline: 2px solid ${vLight}; outline-offset: 3px; }

        .lp-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          color: ${inkDim};
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          border: 1px solid ${border};
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
          white-space: nowrap;
          font-family: inherit;
        }
        .lp-btn-outline:hover { border-color: rgba(99,102,241,0.5); color: ${ink}; }
        .lp-btn-outline:focus-visible { outline: 2px solid ${vLight}; outline-offset: 3px; }

        .lp-feature-card {
          padding: 24px;
          border: 1px solid ${border};
          border-radius: 10px;
          background: rgba(11,18,40,0.5);
          transition: border-color 0.2s, background 0.2s;
        }
        .lp-feature-card:hover {
          border-color: rgba(99,102,241,0.38);
          background: rgba(11,18,40,0.9);
        }

        .lp-hero-bg {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }

        .lp-glow {
          position: absolute;
          width: 720px;
          height: 720px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 65%);
          right: -180px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }

        @keyframes lp-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }
        .lp-mockup {
          animation: lp-float 5s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .lp-mockup { animation: none; }
        }

        @media (max-width: 767px) {
          .lp-hero-cols  { flex-direction: column !important; }
          .lp-hero-text  { flex: 1 !important; max-width: 100% !important; }
          .lp-hero-visual { display: none !important; }
          .lp-features-grid { grid-template-columns: 1fr !important; }
          .lp-aizen-cols { flex-direction: column !important; }
          .lp-nav-links  { display: none !important; }
          .lp-h1 { font-size: 48px !important; }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .lp-features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .lp-h1 { font-size: 60px !important; }
        }
      `}</style>

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: scrolled ? `1px solid ${border}` : "1px solid transparent",
        background: scrolled ? "rgba(6,9,26,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(14px)" : "none",
        transition: "background 0.25s, border-color 0.25s",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto", padding: "0 24px",
          height: 64, display: "flex", alignItems: "center", gap: 32,
        }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flexShrink: 0 }}>
            <img src="/android-chrome-192x192.png" alt="" style={{ width: 26, height: 26, borderRadius: 6 }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: ink, letterSpacing: "-0.015em" }}>Life Planner</span>
          </a>

          <nav className="lp-nav-links" style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#aizen" className="lp-nav-link">AIzen</a>
            <a href="#open-source" className="lp-nav-link">Open Source</a>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
            <Link to="/login" className="lp-btn-outline" style={{ padding: "8px 16px" }}>Log In</Link>
            <Link to="/register" className="lp-btn-primary" style={{ padding: "8px 16px" }}>
              Get Started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section style={{
        position: "relative",
        overflow: "hidden",
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        alignItems: "center",
      }}>
        <div className="lp-hero-bg" />
        <div className="lp-glow" />
        {/* bottom fade */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 120,
          background: `linear-gradient(to bottom, transparent, ${bg})`,
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "80px 24px", width: "100%" }}>
          <div className="lp-hero-cols" style={{ display: "flex", alignItems: "center", gap: 56 }}>

            {/* Left: text */}
            <div className="lp-hero-text" style={{ flex: "0 0 52%", maxWidth: "52%" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                border: `1px solid rgba(99,102,241,0.3)`,
                borderRadius: 20, padding: "5px 12px 5px 9px",
                background: "rgba(99,102,241,0.07)", marginBottom: 28,
              }}>
                <Sparkles size={12} color={vLight} />
                <span style={{ fontSize: 12, color: vLight, fontWeight: 500, letterSpacing: "0.04em" }}>
                  AI-Powered Life Planning
                </span>
              </div>

              <h1 className="lp-serif lp-h1" style={{
                fontStyle: "italic",
                fontSize: 76,
                fontWeight: 400,
                lineHeight: 1.07,
                letterSpacing: "-0.022em",
                margin: "0 0 24px",
              }}>
                <span style={{ color: ink }}>Plan everything.</span>
                <br />
                <span style={{ color: violet }}>Act on what matters.</span>
              </h1>

              <p style={{
                fontSize: 18,
                color: muted,
                lineHeight: 1.65,
                maxWidth: 460,
                margin: "0 0 36px",
              }}>
                Life Planner connects your biggest ambitions to tomorrow's task list — with AIzen, your AI companion, turning your plans into consistent daily action.
              </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <Link to="/register" className="lp-btn-primary" style={{ fontSize: 15, padding: "12px 24px" }}>
                  Get Started Free <ArrowRight size={16} />
                </Link>
                <Link to="/login" className="lp-btn-outline" style={{ fontSize: 15, padding: "12px 24px" }}>
                  Sign In
                </Link>
              </div>
              <p style={{ fontSize: 13, color: muted, marginTop: 14 }}>Free to use · No credit card required</p>
            </div>

            {/* Right: mockup */}
            <div className="lp-hero-visual" style={{ flex: 1 }}>
              <div className="lp-mockup" style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 348, marginLeft: "auto" }}>
                <PlannerCard />
                <AizenBubble />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 56, maxWidth: 480 }}>
            <div style={{
              fontSize: 11, color: violet, fontWeight: 600,
              letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12,
            }}>
              Everything you need
            </div>
            <h2 className="lp-serif" style={{
              fontStyle: "italic", fontSize: 42, fontWeight: 400, color: ink,
              lineHeight: 1.2, margin: "0 0 14px",
            }}>
              Your whole life, in one place
            </h2>
            <p style={{ fontSize: 16, color: muted, lineHeight: 1.6, margin: 0 }}>
              One system for every layer of your life — from decade-scale vision to today's to-do list.
            </p>
          </div>

          <div className="lp-features-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}>
            {features.map(({ Icon, title, desc }) => (
              <div key={title} className="lp-feature-card">
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: "rgba(99,102,241,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 14,
                }}>
                  <Icon size={17} color={vLight} />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: ink, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
                  {title}
                </h3>
                <p style={{ fontSize: 13, color: muted, lineHeight: 1.55, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AIzen ────────────────────────────────────────────────────────────── */}
      <section id="aizen" style={{ padding: "96px 24px", background: surf, borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="lp-aizen-cols" style={{ display: "flex", alignItems: "center", gap: 72 }}>

            {/* Text */}
            <div style={{ flex: "0 0 42%", maxWidth: "42%" }}>
              <div style={{
                fontSize: 11, color: violet, fontWeight: 600,
                letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12,
              }}>
                Your AI companion
              </div>
              <h2 className="lp-serif" style={{
                fontStyle: "italic", fontSize: 42, fontWeight: 400, color: ink,
                lineHeight: 1.2, margin: "0 0 18px",
              }}>
                Meet AIzen
              </h2>
              <p style={{ fontSize: 16, color: muted, lineHeight: 1.65, margin: "0 0 28px" }}>
                AIzen knows your tasks, goals, habits, and history. Ask it to review your week, suggest priorities, or think through a decision — and it answers from the context of{" "}
                <em style={{ color: inkDim, fontStyle: "italic" }}>your actual life plan</em>, not generic advice.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {[
                  "Reads your habit streaks and mood history",
                  "Connects daily tasks to your long-range goals",
                  "Asks the right follow-up questions",
                  "Stays in context across the whole conversation",
                ].map((point) => (
                  <div key={point} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                      background: "rgba(99,102,241,0.12)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Check size={10} color={vLight} strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: 14, color: inkDim, lineHeight: 1.5 }}>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat mockup */}
            <div style={{ flex: 1 }}>
              <div style={{
                background: "rgba(6,9,26,0.8)",
                border: `1px solid ${border}`,
                borderRadius: 14,
                overflow: "hidden",
              }}>
                {/* Header */}
                <div style={{
                  padding: "14px 18px",
                  borderBottom: `1px solid ${border}`,
                  display: "flex", alignItems: "center", gap: 10,
                  background: "rgba(11,18,40,0.6)",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "rgba(99,102,241,0.18)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Sparkles size={15} color={vLight} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>AIzen</div>
                    <div style={{ fontSize: 11, color: muted }}>Your planning companion</div>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
                    <span style={{ fontSize: 11, color: muted }}>online</span>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{
                      background: "rgba(99,102,241,0.18)",
                      border: `1px solid rgba(99,102,241,0.28)`,
                      borderRadius: "10px 10px 2px 10px",
                      padding: "10px 14px",
                      maxWidth: "80%",
                      fontSize: 14, color: inkDim, lineHeight: 1.5,
                    }}>
                      What should I focus on this week?
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                      background: "rgba(99,102,241,0.14)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Sparkles size={12} color={vLight} />
                    </div>
                    <div style={{
                      background: "rgba(11,18,40,0.9)",
                      border: `1px solid ${border}`,
                      borderRadius: "2px 10px 10px 10px",
                      padding: "10px 14px",
                      fontSize: 14, color: inkDim, lineHeight: 1.6,
                    }}>
                      Your gym habit dropped to 2/7 last week, and "Deep Work" has been on your reading list for 12 days. Wednesday evening is open — lock in gym Wed & Fri, and use Thursday 2pm for focused reading. Want me to add those?
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{
                      background: "rgba(99,102,241,0.18)",
                      border: `1px solid rgba(99,102,241,0.28)`,
                      borderRadius: "10px 10px 2px 10px",
                      padding: "10px 14px",
                      fontSize: 14, color: inkDim, lineHeight: 1.5,
                    }}>
                      Yes, add them.
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                      background: "rgba(99,102,241,0.14)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Sparkles size={12} color={vLight} />
                    </div>
                    <div style={{
                      background: "rgba(11,18,40,0.9)",
                      border: `1px solid ${border}`,
                      borderRadius: "2px 10px 10px 10px",
                      padding: "10px 14px",
                      fontSize: 14, color: inkDim, lineHeight: 1.6,
                    }}>
                      Done. Gym added Wed & Fri at 6pm, reading time Thu 2–4pm. That's 6 hours of deep work scheduled this week.
                    </div>
                  </div>

                  {/* Input bar */}
                  <div style={{
                    marginTop: 2,
                    border: `1px solid rgba(99,102,241,0.18)`,
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 14, color: "rgba(107,116,153,0.7)",
                    background: "rgba(11,18,40,0.5)",
                    cursor: "text",
                  }}>
                    Ask AIzen anything about your plans…
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Open Source ──────────────────────────────────────────────────────── */}
      <section id="open-source" style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
          <div style={{
            width: 46, height: 46, borderRadius: 10,
            background: "rgba(99,102,241,0.08)",
            border: `1px solid ${border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <Github size={20} color={vLight} />
          </div>
          <h2 className="lp-serif" style={{
            fontStyle: "italic", fontSize: 36, fontWeight: 400, color: ink,
            lineHeight: 1.25, margin: "0 0 14px",
          }}>
            Free and open source
          </h2>
          <p style={{ fontSize: 16, color: muted, lineHeight: 1.65, margin: "0 0 28px" }}>
            Life Planner is free to use and the source is open on GitHub. Self-host it on your own server, fork it, or contribute a feature.
          </p>
          <a
            href="https://github.com/hilalsay/LifePlanner"
            target="_blank"
            rel="noopener noreferrer"
            className="lp-btn-outline"
          >
            <Github size={15} />
            View on GitHub
          </a>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section style={{
        padding: "80px 24px",
        background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 100%)",
        borderTop: `1px solid ${border}`,
        borderBottom: `1px solid ${border}`,
      }}>
        <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
          <h2 className="lp-serif" style={{
            fontStyle: "italic", fontSize: 46, fontWeight: 400, color: ink,
            lineHeight: 1.15, margin: "0 0 14px",
          }}>
            Start planning today.
          </h2>
          <p style={{ fontSize: 17, color: muted, margin: "0 0 32px", lineHeight: 1.6 }}>
            Your goals deserve a system that actually works.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link to="/register" className="lp-btn-primary" style={{ fontSize: 16, padding: "13px 28px" }}>
              Get Started Free <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="lp-btn-outline" style={{ fontSize: 16, padding: "13px 28px" }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer style={{ padding: "28px 24px" }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/android-chrome-192x192.png" alt="" style={{ width: 18, height: 18, borderRadius: 4, opacity: 0.7 }} />
            <span style={{ fontSize: 13, color: muted }}>
              © {new Date().getFullYear()} Life Planner
            </span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              { label: "GitHub", href: "https://github.com/hilalsay/LifePlanner", external: true },
              { label: "Sign In", href: "/login", external: false },
              { label: "Register", href: "/register", external: false },
            ].map(({ label, href, external }) =>
              external ? (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 13, color: muted, textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = ink)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
                >
                  {label}
                </a>
              ) : (
                <Link
                  key={label}
                  to={href}
                  style={{ fontSize: 13, color: muted, textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = ink)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
                >
                  {label}
                </Link>
              )
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
