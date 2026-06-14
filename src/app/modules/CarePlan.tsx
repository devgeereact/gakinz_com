import { useEffect, useState } from "react"
import { Loader2, RefreshCw, ExternalLink, Activity, ShieldCheck, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { careplan, type CarePlanSite } from "@/lib/api"
import { cn } from "@/lib/utils"

const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)

function fmt(d: string | null) {
  if (!d) return "never"
  return new Date(d.replace(" ", "T")).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

function upState(code: number | null): { label: string; cls: string } {
  if (code === null) return { label: "unknown", cls: "bg-muted text-muted-foreground" }
  if (code >= 200 && code < 400) return { label: `up · ${code}`, cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" }
  return { label: `down · ${code}`, cls: "bg-destructive/10 text-destructive" }
}

export default function CarePlan() {
  const [items, setItems] = useState<CarePlanSite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await careplan.list()
    if (res.ok) {
      setItems(res.data)
      setError(null)
    } else setError(res.error)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const check = async (s: CarePlanSite) => {
    setBusyId(s.project_id)
    const res = await careplan.check(s.project_id)
    setBusyId(null)
    if (res.ok) {
      setItems((xs) => xs.map((x) => (x.project_id === s.project_id
        ? { ...x, last_http_status: res.data.last_http_status, ssl_days_left: res.data.ssl_days_left, last_checked_at: new Date().toISOString() }
        : x)))
      toast.success(res.data.ok ? "Site is up." : "Site check complete.")
    } else toast.error(res.error || "Could not check the site.")
  }

  const mrr = items.reduce((s, x) => s + (x.retainer_amount || 0), 0)
  const down = items.filter((x) => x.last_http_status !== null && (x.last_http_status < 200 || x.last_http_status >= 400)).length
  const expiringSoon = items.filter((x) => x.ssl_days_left !== null && x.ssl_days_left <= 30).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Care Plan</h1>
          <p className="text-sm text-muted-foreground">Sites under management — uptime, SSL expiry and recurring revenue.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Sites managed", value: String(items.length) },
          { label: "Care-plan MRR", value: gbp(mrr) },
          { label: "Down now", value: String(down) },
          { label: "SSL ≤ 30 days", value: String(expiringSoon) },
        ].map((s) => (
          <div key={s.label} className="gk-app-card p-5">
            <div className="text-2xl font-semibold text-primary">{s.value}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the careplan endpoint and DB must be live on the server.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading sites…
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No managed sites yet. Add a production URL to a project in Dev Pipeline to track it here.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Site</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead>SSL</TableHead>
                <TableHead>Retainer</TableHead>
                <TableHead>Last checked</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => {
                const up = upState(s.last_http_status)
                const sslWarn = s.ssl_days_left !== null && s.ssl_days_left <= 30
                return (
                  <TableRow key={s.project_id}>
                    <TableCell className="font-medium">
                      {s.project_name}
                      <a href={s.prod_url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        visit <ExternalLink className="h-3 w-3" />
                      </a>
                      <p className="text-xs text-muted-foreground">{s.client_company || "Internal"}</p>
                    </TableCell>
                    <TableCell>
                      <span className={cn("rounded px-2 py-0.5 text-xs font-medium", up.cls)}>{up.label}</span>
                    </TableCell>
                    <TableCell>
                      {s.ssl_days_left === null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <span className={cn("inline-flex items-center gap-1 text-xs", sslWarn ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                          {sslWarn ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                          {s.ssl_days_left}d
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.retainer_amount > 0 ? `${gbp(s.retainer_amount)}/mo` : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{fmt(s.last_checked_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" disabled={busyId === s.project_id} onClick={() => check(s)}>
                        {busyId === s.project_id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Activity className="mr-1 h-3.5 w-3.5" />}
                        Check now
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
