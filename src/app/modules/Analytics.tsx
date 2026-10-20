import { useMemo, useState } from "react"
import { useLoader } from "@/hooks/use-load"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AlertCircle, RefreshCw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader, StatGrid, StatTile } from "@/app/components/page-kit"
import { downloadCsv, downloadXlsx } from "@/lib/csv"
import { money } from "@/lib/format"
import {
  leads as leadsApi,
  invoices as invoicesApi,
  projects as projectsApi,
  time as timeApi,
  clients as clientsApi,
  reports as reportsApi,
  type Lead,
  type Invoice,
  type Project,
  type TimeEntry,
  type Client,
  type ProfitabilityRow,
} from "@/lib/api"

// Analytics & Reporting (§6 Analytics). Management view: revenue, pipeline
// conversion, project mix, utilisation — all derived from the same live API the
// operational modules write to. No separate analytics store; numbers can never
// drift from the source of truth.

function monthKey(iso: string) {
  return iso.slice(0, 7)
}
function monthLabel(key: string) {
  const [y, m] = key.split("-")
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", { month: "short" })
}

const STATUS_COLORS: Record<Project["status"], string> = {
  planning: "#A8C090",
  in_progress: "#5A6B4A",
  on_hold: "#c08a3e",
  launched: "#3E7D52",
}
const STATUS_LABEL: Record<Project["status"], string> = {
  planning: "Planning",
  in_progress: "In progress",
  on_hold: "On hold",
  launched: "Launched",
}

