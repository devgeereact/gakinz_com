import { useState } from "react"
import { useLoad } from "@/hooks/use-load"
import { Loader2, RefreshCw, ExternalLink, Activity, AlertCircle, HeartPulse } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { careplan, type CarePlanSite } from "@/lib/api"
import { PageHeader, StatGrid, StatTile, StatusBadge } from "@/app/components/page-kit"
import { EmptyState } from "@/app/components/EmptyState"
import { TableSkeleton } from "@/app/components/TableSkeleton"

const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)

function fmt(d: string | null) {
  if (!d) return "Never"
  return new Date(d.replace(" ", "T")).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

const isDown = (code: number | null) => code !== null && (code < 200 || code >= 400)
const host = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export default function CarePlan() {
  const { data: items, error, loading, reload: load, setData: setItems } = useLoad<CarePlanSite[]>(() => careplan.list(), [])
  const [busyId, setBusyId] = useState<number | null>(null)

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
  const downSites = items.filter((x) => isDown(x.last_http_status))
  const expiringSites = items.filter((x) => x.ssl_days_left !== null && x.ssl_days_left <= 30)
  const names = (xs: CarePlanSite[]) => (xs.length ? xs.map((x) => host(x.prod_url)).join(", ") : "None")

  return (
    <div>
      <PageHeader
        title="Care Plan"
        subtitle="Sites under management: uptime, SSL expiry and recurring revenue."
        actions={
          <Button variant="outline" onClick={load}>
            <RefreshCw /> Refresh
          </Button>
        }
      />

      <div className="space-y-4">
        {error && (
          <div role="alert" className="flex flex-wrap items-start gap-3.5 rounded-2xl border border-bad/30 bg-bad-soft p-[18px] text-foreground">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-bad" aria-hidden="true" />
            <div className="min-w-[min(100%,200px)] flex-1">
              <p className="font-semibold">Managed sites could not be loaded</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}. The care plan endpoint and database must be live on the server.</p>
            </div>
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Try again
            </Button>
          </div>
        )}

        {!loading && !error && (
          <StatGrid className="mb-0">
            <StatTile label="Sites managed" value={String(items.length)} />
            <StatTile label="Care-plan MRR" value={gbp(mrr)} note="Per month" tone={mrr > 0 ? "up" : undefined} />
            <StatTile
              label="Down now"
              value={String(downSites.length)}
              note={<span className="block truncate">{names(downSites)}</span>}
              tone={downSites.length ? "down" : undefined}
            />
            <StatTile label="SSL ≤ 30 days" value={String(expiringSites.length)} note={<span className="block truncate">{names(expiringSites)}</span>} />
          </StatGrid>
        )}

        {loading ? (
          <div className="overflow-hidden rounded-[14px] border bg-card">
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : error ? null : items.length === 0 ? (
          <EmptyState
            icon={HeartPulse}
            title="No managed sites yet"
            description="Add a production URL to a project in Dev Pipeline to track it here."
            className="rounded-2xl border border-dashed border-line-strong bg-card py-14"
          />
        ) : (
          <div className="overflow-hidden rounded-[14px] border bg-card">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Uptime</TableHead>
                  <TableHead>SSL</TableHead>
                  <TableHead className="text-right">Retainer</TableHead>
                  <TableHead>Last checked</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => {
                  const code = s.last_http_status
                  return (
                    <TableRow key={s.project_id}>
                      <TableCell className="min-w-[13rem] max-w-[20rem]">
                        <a
                          href={s.prod_url}
                          title={s.prod_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex max-w-full items-center gap-1.5 font-mono font-semibold hover:text-acc hover:underline"
                        >
                          <span className="truncate">{host(s.prod_url)}</span>
                          <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                        <span className="block text-[12.5px] text-muted-foreground [overflow-wrap:anywhere]">
                          {s.project_name} · {s.client_company || "Internal"}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {code === null ? (
                          <Badge variant="secondary">Not checked</Badge>
                        ) : (
                          <>
                            <StatusBadge status={isDown(code) ? "failed" : "healthy"} />
                            <span className="ml-2 font-mono text-xs tabular-nums text-muted-foreground">{code}</span>
                          </>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {s.ssl_days_left === null ? (
                          <span className="text-muted-foreground">Unknown</span>
                        ) : (
                          <>
                            <StatusBadge status={s.ssl_days_left <= 30 ? "expiring" : "in date"} />
                            <span className="ml-2 font-mono text-xs tabular-nums text-muted-foreground">{s.ssl_days_left} days</span>
                          </>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                        {s.retainer_amount > 0 ? (
                          <>
                            {gbp(s.retainer_amount)}
                            <span className="font-sans text-xs text-muted-foreground"> /mo</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{fmt(s.last_checked_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" disabled={busyId === s.project_id} onClick={() => check(s)}>
                          {busyId === s.project_id ? <Loader2 className="animate-spin" /> : <Activity />}
                          Check now
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
