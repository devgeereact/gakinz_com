import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowRight,
  Banknote,
  Clock,
  FolderKanban,
  Inbox,
  Loader2,
  LifeBuoy,
  RefreshCw,
  Sparkles,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  leads as leadsApi,
  clients as clientsApi,
  projects as projectsApi,
  invoices as invoicesApi,
  support as supportApi,
  time as timeApi,
  ai,
  type Lead,
  type Project,
  type Invoice,
  type Ticket,
  type TimeEntry,
} from "@/lib/api"

// The GAkinzOS home. Aggregates the live API into a single operational
// overview — pipeline, delivery, cash, support, utilisation — so staff land on
// real numbers, not demo content. Every section degrades on its own: a failed
// endpoint shows a quiet error in its card and the rest of the page still works.

function money(n: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

function monthKey(iso: string) {
  // "2026-06-01 ..." → "2026-06"
  return iso.slice(0, 7)
}

function monthLabel(key: string) {
  const [y, m] = key.split("-")
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
  })
}

type KpiProps = {
  label: string
  value: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  to: string
  accent?: string
}

function Kpi({ label, value, hint, icon: Icon, to, accent }: KpiProps) {
  const navigate = useNavigate()
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => navigate(to)}
      onKeyDown={(e) => e.key === "Enter" && navigate(to)}
      className="cursor-pointer transition-colors hover:border-primary/40"
    >
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-2xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={`rounded-lg p-2 ${accent ?? "bg-primary/10 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  )
}

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

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])

  const [leads, setLeads] = useState<Lead[]>([])
  const [clientCount, setClientCount] = useState(0)
  const [projects, setProjects] = useState<Project[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])

  const [brief, setBrief] = useState<string | null>(null)
  const [briefing, setBriefing] = useState(false)

  const load = async () => {
    setLoading(true)
    const errs: string[] = []
    const [l, c, p, inv, t, tm] = await Promise.all([
      leadsApi.list(),
      clientsApi.list(),
      projectsApi.list(),
      invoicesApi.list(),
      supportApi.list(),
      timeApi.list(),
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
  }

  useEffect(() => {
    load()
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your overview…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            The whole studio at a glance — live from GAkinzOS.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={generateBrief} disabled={briefing}>
            {briefing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            AI brief
          </Button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Couldn’t reach: {errors.join(", ")}. Showing what loaded. If you’re running locally,
            the live API may not be deployed yet.
          </span>
        </div>
      )}

      {brief && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex gap-3 p-5">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed">{brief}</p>
          </CardContent>
        </Card>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label="Open leads"
          value={String(stats.openLeads)}
          hint="In the pipeline"
          icon={Inbox}
          to="/app/leads"
        />
        <Kpi
          label="Active projects"
          value={String(stats.activeProjects)}
          hint="Not yet launched"
          icon={FolderKanban}
          to="/app/projects"
        />
        <Kpi
          label="Revenue paid"
          value={money(stats.paid)}
          hint="All settled invoices"
          icon={Banknote}
          to="/app/invoicing"
          accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <Kpi
          label="Outstanding"
          value={money(stats.outstanding)}
          hint={stats.overdue ? `${stats.overdue} overdue` : "All on time"}
          icon={Banknote}
          to="/app/invoicing"
          accent={
            stats.overdue
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-primary/10 text-primary"
          }
        />
        <Kpi
          label="Open tickets"
          value={String(stats.openTickets)}
          hint="Needs a reply"
          icon={LifeBuoy}
          to="/app/support"
        />
        <Kpi
          label="Billable (wk)"
          value={`${stats.billableHours.toFixed(1)}h`}
          hint={`${stats.weekHours.toFixed(1)}h logged`}
          icon={Clock}
          to="/app/time"
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Revenue trend */}
        <Card className="col-span-12 xl:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">Revenue (paid)</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueSeries.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No paid invoices yet. Settled invoices will chart here.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueSeries} margin={{ left: -10, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(v) => money(Number(v))}
                    width={70}
                  />
                  <Tooltip
                    formatter={(v) => money(Number(v))}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#rev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pipeline */}
        <Card className="col-span-12 xl:col-span-5">
          <CardHeader>
            <CardTitle className="text-base">Lead pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pipeline.map((s) => (
              <div key={s.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-medium">{s.count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      s.key === "won"
                        ? "bg-emerald-500"
                        : s.key === "lost"
                          ? "bg-muted-foreground/40"
                          : "bg-primary"
                    }`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent leads */}
        <Card className="col-span-12 xl:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent leads</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/app/leads")}>
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No leads yet. The public contact form feeds this list.
              </p>
            ) : (
              <ul className="divide-y">
                {recentLeads.map((l) => (
                  <li
                    key={l.id}
                    className="flex cursor-pointer items-center justify-between gap-3 py-2.5 hover:text-primary"
                    onClick={() => navigate("/app/leads")}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {l.company || l.email}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                      {l.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Snapshot tiles */}
        <Card className="col-span-12 xl:col-span-5">
          <CardHeader>
            <CardTitle className="text-base">Studio snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Snapshot label="Clients" value={String(clientCount)} to="/app/clients" />
            <Snapshot
              label="Projects launched"
              value={String(projects.filter((p) => p.status === "launched").length)}
              to="/app/projects"
            />
            <Snapshot
              label="Proposals out"
              value={money(stats.outstanding)}
              to="/app/proposals"
            />
            <Snapshot
              label="Overdue invoices"
              value={String(stats.overdue)}
              to="/app/invoicing"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Snapshot({ label, value, to }: { label: string; value: string; to: string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className="rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/40"
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </button>
  )
}