export default function Analytics() {
  const [errors, setErrors] = useState<string[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [clientList, setClientList] = useState<Client[]>([])
  const [profit, setProfit] = useState<ProfitabilityRow[]>([])

  // Loads on open; Refresh and Retry load again. A source that fails keeps
  // what it showed before and is named in the warning.
  const { loading, reload: load } = useLoader(
    () =>
      Promise.all([
        leadsApi.list(),
        invoicesApi.list(),
        projectsApi.list(),
        timeApi.list(),
        clientsApi.list(),
        reportsApi.profitability(),
      ]),
    ([l, inv, p, tm, cl, pr]) => {
      const errs: string[] = []
      if (pr.ok) setProfit(pr.data)
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
    },
  )

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

  const reportsList: { key: string; title: string; filename: string; head: string[]; labels: string[]; money: string[]; rows: Record<string, unknown>[] }[] = [
    {
      key: "profit",
      title: "Project profitability",
      filename: "gakinz-project-profitability",
      head: ["project", "client", "revenue", "cost", "margin"],
      labels: ["Project", "Client", "Revenue", "Cost", "Margin"],
      money: ["revenue", "cost", "margin"],
      rows: profit as unknown as Record<string, unknown>[],
    },
    {
      key: "ltv",
      title: "Client lifetime value",
      filename: "gakinz-client-ltv",
      head: ["client", "paid", "outstanding", "invoices"],
      labels: ["Client", "Paid", "Outstanding", "Invoices"],
      money: ["paid", "outstanding"],
      rows: clientLtv as unknown as Record<string, unknown>[],
    },
    {
      key: "mrr",
      title: "Recurring revenue (care plans)",
      filename: "gakinz-recurring-revenue",
      head: ["client", "contact", "paid"],
      labels: ["Client", "Contact", "Paid"],
      money: ["paid"],
      rows: recurring as unknown as Record<string, unknown>[],
    },
    {
      key: "month",
      title: "Revenue by month (paid vs outstanding)",
      filename: "gakinz-revenue-by-month",
      head: ["month", "paid", "outstanding"],
      labels: ["Month", "Paid", "Outstanding"],
      money: ["paid", "outstanding"],
      rows: revenueRows as unknown as Record<string, unknown>[],
    },
    {
      key: "mix",
      title: "Project mix",
      filename: "gakinz-project-mix",
      head: ["label", "count"],
      labels: ["Status", "Projects"],
      money: [],
      rows: projectMix.map((m) => ({ label: m.label, count: m.count })),
    },
  ]
  const TAB_LABEL: Record<string, string> = {
    profit: "Project profitability",
    ltv: "Client lifetime value",
    mrr: "Recurring revenue",
    month: "Revenue by month",
    mix: "Project mix",
  }
  const allFailed = errors.length >= 5

  return (
    <div>
      <PageHeader
        title="Analytics & Reporting"
        subtitle="Revenue, pipeline conversion, delivery mix and utilisation."
        actions={
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : undefined} /> Refresh
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading figures">
          <StatGrid className="mb-0">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[104px] rounded-2xl" />
            ))}
          </StatGrid>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-[280px] rounded-2xl" />
            <Skeleton className="h-[280px] rounded-2xl" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {errors.length > 0 && (
            <div
              role="alert"
              className={
                allFailed
                  ? "flex flex-wrap items-start gap-3.5 rounded-2xl border border-bad/30 bg-bad-soft p-[18px] text-foreground"
                  : "flex flex-wrap items-start gap-3.5 rounded-2xl border border-warn/35 bg-warn-soft p-[18px] text-foreground"
              }
            >
              <AlertCircle className={allFailed ? "mt-0.5 size-5 shrink-0 text-bad" : "mt-0.5 size-5 shrink-0 text-warn"} aria-hidden="true" />
              <div className="min-w-[min(100%,200px)] flex-1">
                <p className="font-semibold">{allFailed ? "The figures could not be loaded" : "Some figures are missing"}</p>
                <p className="mt-1 text-sm text-muted-foreground">Could not reach: {errors.join(", ")}. {allFailed ? "The endpoints must be live on the server." : "Showing what loaded."}</p>
              </div>
              <Button variant="outline" onClick={load}>
                <RefreshCw /> Try again
              </Button>
            </div>
          )}

          {!allFailed && (
            <>
              <StatGrid className="mb-0">
                <StatTile label="Revenue paid" value={money(kpis.paid)} note="All settled invoices" tone={kpis.paid > 0 ? "up" : undefined} />
                <StatTile label="Win rate" value={`${kpis.winRate.toFixed(0)}%`} note={`${kpis.wonCount} of ${kpis.decidedCount} decided enquiries`} />
                <StatTile label="Avg invoice" value={money(kpis.avgInvoice)} note="Per settled invoice" />
                <StatTile
                  label="Utilisation"
                  value={`${kpis.utilisation.toFixed(0)}%`}
                  note={`${kpis.billableHours.toFixed(0)}h billable of ${kpis.totalHours.toFixed(0)}h`}
                />
              </StatGrid>

              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard
                  title="Revenue, paid vs outstanding"
                  extra={
                    <span className="flex flex-wrap gap-3 text-[12.5px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-acc" aria-hidden="true" />Paid</span>
                      <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-acc/35" aria-hidden="true" />Outstanding</span>
                    </span>
                  }
                >
                  {revenue.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">No invoice data yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={revenue} margin={{ left: 0, right: 4, top: 8, bottom: 0 }} barCategoryGap="40%" maxBarSize={56}>
                        <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={TICK} />
                        <YAxis tickLine={false} axisLine={false} width={56} tick={TICK} tickFormatter={(v) => shortGbp(Number(v))} />
                        <Tooltip
                          cursor={{ fill: "hsl(var(--secondary))" }}
                          formatter={(v: number, n) => [money(v), n === "paid" ? "Paid" : "Outstanding"]}
                          contentStyle={TOOLTIP}
                        />
                        <Bar isAnimationActive={false} dataKey="paid" stackId="a" fill="hsl(var(--os-acc))" />
                        <Bar isAnimationActive={false} dataKey="outstanding" stackId="a" fill="hsl(var(--os-acc) / 0.35)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard title="Billable utilisation by week" extra={<span className="rounded-full border border-dashed border-line-strong px-[7px] py-0.5 font-mono text-[10px] uppercase tracking-[.08em] text-muted-foreground">%</span>}>
                  {utilByWeek.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">No time entries yet. Logged time will chart here.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={utilByWeek} margin={{ left: 0, right: 20, top: 8, bottom: 0 }}>
                        <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="week" tickLine={false} axisLine={false} tick={TICK} minTickGap={16} />
                        <YAxis tickLine={false} axisLine={false} width={40} domain={[0, 100]} tick={TICK} tickFormatter={(v) => `${v}%`} />
                        <Tooltip formatter={(v: number) => [`${v}%`, "Billable"]} contentStyle={TOOLTIP} />
                        <Area
                          isAnimationActive={false}
                          type="linear"
                          dataKey="pct"
                          stroke="hsl(var(--os-acc))"
                          strokeWidth={2.5}
                          fill="hsl(var(--os-acc) / 0.14)"
                          dot={false}
                          activeDot={{ r: 4.5, fill: "hsl(var(--os-acc))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>

              <Tabs defaultValue="profit">
                <TabsList className="mb-4 flex w-full">
                  {reportsList.map((r) => (
                    <TabsTrigger key={r.key} value={r.key}>
                      {TAB_LABEL[r.key]}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {reportsList.map((r) => (
                  <TabsContent key={r.key} value={r.key} className="mt-0">
                    <ReportTable {...r} />
                  </TabsContent>
                ))}
              </Tabs>
              <p className="text-[13px] text-muted-foreground">Profitability uses the per-person cost rates set in Settings, Team.</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "\"JetBrains Mono Variable\", ui-monospace, monospace" }
const TOOLTIP = {
  borderRadius: 10,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--popover))",
  color: "hsl(var(--popover-foreground))",
  fontSize: 13,
}

/** Axis label: £2.1k rather than £2,100.00, so the axis stays narrow. */
function shortGbp(n: number) {
  if (Math.abs(n) >= 1000) return `£${(n / 1000).toFixed(Math.abs(n) >= 10000 ? 0 : 1)}k`
  return `£${Math.round(n)}`
}

function ChartCard({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-[18px] pb-3 pt-4">
        <h2 className="font-display text-[1.05rem] font-semibold tracking-[-0.01em]">{title}</h2>
        {extra && <div className="ml-auto">{extra}</div>}
      </div>
      <div className="px-[18px] pb-[18px]">{children}</div>
    </section>
  )
}

function ReportTable({
  title,
  filename,
  head,
  labels,
  money: moneyCols,
  rows,
}: {
  title: string
  filename: string
  head: string[]
  labels: string[]
  money: string[]
  rows: Record<string, unknown>[]
}) {
  const isMoney = (k: string) => moneyCols.includes(k)
  const isNum = (k: string) => isMoney(k) || k === "invoices" || k === "count"
  return (
    <div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong bg-card px-5 py-10 text-center text-sm text-muted-foreground">
          No data yet. Reports fill in once invoices and time entries exist.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border bg-card">
          <Table className="min-w-[560px]">
            <TableHeader>
              <TableRow>
                {head.map((k, i) => (
                  <TableHead key={k} className={isNum(k) ? "text-right" : undefined}>
                    {labels[i]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={idx}>
                  {head.map((k, i) => (
                    <TableCell
                      key={k}
                      className={
                        isNum(k)
                          ? "whitespace-nowrap text-right font-mono tabular-nums"
                          : i === 0
                            ? "min-w-[10rem] font-semibold [overflow-wrap:anywhere]"
                            : "min-w-[8rem] [overflow-wrap:anywhere]"
                      }
                    >
                      {isMoney(k) ? money(Number(r[k] ?? 0)) : String(r[k] ?? "None")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="mt-2.5 flex flex-wrap gap-2">
        <Button variant="outline" disabled={!rows.length} onClick={() => downloadCsv(`${filename}.csv`, head, rows)}>
          <Download /> CSV
        </Button>
        <Button variant="outline" disabled={!rows.length} onClick={() => downloadXlsx(`${filename}.xlsx`, head, rows, title.slice(0, 31))}>
          <Download /> XLSX
        </Button>
      </div>
    </div>
  )
}
