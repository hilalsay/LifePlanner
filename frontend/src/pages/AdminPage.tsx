import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { ChevronDown, ChevronRight, Search, ShieldAlert, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi, type AdminOverview, type AdminUserDetail, type AdminUserRow } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Human names for the feature keys the backend reports. */
const FEATURE_LABELS: Record<string, string> = {
  app_open: "App opens",
  tasks: "Daily tasks",
  weekly: "Weekly priorities",
  monthly: "Monthly focus",
  yearly_goals: "Yearly goals",
  life_areas: "Life areas",
  notes: "Notes",
  planning_other: "Planning (other)",
  habits: "Habits",
  habit_checkins: "Habit check-ins",
  mood: "Mood",
  health: "Health",
  reading: "Reading",
  ai_chat: "AI chat",
  ai_conversations: "AI conversations",
  ai_messages: "AI messages sent",
  ai_review: "AI weekly review",
  ai_reviews: "AI weekly reviews",
  quick_add: "Quick add (AI parse)",
  motivational: "Motivational banner",
};
const label = (k: string) => FEATURE_LABELS[k] ?? k;

const RANGES = [7, 30, 90] as const;

const ago = (iso: string | null) =>
  iso ? formatDistanceToNowStrict(parseISO(iso), { addSuffix: true }) : "—";
const day = (iso: string) => format(parseISO(iso), "MMM d");

// ── Small building blocks ────────────────────────────────────────────────────

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

/** Single-series column chart with a hover readout. */
function Columns({ data, unit, height = 120 }: { data: { day: string; value: number }[]; unit: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const shown = hover != null ? data[hover] : null;
  return (
    <div>
      <p className="mb-2 h-5 text-sm tabular-nums text-muted-foreground" aria-live="polite">
        {shown ? (
          <><span className="font-semibold text-foreground">{shown.value}</span> {unit} · {day(shown.day)}</>
        ) : (
          <>Peak <span className="font-semibold text-foreground">{max === 1 && total === 0 ? 0 : max}</span> · hover a column</>
        )}
      </p>
      <div
        role="img"
        aria-label={`${unit} per day, ${data.length} days, total ${total}, peak ${max}`}
        className="relative flex items-end gap-[2px] border-b border-border"
        style={{ height }}
        onMouseLeave={() => setHover(null)}
      >
        {data.map((d, i) => (
          <div
            key={d.day}
            className="flex h-full flex-1 cursor-default items-end"
            onMouseEnter={() => setHover(i)}
          >
            <div
              className={cn(
                "w-full rounded-t-[4px] transition-colors",
                hover === i ? "bg-primary" : "bg-primary/70",
                d.value === 0 && "bg-transparent"
              )}
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 2 : 0 }}
            />
          </div>
        ))}
      </div>
      {data.length > 0 && (
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{day(data[0].day)}</span>
          <span>{day(data[data.length - 1].day)}</span>
        </div>
      )}
    </div>
  );
}

/** Horizontal magnitude bar with the number beside it (one hue). */
function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-sunken">
      <div className="h-2 rounded-full bg-primary/80" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </div>
  );
}

// ── User detail (expanded row) ──────────────────────────────────────────────

