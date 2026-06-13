import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Loader2, RefreshCw, TrendingUp, Target, Receipt, Clock, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { downloadCsv, downloadXlsx } from "@/lib/csv"
import {
  leads as leadsApi,
  invoices as invoicesApi,
  projects as projectsApi,
  time as timeApi,
  clients as clientsApi,
  type Lead,
  type Invoice,
  type Project,
  type TimeEntry,
  type Client,
} from "@/lib/api"

// Analytics & Reporting (§6 Analytics). Management view: revenue, pipeline
// conversion, project mix, utilisation — all derived from the same live API the
// operational modules write to. No separate analytics store; numbers can never
// drift from the source of truth.

function money(n: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

function monthKey(iso: string) {
  return iso.slice(0, 7)
}
function monthLabel(key: string) {
  const [y, m] = key.split("-")
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", { month: "short" })
}

const STATUS_COLORS: Record<Project["status"], string> = {
  planning: "#a48fff",
  in_progress: "#6e56cf",
  on_hold: "#f59e0b",
  launched: "#10b981",
}
const STATUS_LABEL: Record<Project["status"], string> = {
  planning: "Planning",
  in_progress: "In progress",
  on_hold: "On hold",
  launched: "Launched",
}

function Stat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="gk-app-card">
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-2xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className="gk-app-chip h-10 w-10">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  )
}

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [clientList, setClientList] = useState<Client[]>([])

  const load = async () => {
    setLoading(true)
    const errs: string[] = []
    const [l, inv, p, tm, cl] = await Promise.all([
      leadsApi.list(),
      invoicesApi.list(),
      projectsApi.list(),
      timeApi.list(),
      clientsApi.list(),
    ])
    if (l.ok) setLeads(l.data)
    else errs.push("leads")
    if (inv.ok) setInvoices(inv.data)
    else errs.push("invoices")
    if (p.ok) setProjects(p.data)
    else errs.push("projects")
    if (tm.ok) setEntries(tm.data)
    else errs.push("time")
    if (cl.ok) setClientList(cl.data)
    else errs.push("clients")
    setErrors(errs)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const kpis = useMemo(() => {
    const decided = leads.filter((x) => x.status === "won" || x.status === "lost")
    const won = leads.filter((x) => x.status === "won").length
    const winRate = decided.length ? (won / decided.length) * 100 : 0

    const paidInvoices = invoices.filter((x) => x.status === "paid")
    const paid = paidInvoices.reduce((s, x) => s + Number(x.total), 0)
    const avgInvoice = paidInvoices.length ? paid / paidInvoices.length : 0

    const totalMin = entries.reduce((s, e) => s + e.minutes, 0)
    const billableMin = entries.filter((e) => e.billable).reduce((s, e) => s + e.minutes, 0)
    const utilisation = totalMin ? (billableMin / totalMin) * 100 : 0

    return {
      paid,
      winRate,
      avgInvoice,
      utilisation,
      billableHours: billableMin / 60,
      totalHours: totalMin / 60,
      wonCount: won,
      decidedCount: decided.length,
    }
  }, [leads, invoices, entries])

  // Revenue: paid vs outstanding by month.
  const revenue = useMemo(() => {
    const m = new Map<string, { paid: number; outstanding: number }>()
    for (const inv of invoices) {
      const key = monthKey(inv.status === "paid" ? (inv.paid_at ?? inv.issued_at) : inv.issued_at)
      const row = m.get(key) ?? { paid: 0, outstanding: 0 }
      if (inv.status === "paid") row.paid += Number(inv.total)
      else if (inv.status === "sent") row.outstanding += Number(inv.total)
      m.set(key, row)
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, v]) => ({ month: monthLabel(key), ...v }))
  }, [invoices])

  const projectMix = useMemo(() => {
    const m = new Map<Project["status"], number>()
    for (const p of projects) m.set(p.status, (m.get(p.status) ?? 0) + 1)
    return Array.from(m.entries()).map(([status, count]) => ({
      status,
      label: STATUS_LABEL[status],
      count,
      color: STATUS_COLORS[status],
    }))
  }, [projects])

  // Utilisation per ISO week (billable %), last 8 weeks present in data.
  const utilByWeek = useMemo(() => {
    const m = new Map<string, { billable: number; total: number }>()
    for (const e of entries) {
      const d = new Date(e.entry_date.replace(" ", "T"))
      const day = (d.getDay() + 6) % 7
      const monday = new Date(d)
      monday.setDate(d.getDate() - day)
      const key = monday.toISOString().slice(0, 10)
      const row = m.get(key) ?? { billable: 0, total: 0 }
      row.total += e.minutes
      if (e.billable) row.billable += e.minutes
      m.set(key, row)
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([key, v]) => ({
        week: new Date(key).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        pct: v.total ? Math.round((v.billable / v.total) * 100) : 0,
      }))
  }, [entries])

  // ── Named, exportable reports ─────────────────────────────────────────────
  // Client lifetime value: paid + outstanding revenue per client (inc VAT).
  const clientLtv = useMemo(() => {
    const m = new Map<number, { client: string; paid: number; outstanding: number; invoices: number }>()
    for (const inv of invoices) {
      if (inv.client_id == null) continue
      const row = m.get(inv.client_id) ?? { client: inv.client_company ?? `#${inv.client_id}`, paid: 0, outstanding: 0, invoices: 0 }
      row.invoices += 1
      if (inv.status === "paid") row.paid += Number(inv.total)
      else row.outstanding += Number(inv.total)
      m.set(inv.client_id, row)
    }
    return Array.from(m.values()).sort((a, b) => b.paid - a.paid)
  }, [invoices])

  // Recurring revenue: paid revenue for clients tagged as retainers (care plans).
  const recurring = useMemo(() => {
    const paidByCompany = new Map<string, number>()
    for (const inv of invoices) {
      if (inv.status !== "paid" || !inv.client_company) continue
      paidByCompany.set(inv.client_company, (paidByCompany.get(inv.client_company) ?? 0) + Number(inv.total))
    }
    return clientList
      .filter((c) => c.tag === "retainer")
      .map((c) => ({ client: c.company, contact: c.contact_name ?? "", paid: paidByCompany.get(c.company) ?? 0 }))
      .sort((a, b) => b.paid - a.paid)
  }, [clientList, invoices])

  // Revenue by month (pipeline/forecast): paid vs outstanding.
  const revenueRows = useMemo(() => revenue.map((r) => ({ month: r.month, paid: r.paid, outstanding: r.outstanding })), [revenue])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Crunching the numbers…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Analytics &amp; Reporting</h1>
          <p className="text-sm text-muted-foreground">
            Revenue, pipeline conversion, delivery mix and utilisation.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
          Couldn’t reach: {errors.join(", ")}. Showing what loaded.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Revenue paid" value={money(kpis.paid)} icon={TrendingUp} hint="All settled invoices" />
        <Stat
          label="Win rate"
          value={`${kpis.winRate.toFixed(0)}%`}
          icon={Target}
          hint={`${kpis.wonCount}/${kpis.decidedCount} decided leads`}
        />
        <Stat label="Avg invoice" value={money(kpis.avgInvoice)} icon={Receipt} hint="Per settled invoice" />
        <Stat
          label="Utilisation"
          value={`${kpis.utilisation.toFixed(0)}%`}
          icon={Clock}
          hint={`${kpis.billableHours.toFixed(0)}h billable of ${kpis.totalHours.toFixed(0)}h`}
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-12 xl:col-span-8">
          <CardHeader>
            <CardTitle className="text-base">Revenue — paid vs outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            {revenue.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No invoice data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenue} margin={{ left: -10, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={70}
                    tickFormatter={(v) => money(Number(v))}
                  />
                  <Tooltip
                    formatter={(v: number, n) => [money(v), n === "paid" ? "Paid" : "Outstanding"]}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                    }}
                  />
                  <Bar dataKey="paid" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="outstanding" stackId="a" fill="#6e56cf" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-12 xl:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Project mix</CardTitle>
          </CardHeader>
          <CardContent>
            {projectMix.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={projectMix}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {projectMix.map((s) => (
                        <Cell key={s.status} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--popover))",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="mt-2 space-y-1">
                  {projectMix.map((s) => (
                    <li key={s.status} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                        {s.label}
                      </span>
                      <span className="font-medium">{s.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-12">
          <CardHeader>
            <CardTitle className="text-base">Billable utilisation by week</CardTitle>
          </CardHeader>
          <CardContent>
            {utilByWeek.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No time entries yet. Logged time will chart here.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={utilByWeek} margin={{ left: -10, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={40}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, "Billable"]}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                    }}
                  />
                  <Bar dataKey="pct" fill="#6e56cf" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Named, exportable reports */}
      <div>
        <h2 className="gk-app-grad text-lg font-semibold tracking-tight">Reports</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Export-ready tables (CSV / XLSX). Project profitability is deferred until per-hour cost
          rates are configured.
        </p>
        <div className="grid grid-cols-12 gap-6">
          <ReportCard
            className="col-span-12 xl:col-span-6"
            title="Client lifetime value"
            filename="gakinz-client-ltv"
            head={["client", "paid", "outstanding", "invoices"]}
            labels={["Client", "Paid", "Outstanding", "Invoices"]}
            money={["paid", "outstanding"]}
            rows={clientLtv as unknown as Record<string, unknown>[]}
          />
          <ReportCard
            className="col-span-12 xl:col-span-6"
            title="Recurring revenue (care plans)"
            filename="gakinz-recurring-revenue"
            head={["client", "contact", "paid"]}
            labels={["Client", "Contact", "Paid"]}
            money={["paid"]}
            rows={recurring as unknown as Record<string, unknown>[]}
          />
          <ReportCard
            className="col-span-12"
            title="Revenue by month (paid vs outstanding)"
            filename="gakinz-revenue-by-month"
            head={["month", "paid", "outstanding"]}
            labels={["Month", "Paid", "Outstanding"]}
            money={["paid", "outstanding"]}
            rows={revenueRows as unknown as Record<string, unknown>[]}
          />
        </div>
      </div>
    </div>
  )
}

function ReportCard({
  title,
  filename,
  head,
  labels,
  money: moneyCols,
  rows,
  className,
}: {
  title: string
  filename: string
  head: string[]
  labels: string[]
  money: string[]
  rows: Record<string, unknown>[]
  className?: string
}) {
  const isMoney = (k: string) => moneyCols.includes(k)
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!rows.length} onClick={() => downloadCsv(`${filename}.csv`, head, rows)}>
            <Download className="mr-1 h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" disabled={!rows.length} onClick={() => downloadXlsx(`${filename}.xlsx`, head, rows, title.slice(0, 31))}>
            <Download className="mr-1 h-3.5 w-3.5" /> XLSX
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {labels.map((l, i) => (
                    <th key={l} className={i === 0 ? "py-2" : "py-2 text-right"}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} className="border-b border-border/50">
                    {head.map((k, i) => (
                      <td key={k} className={i === 0 ? "py-1.5 font-medium" : "py-1.5 text-right"}>
                        {isMoney(k) ? money(Number(r[k] ?? 0)) : String(r[k] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
