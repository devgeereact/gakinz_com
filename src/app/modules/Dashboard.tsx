import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AlertTriangle, ArrowRight, Loader2, Megaphone, RefreshCw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader, StatGrid, StatTile, StatusBadge } from "@/app/components/page-kit"
import { cn } from "@/lib/utils"
import { followUpState, formatYmd, money } from "@/lib/format"
import { useAuth } from "@/store/auth.store"
import {
  leads as leadsApi,
  clients as clientsApi,
  projects as projectsApi,
  invoices as invoicesApi,
  support as supportApi,
  time as timeApi,
  announcements as announcementsApi,
  today as todayApi,
  ai,
  type Lead,
  type Project,
  type Invoice,
  type Ticket,
  type TimeEntry,
  type Announcement,
} from "@/lib/api"
import {
  applyTodayResult,
  fallbackFollowUps,
  initialTodayView,
  itemRoute,
  itemWhen,
  todayPanel,
  updatedLabel,
  type TodayPanel,
  type TodayRow,
  type TodayView,
} from "./todayModel"

// The GAkinzOS home, "Today". First the attention list from server/today.php:
// what needs the owner next, each item linking to the screen that holds it.
// Below it the totals (pipeline, delivery, cash, support, utilisation). Every
// part degrades on its own: a failed source shows as unavailable, never zero,
// and the rest of the page still works. The AI brief is optional.

function monthKey(iso: string) {
  // "2026-06-01 ..." to "2026-06"
  return iso.slice(0, 7)
}

function monthLabel(key: string) {
  const [y, m] = key.split("-")
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
  })
}

// Tiny inline trend line for a KPI tile: no axes, no tooltip, just the shape.
// Plain SVG so it can sit inside the tile's note without a block wrapper.
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2 || data.every((n) => n === data[0])) return null
  const W = 72
  const H = 20
  const max = Math.max(...data)
  const min = Math.min(...data)
  const span = max - min || 1
  const pts = data
    .map((v, i) => `${((i / (data.length - 1)) * (W - 2) + 1).toFixed(1)},${(H - 2 - ((v - min) / span) * (H - 4)).toFixed(1)}`)
    .join(" ")
  return (
    <svg aria-hidden width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0 opacity-70">
      <polyline points={pts} fill="none" stroke="hsl(var(--os-acc))" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// Initials in the prototype's soft accent avatar.
function Avatar({ name }: { name: string }) {
  const i = name.trim().split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?"
  return (
    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-acc-soft text-xs font-bold text-acc">
      {i}
    </span>
  )
}

const AXIS_TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace' }

const PIPELINE: { key: Lead["status"]; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "proposal", label: "Proposal" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
]

function startOfWeek(d: Date) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // Monday = 0
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x
}