function UserDetail({ id, days }: { id: string; days: number }) {
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    adminApi.user(id, days).then(setData).catch((e) => setError(String(e.message ?? e)));
  }, [id, days]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <Skeleton className="h-40 w-full" />;

  const maxContent = Math.max(1, ...data.content.map((c) => c.count));
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <h4 className="mb-2 text-sm font-semibold">What they've created (all time)</h4>
        {data.content.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.content.map((c) => (
              <li key={c.key} className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-3 text-sm">
                <span className="truncate">{label(c.key)}</span>
                <Bar value={c.count} max={maxContent} />
                <span className="w-24 text-right tabular-nums text-muted-foreground">
                  {c.count}
                  {c.recent > 0 && <span className="text-success"> (+{c.recent})</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">(+n) = created in the last {days} days.</p>
      </div>
      <div className="space-y-4">
        <div>
          <h4 className="mb-2 text-sm font-semibold">Daily activity (last {days} days)</h4>
          <Columns data={data.series.map((s) => ({ day: s.day, value: s.views + s.actions }))} unit="requests" height={80} />
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold">Features used (last {days} days)</h4>
          {data.features.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tracked activity in this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr><th className="pb-1 text-left font-medium">Feature</th><th className="pb-1 text-right font-medium">Days</th><th className="pb-1 text-right font-medium">Actions</th><th className="pb-1 text-right font-medium">Views</th></tr>
              </thead>
              <tbody className="tabular-nums">
                {data.features.map((f) => (
                  <tr key={f.feature} className="border-t">
                    <td className="py-1">{label(f.feature)}</td>
                    <td className="py-1 text-right">{f.active_days}</td>
                    <td className="py-1 text-right">{f.actions}</td>
                    <td className="py-1 text-right text-muted-foreground">{f.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

type SortKey = "last_active_at" | "created_at" | "active_days" | "actions" | "total_items";

export function AdminPage() {
  const { user } = useAuth();
  const [days, setDays] = useState<number>(30);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hideEmpty, setHideEmpty] = useState(true);
  const [sort, setSort] = useState<SortKey>("last_active_at");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setOverview(null);
    setUsers(null);
    Promise.all([adminApi.overview(days), adminApi.users(days)])
      .then(([o, u]) => { setOverview(o); setUsers(u); })
      .catch((e) => setError(String(e.message ?? e)));
  }, [days]);

  useEffect(() => { if (user?.is_admin) load(); }, [load, user?.is_admin]);

  const rows = useMemo(() => {
    if (!users) return [];
    const q = query.trim().toLowerCase();
    const val = (r: AdminUserRow) => {
      const v = r[sort];
      return typeof v === "number" ? v : v ? Date.parse(v) : 0;
    };
    return users
      .filter((r) => !hideEmpty || r.total_items > 0 || r.actions > 0)
      .filter((r) => !q || r.email.toLowerCase().includes(q) || (r.display_name ?? "").toLowerCase().includes(q))
      .sort((a, b) => val(b) - val(a));
  }, [users, query, hideEmpty, sort]);

  if (!user?.is_admin) {
    return <EmptyState icon={ShieldAlert} title="Admins only" hint="This page is only available to admin accounts." className="mx-auto max-w-md" />;
  }

  const t = overview?.totals;
  const maxFeatureUsers = Math.max(1, ...(overview?.features.map((f) => f.users) ?? [0]));
  const maxAdoption = Math.max(1, ...(overview?.adoption.map((a) => a.users) ?? [0]));
  const SortTh = ({ k, children, className }: { k: SortKey; children: string; className?: string }) => (
    <th className={cn("px-3 py-2 font-medium", className)} aria-sort={sort === k ? "descending" : undefined}>
      <button onClick={() => setSort(k)} className={cn("hover:text-foreground", sort === k && "text-foreground underline underline-offset-4")}>
        {children}
      </button>
    </th>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Range selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Usage across all accounts. Counts only, no user content is shown.</p>
        <div role="group" aria-label="Time range" className="inline-flex rounded-lg border bg-card p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              aria-pressed={days === r}
              className={cn(
                "min-h-[36px] rounded-md px-3 text-sm font-medium transition-colors",
                days === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} retryLabel="Retry" />}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {t ? (
          <>
            <Stat label="Total users" value={t.users} />
            <Stat label={`New (${days}d)`} value={t.new_users} />
            <Stat label="Active today" value={t.active_1d} hint="last 24 hours" />
            <Stat label="Active 7d" value={t.active_7d} />
            <Stat label="Active 30d" value={t.active_30d} />
            <Stat label="Never used" value={t.never_used} hint="signed up, created nothing" />
          </>
        ) : (
          Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[92px]" />)
        )}
      </div>

      {overview && (!overview.tracking_since || overview.tracking_since > overview.series[0].day) && (
        <p className="rounded-lg border border-info/30 bg-info-soft px-4 py-2 text-sm">
          Detailed activity tracking {overview.tracking_since ? `started on ${day(overview.tracking_since)}` : "has just been switched on"}.
          Daily active users and feature usage fill in from then on; "created" counts and last-active dates already include all history.
        </p>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Daily active users</CardTitle></CardHeader>
          <CardContent>
            {overview ? <Columns data={overview.series.map((s) => ({ day: s.day, value: s.active_users }))} unit="active users" /> : <Skeleton className="h-40" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Sign-ups</CardTitle></CardHeader>
          <CardContent>
            {overview ? <Columns data={overview.series.map((s) => ({ day: s.day, value: s.signups }))} unit="sign-ups" /> : <Skeleton className="h-40" />}
          </CardContent>
        </Card>
      </div>

      {/* Feature usage */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Feature adoption</CardTitle>
            <p className="text-xs text-muted-foreground">Users who have ever created something with each feature (all history).</p>
          </CardHeader>
          <CardContent>
            {overview ? (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 text-left font-medium">Feature</th>
                    <th className="pb-2 font-medium" aria-label="Users bar" />
                    <th className="pb-2 text-right font-medium">Users</th>
                    <th className="pb-2 text-right font-medium" title={`Users who created something in the last ${days} days`}>{days}d</th>
                    <th className="pb-2 text-right font-medium">Items</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {overview.adoption.map((a) => (
                    <tr key={a.key} className="border-t">
                      <td className="py-1.5 pr-3">{label(a.key)}</td>
                      <td className="w-1/3 py-1.5 pr-3"><Bar value={a.users} max={maxAdoption} /></td>
                      <td className="py-1.5 text-right">{a.users}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{a.users_recent}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{a.items}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <Skeleton className="h-64" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Feature usage (last {days} days)</CardTitle>
            <p className="text-xs text-muted-foreground">From activity tracking: how many people used each screen, and how often they changed something.</p>
          </CardHeader>
          <CardContent>
            {!overview ? <Skeleton className="h-64" /> : overview.features.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No tracked activity yet. This fills in as people use the app.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 text-left font-medium">Feature</th>
                    <th className="pb-2 font-medium" aria-label="Users bar" />
                    <th className="pb-2 text-right font-medium">Users</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                    <th className="pb-2 text-right font-medium">Views</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {overview.features.map((f) => (
                    <tr key={f.feature} className="border-t">
                      <td className="py-1.5 pr-3">{label(f.feature)}</td>
                      <td className="w-1/3 py-1.5 pr-3"><Bar value={f.users} max={maxFeatureUsers} /></td>
                      <td className="py-1.5 text-right">{f.users}</td>
                      <td className="py-1.5 text-right">{f.actions}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{f.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Users */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Users {users && <span className="font-normal text-muted-foreground">({rows.length} of {users.length})</span>}</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                Hide accounts with no activity
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search email or name"
                  aria-label="Search users"
                  className="h-9 w-56 rounded-lg border bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {!users ? (
            <div className="p-4"><Skeleton className="h-64" /></div>
          ) : rows.length === 0 ? (
            <div className="p-4"><EmptyState icon={Users} title="No users match" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-y bg-sunken/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">User</th>
                    <SortTh k="created_at">Joined</SortTh>
                    <SortTh k="last_active_at">Last active</SortTh>
                    <SortTh k="active_days" className="text-right">Active days</SortTh>
                    <SortTh k="actions" className="text-right">Actions</SortTh>
                    <SortTh k="total_items" className="text-right">Items</SortTh>
                    <th className="px-3 py-2 font-medium">Most used</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {rows.map((r) => {
                    const isOpen = open === r.id;
                    return (
                      <Fragment key={r.id}>
                        <tr
                          className={cn("cursor-pointer border-b transition-colors hover:bg-accent/50", isOpen && "bg-accent/40")}
                          onClick={() => setOpen(isOpen ? null : r.id)}
                        >
                          <td className="px-3 py-2">
                            <button
                              className="flex min-w-0 items-center gap-2 text-left"
                              aria-expanded={isOpen}
                              onClick={(e) => { e.stopPropagation(); setOpen(isOpen ? null : r.id); }}
                            >
                              {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" aria-hidden /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
                              <span className="min-w-0">
                                <span className="block truncate font-medium">
                                  {r.display_name || r.email.split("@")[0]}
                                  {r.is_admin && <span className="ml-1.5 rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">admin</span>}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">{r.email} · {r.provider}</span>
                              </span>
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{format(parseISO(r.created_at), "MMM d, yyyy")}</td>
                          <td className="whitespace-nowrap px-3 py-2" title={r.last_active_at ?? undefined}>{ago(r.last_active_at)}</td>
                          <td className="px-3 py-2 text-right">{r.active_days}</td>
                          <td className="px-3 py-2 text-right">{r.actions}</td>
                          <td className="px-3 py-2 text-right">{r.total_items}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.top_feature ? label(r.top_feature) : "—"}</td>
                        </tr>
                        {isOpen && (
                          <tr className="border-b bg-sunken/30">
                            <td colSpan={7} className="px-4 py-4">
                              <UserDetail id={r.id} days={days} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