// The last N month keys ("YYYY-MM"), oldest → newest, ending this month.
function lastNMonths(n: number): string[] {
  const now = new Date()
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }
  return out
}
// The last N Monday week-start ISO dates, oldest → newest, ending this week.
function lastNWeeks(n: number): string[] {
  const base = startOfWeek(new Date())
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i * 7)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const role = useAuth((s) => s.user?.role)
  const [todayView, setTodayView] = useState<TodayView>(initialTodayView)
  const [todayLoading, setTodayLoading] = useState(false)

  const [leads, setLeads] = useState<Lead[]>([])
  const [clientCount, setClientCount] = useState(0)
  const [projects, setProjects] = useState<Project[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [anns, setAnns] = useState<Announcement[]>([])

  const [brief, setBrief] = useState<string | null>(null)
  const [briefing, setBriefing] = useState(false)

  const loadToday = async () => {
    setTodayLoading(true)
    const res = await todayApi.get()
    setTodayView((prev) => applyTodayResult(prev, res))
    setTodayLoading(false)
  }

  const load = async () => {
    setLoading(true)
    const errs: string[] = []
    const [[l, c, p, inv, t, tm]] = await Promise.all([
      Promise.all([leadsApi.list(), clientsApi.list(), projectsApi.list(), invoicesApi.list(), supportApi.list(), timeApi.list()]),
      loadToday(),
    ])
    if (l.ok) setLeads(l.data)
    else errs.push("leads")
    if (c.ok) setClientCount(c.data.length)
    else errs.push("clients")
    if (p.ok) setProjects(p.data)
    else errs.push("projects")
    if (inv.ok) setInvoices(inv.data)
    else errs.push("invoices")
    if (t.ok) setTickets(t.data)
    else errs.push("support")
    if (tm.ok) setEntries(tm.data)
    else errs.push("time")
    setErrors(errs)
    setLoading(false)
    announcementsApi.list().then((r) => r.ok && setAnns(r.data.slice(0, 3)))
  }

  useEffect(() => {
    load()
    // Load once on open; Refresh and Retry call load and loadToday again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stats = useMemo(() => {
    const openLeads = leads.filter((x) => x.status !== "won" && x.status !== "lost").length
    const activeProjects = projects.filter((x) => x.status !== "launched").length
    const paid = invoices.filter((x) => x.status === "paid").reduce((s, x) => s + Number(x.total), 0)
    const outstanding = invoices
      .filter((x) => x.status === "sent")
      .reduce((s, x) => s + Number(x.total), 0)
    const overdue = invoices.filter((x) => x.overdue).length
    const openTickets = tickets.filter((x) => x.status !== "resolved").length

    const weekStart = startOfWeek(new Date())
    const weekMinutes = entries
      .filter((e) => new Date(e.entry_date.replace(" ", "T")) >= weekStart)
      .reduce((s, e) => s + e.minutes, 0)
    const billableMinutes = entries
      .filter((e) => e.billable && new Date(e.entry_date.replace(" ", "T")) >= weekStart)
      .reduce((s, e) => s + e.minutes, 0)

    return {
      openLeads,
      activeProjects,
      paid,
      outstanding,
      overdue,
      openTickets,
      weekHours: weekMinutes / 60,
      billableHours: billableMinutes / 60,
    }
  }, [leads, projects, invoices, tickets, entries])

  const pipeline = useMemo(() => {
    const counts = Object.fromEntries(PIPELINE.map((s) => [s.key, 0])) as Record<Lead["status"], number>
    for (const l of leads) counts[l.status] = (counts[l.status] ?? 0) + 1
    const max = Math.max(1, ...Object.values(counts))
    return PIPELINE.map((s) => ({ ...s, count: counts[s.key], pct: (counts[s.key] / max) * 100 }))
  }, [leads])

  // Revenue trend: paid invoices grouped by month (last 6 months present in data).
  const revenueSeries = useMemo(() => {
    const byMonth = new Map<string, number>()
    for (const inv of invoices) {
      if (inv.status !== "paid") continue
      const key = monthKey(inv.paid_at ?? inv.issued_at)
      byMonth.set(key, (byMonth.get(key) ?? 0) + Number(inv.total))
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, total]) => ({ month: monthLabel(key), total }))
  }, [invoices])

  const recentLeads = useMemo(
    () =>
      [...leads]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5),
    [leads],
  )

  // Per-KPI trend series for the card sparklines.
  const spark = useMemo(() => {
    const months = lastNMonths(6)
    const countByMonth = (dates: string[]) =>
      months.map((m) => dates.filter((d) => d && monthKey(d) === m).length)
    const weeks = lastNWeeks(6)
    const billable = weeks.map((ws) =>
      entries
        .filter((e) => e.billable && startOfWeek(new Date(e.entry_date.replace(" ", "T"))).toISOString().slice(0, 10) === ws)
        .reduce((s, e) => s + e.minutes, 0),
    )
    return {
      leads: countByMonth(leads.map((l) => l.created_at)),
      projects: countByMonth(projects.map((p) => p.created_at)),
      tickets: countByMonth(tickets.map((t) => t.created_at)),
      paid: months.map((m) =>
        invoices.filter((i) => i.status === "paid" && monthKey(i.paid_at ?? i.issued_at) === m).reduce((s, i) => s + Number(i.total), 0),
      ),
      outstanding: months.map((m) =>
        invoices.filter((i) => i.status === "sent" && monthKey(i.issued_at) === m).reduce((s, i) => s + Number(i.total), 0),
      ),
      billable,
    }
  }, [leads, projects, tickets, invoices, entries])

  // A source that failed to load is shown as unavailable, never as zero, so a
  // failed invoices request cannot read as "£0 outstanding, all on time" (K-031).
  const down = (source: string) => errors.includes(source)
  const NA = "—"
  const NA_HINT = "Unavailable, refresh to retry"

  const generateBrief = async () => {
    setBriefing(true)
    setBrief(null)
    const snapshot = {
      open_leads: stats.openLeads,
      pipeline: pipeline.map((p) => ({ stage: p.label, count: p.count })),
      active_projects: stats.activeProjects,
      clients: clientCount,
      revenue_paid: stats.paid,
      outstanding: stats.outstanding,
      overdue_invoices: stats.overdue,
      open_tickets: stats.openTickets,
      billable_hours_this_week: Math.round(stats.billableHours),
    }
    const res = await ai.run(
      "daily-brief",
      JSON.stringify(snapshot),
      "You are the operations chief of staff for GAkinz, a creative/dev studio. Given a JSON snapshot of the business, write a crisp 3-4 sentence morning brief: what looks healthy, what needs attention today, and one concrete next action. Plain text, no markdown headings.",
    )
    setBriefing(false)
    if (res.ok) setBrief(res.data.text.trim())
    else setBrief(`Couldn't generate a brief (${res.error}).`)
  }

  // The last successful refresh of the attention list, on the server's clock.
  const updated = updatedLabel(todayView)
  const attention = todayPanel(todayView, role)

  const header = (
    <PageHeader
      title="Today"
      subtitle={<>What needs you next, then the studio totals.{updated && <> Updated {updated}.</>}</>}
      actions={
        <>
          <Button
            onClick={generateBrief}
            disabled={loading || briefing || errors.length > 0}
            title={errors.length > 0 ? "Refresh until every figure has loaded before asking for a brief." : undefined}
          >
            {briefing ? <Loader2 className="animate-spin" /> : <Sparkles />}
            AI brief
          </Button>
          <Button variant="outline" onClick={load} disabled={loading || todayLoading}>
            <RefreshCw className={cn((loading || todayLoading) && "animate-spin")} /> Refresh
          </Button>
        </>
      }
    />
  )

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading your overview">
        {header}
        <StatGrid className="grid-cols-1 min-[901px]:grid-cols-3 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="grid gap-2.5 rounded-2xl border bg-card px-[18px] py-4">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-7 w-2/3" />
            </div>
          ))}
        </StatGrid>
        <div className="rounded-2xl border bg-card p-[18px]">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-3 flex-1" style={{ maxWidth: `${60 + (i % 3) * 12}%` }} />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const kpis = [
    {
      label: "Open leads",
      value: down("leads") ? NA : String(stats.openLeads),
      hint: down("leads") ? NA_HINT : "In the pipeline",
      to: "/app/leads",
      series: down("leads") ? undefined : spark.leads,
    },
    {
      label: "Active projects",
      value: down("projects") ? NA : String(stats.activeProjects),
      hint: down("projects") ? NA_HINT : "Not yet launched",
      to: "/app/projects",
      series: down("projects") ? undefined : spark.projects,
    },
    {
      label: "Cash received",
      value: down("invoices") ? NA : money(stats.paid),
      hint: down("invoices") ? NA_HINT : "Paid invoices, all time",
      to: "/app/invoicing",
      series: down("invoices") ? undefined : spark.paid,
    },
    {
      label: "Invoiced, unpaid",
      value: down("invoices") ? NA : money(stats.outstanding),
      hint: down("invoices") ? NA_HINT : stats.overdue ? `Sent, not paid. ${stats.overdue} overdue` : "Sent, not paid. None overdue",
      tone: !down("invoices") && stats.overdue ? ("down" as const) : undefined,
      to: "/app/invoicing",
      series: down("invoices") ? undefined : spark.outstanding,
    },
    {
      label: "Open tickets",
      value: down("support") ? NA : String(stats.openTickets),
      hint: down("support") ? NA_HINT : "Needs a reply",
      to: "/app/support",
      series: down("support") ? undefined : spark.tickets,
    },
    {
      label: "Billable (wk)",
      value: down("time") ? NA : `${stats.billableHours.toFixed(1)}h`,
      hint: down("time") ? NA_HINT : `${stats.weekHours.toFixed(1)}h logged`,
      to: "/app/time",
      series: down("time") ? undefined : spark.billable,
    },
  ]

  return (
    <div>
      {header}

      {attention.kind === "follow_ups" ? (
        <FollowUpsCard leads={leads} down={down("leads")} />
      ) : (
        <AttentionList panel={attention} error={todayView.error} retrying={todayLoading} onRetry={loadToday} />
      )}

      {errors.length > 0 && (
        <div role="alert" className="mb-4 flex flex-wrap items-start gap-3.5 rounded-2xl border border-bad/30 bg-bad-soft p-[18px] text-foreground">
          <AlertTriangle aria-hidden className="mt-0.5 size-[18px] shrink-0 text-bad" />
          <div className="min-w-[min(100%,200px)] flex-1">
            <p className="font-semibold">Some totals could not be loaded ({errors.join(", ")}).</p>
            <p className="mt-1 text-muted-foreground">They show as “{NA}” until a refresh succeeds. Nothing was changed.</p>
          </div>
          <Button variant="outline" onClick={load}>
            <RefreshCw /> Try again
          </Button>
        </div>
      )}

      {anns.length > 0 && (
        <div className="mb-4 grid gap-2">
          {anns.map((a) => (
            <div
              key={a.id}
              className={cn("flex items-start gap-3 rounded-2xl p-[18px]", a.level === "warning" ? "bg-warn-soft" : "bg-acc-soft")}
            >
              <Megaphone aria-hidden className={cn("mt-0.5 size-[18px] shrink-0", a.level === "warning" ? "text-warn" : "text-acc")} />
              <p className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                <b className="font-semibold">{a.title}</b>
                {a.body ? <span className="text-muted-foreground"> {a.body}</span> : null}
              </p>
            </div>
          ))}
        </div>
      )}

      {brief && (
        <div role="status" aria-live="polite" className="mb-4 flex gap-3 rounded-2xl border bg-card p-[18px]">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-acc-soft text-acc">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[.08em] text-muted-foreground">Brief for today</p>
            <p className="mt-1 leading-relaxed">{brief}</p>
            <p className="mt-2 text-[13px] text-muted-foreground">Written from the figures on this screen. Check before acting on it.</p>
          </div>
        </div>
      )}

      <StatGrid className="grid-cols-1 min-[901px]:grid-cols-3 xl:grid-cols-3">
        {kpis.map((k) => (
          <StatTile
            key={k.label}
            label={k.label}
            value={k.value}
            tone={k.tone}
            onClick={() => navigate(k.to)}
            note={
              <span className="flex items-end justify-between gap-3">
                <span className="min-w-0">{k.hint}</span>
                {k.series && <Sparkline data={k.series} />}
              </span>
            }
          />
        ))}
      </StatGrid>

      <div className="mb-4 grid gap-4 min-[1181px]:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex-row items-center gap-2.5 space-y-0">
            <CardTitle className="min-w-0">Cash received</CardTitle>
            <span className="ml-auto whitespace-nowrap rounded-full border border-dashed border-line-strong px-[7px] py-0.5 font-mono text-[10px] uppercase tracking-[.08em] text-muted-foreground">
              £ by month paid, latest 6
            </span>
          </CardHeader>
          <CardContent>
            {down("invoices") ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Invoices could not be loaded. Refresh to try again.</p>
            ) : revenueSeries.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No paid invoices yet. Settled invoices will chart here.</p>
            ) : (
              <div
                role="img"
                aria-label={`Cash received from paid invoices over the last ${revenueSeries.length} months, from ${revenueSeries[0]?.month} to ${revenueSeries[revenueSeries.length - 1]?.month}.`}
              >
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenueSeries} margin={{ left: -8, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--os-acc))" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="hsl(var(--os-acc))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS_TICK} />
                    <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={(v) => money(Number(v))} width={64} />
                    <Tooltip
                      formatter={(v) => money(Number(v))}
                      contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--os-acc))"
                      strokeWidth={2.5}
                      fill="url(#rev)"
                      dot={false}
                      activeDot={{ r: 4.5, fill: "hsl(var(--os-acc))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2.5 space-y-0">
            <CardTitle className="min-w-0">Lead pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {down("leads") ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Leads could not be loaded. Refresh to try again.</p>
            ) : (
              <div role="img" aria-label={`Bar chart: ${pipeline.map((p) => `${p.label} ${p.count}`).join(", ")}`}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={pipeline} margin={{ left: -24, right: 4, top: 8 }}>
                    <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} interval={0} />
                    <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} allowDecimals={false} width={48} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false}>
                      {pipeline.map((p, i) => (
                        <Cell
                          key={p.key}
                          fill={i === pipeline.length - 1 ? "hsl(var(--os-acc))" : "color-mix(in srgb, hsl(var(--os-acc)) 35%, hsl(var(--secondary)))"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 min-[901px]:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2.5 space-y-0">
            <CardTitle className="min-w-0">Recent leads</CardTitle>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => navigate("/app/leads")}>
              All <ArrowRight />
            </Button>
          </CardHeader>
          <CardContent>
            {down("leads") ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Leads could not be loaded. Refresh to try again.</p>
            ) : recentLeads.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No leads yet. The public contact form feeds this list.</p>
            ) : (
              <ul className="divide-y">
                {recentLeads.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => navigate("/app/leads")}
                      aria-label={`Lead ${l.name}${l.company ? `, ${l.company}` : ""}, status ${l.status}. Open leads.`}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 text-left hover:text-acc"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={l.name} />
                        <span className="min-w-0">
                          <b className="block font-semibold [overflow-wrap:anywhere]">{l.name}</b>
                          <small className="block text-[12.5px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">
                            {l.company || l.email}
                            {l.project_type ? ` · ${l.project_type}` : ""}
                          </small>
                        </span>
                      </span>
                      <StatusBadge status={l.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2.5 space-y-0">
            <CardTitle className="min-w-0">Studio snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2.5">
              <Snapshot label="Clients" value={down("clients") ? NA : String(clientCount)} to="/app/clients" />
              <Snapshot
                label="Projects launched"
                value={down("projects") ? NA : String(projects.filter((p) => p.status === "launched").length)}
                to="/app/projects"
              />
              <Snapshot label="Active projects" value={down("projects") ? NA : String(stats.activeProjects)} to="/app/projects" />
              <Snapshot
                label="Overdue invoices"
                value={down("invoices") ? NA : String(stats.overdue)}
                to="/app/invoicing"
                bad={!down("invoices") && stats.overdue > 0}
              />
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Snapshot({ label, value, to, bad }: { label: string; value: string; to: string; bad?: boolean }) {
  const navigate = useNavigate()
  return (
    <>
      <dt className="text-[13.5px] text-muted-foreground">{label}</dt>
      <dd className="m-0 text-right">
        <button
          type="button"
          onClick={() => navigate(to)}
          aria-label={`${label}: ${value}`}
          className={cn("font-mono tabular-nums hover:text-acc hover:underline", bad && "text-bad")}
        >
          {value}
        </button>
      </dd>
    </>
  )
}

// The fallback for a server without today.php (it is uploaded by hand, so
// dist/ can go live first): the client-side "Follow-ups due" card the
// attention list replaced, built from the enquiries list already loaded for
// the totals. Shown only while today.php is not available; never an error.
function FollowUpsCard({ leads, down }: { leads: Lead[]; down: boolean }) {
  const navigate = useNavigate()
  const followUps = useMemo(() => fallbackFollowUps(leads), [leads])
  return (
    <Card className="mb-4">
      <CardHeader className="flex-row items-center gap-2.5 space-y-0">
        <CardTitle className="min-w-0">Follow-ups due</CardTitle>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{down || !followUps.ready ? "—" : followUps.count}</span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => navigate("/app/leads?due=1")}>
          All <ArrowRight />
        </Button>
      </CardHeader>
      <CardContent>
        {down ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Follow-ups could not be loaded. Refresh to try again.</p>
        ) : !followUps.ready ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Follow-ups are not available until the server database update has run.</p>
        ) : followUps.top.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nothing due. No enquiry has a next action today or earlier.</p>
        ) : (
          <ul className="divide-y">
            {followUps.top.map((l) => {
              const overdue = followUpState(l, followUps.today) === "overdue"
              const when = l.next_action_at ? formatYmd(l.next_action_at) : ""
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => navigate("/app/leads?due=1")}
                    aria-label={`Follow up ${l.name}${l.company ? `, ${l.company}` : ""}, ${overdue ? `overdue since ${when}` : "due today"}. Open enquiries.`}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 text-left hover:text-acc"
                  >
                    <span className="min-w-0">
                      <b className="block font-semibold [overflow-wrap:anywhere]">{l.company || l.name}</b>
                      <span className="block text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                        {l.next_action_note || (l.company ? l.name : l.email)}
                      </span>
                    </span>
                    <StatusBadge status={overdue ? "overdue" : "due today"}>{overdue ? `Overdue, ${when}` : "Due today"}</StatusBadge>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// The attention list. One block per section the server sent (or, after a
// failed load, per section this role should get), each in one of three states:
// items that link to their screen, "Nothing due", or "Unavailable" with Retry.
function AttentionList({
  panel,
  error,
  retrying,
  onRetry,
}: {
  panel: TodayPanel
  error: string | null
  retrying: boolean
  onRetry: () => void
}) {
  if (panel.kind === "none" || panel.kind === "follow_ups") return null
  if (panel.kind === "failed") {
    return (
      <div role="alert" className="mb-4 flex flex-wrap items-start gap-3.5 rounded-2xl border border-bad/30 bg-bad-soft p-[18px] text-foreground">
        <AlertTriangle aria-hidden className="mt-0.5 size-[18px] shrink-0 text-bad" />
        <div className="min-w-[min(100%,200px)] flex-1">
          <p className="font-semibold">The attention list could not be loaded.</p>
          <p className="mt-1 text-muted-foreground [overflow-wrap:anywhere]">{panel.error}</p>
        </div>
        <Button variant="outline" onClick={onRetry} disabled={retrying}>
          <RefreshCw className={cn(retrying && "animate-spin")} /> Retry
        </Button>
      </div>
    )
  }
  const { rows } = panel
  return (
    <section aria-labelledby="today-attention" className="mb-4 rounded-2xl border bg-card p-[18px]">
      <h2 id="today-attention" className="text-base font-semibold">
        Needs attention
      </h2>
      {error && (
        <p role="alert" className="mt-1 text-[13.5px] text-muted-foreground">
          The attention list could not be loaded. {error}
        </p>
      )}
      <div className="mt-3 grid gap-x-6 gap-y-5 min-[901px]:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <AttentionSection key={row.key} row={row} retrying={retrying} onRetry={onRetry} />
        ))}
      </div>
    </section>
  )
}

function AttentionSection({ row, retrying, onRetry }: { row: TodayRow; retrying: boolean; onRetry: () => void }) {
  const headingId = `today-${row.key}`
  return (
    <div aria-labelledby={headingId} role="group" className="min-w-0">
      <div className="flex items-baseline gap-2 border-b pb-2">
        <h3 id={headingId} className="min-w-0 text-[13.5px] font-semibold">
          {row.label}
        </h3>
        <span className={cn("ml-auto font-mono text-xs tabular-nums", row.state === "items" ? "text-foreground" : "text-muted-foreground")}>
          {row.state === "items" ? row.count : row.state === "empty" ? 0 : null}
        </span>
      </div>
      {row.state === "unavailable" ? (
        <div className="flex flex-wrap items-center gap-3 py-3">
          <p className="text-[13.5px] text-bad">Unavailable</p>
          <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
            <RefreshCw className={cn(retrying && "animate-spin")} /> Retry
          </Button>
        </div>
      ) : row.state === "empty" ? (
        <p className="py-3 text-[13.5px] text-muted-foreground">Nothing due</p>
      ) : (
        <ul className="divide-y">
          {row.items.map((item) => {
            const when = itemWhen(item.at)
            return (
              <li key={`${item.type}-${item.id}`}>
                <Link
                  to={itemRoute(item)}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-2.5 hover:text-acc focus-visible:text-acc"
                >
                  <span className="min-w-0">
                    <b className="block font-semibold [overflow-wrap:anywhere]">{item.title}</b>
                    <span className="block text-[12.5px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">{item.reason}</span>
                  </span>
                  {when && <span className="whitespace-nowrap font-mono text-[11.5px] tabular-nums text-muted-foreground">{when}</span>}
                </Link>
              </li>
            )
          })}
          {row.more > 0 && (
            <li>
              <Link to={itemRoute(row.items[row.items.length - 1])} className="block py-2.5 text-[13px] text-muted-foreground hover:text-acc">
                And {row.more} more
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
