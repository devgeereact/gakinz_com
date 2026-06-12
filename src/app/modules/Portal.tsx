import { useEffect, useState } from "react"
import { Loader2, FolderKanban, Receipt, LifeBuoy } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { portal, clients as clientsApi, type PortalData, type Client } from "@/lib/api"
import { cn } from "@/lib/utils"

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)

function fmt(d: string | null) {
  if (!d) return "—"
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export default function Portal() {
  const [clientList, setClientList] = useState<Client[]>([])
  const [clientId, setClientId] = useState("")
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    clientsApi.list().then((r) => {
      if (r.ok) setClientList(r.data)
      else setError(r.error)
    })
  }, [])

  useEffect(() => {
    if (!clientId) {
      setData(null)
      return
    }
    setLoading(true)
    portal.get(Number(clientId)).then((r) => {
      if (r.ok) {
        setData(r.data)
        setError(null)
      } else {
        setError(r.error)
        setData(null)
      }
      setLoading(false)
    })
  }, [clientId])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Client Portal</h1>
        <p className="text-sm text-muted-foreground">
          What a client sees: their projects, invoices and tickets. Pick a client to preview.
        </p>
      </div>

      <div className="max-w-xs">
        <Label>Client</Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Choose a client" />
          </SelectTrigger>
          <SelectContent>
            {clientList.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.company}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the portal endpoint and DB must be live on the server.
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading portal…
        </div>
      )}

      {!clientId && !error && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center text-sm text-muted-foreground">
          Choose a client above to preview their portal.
        </div>
      )}

      {data && (
        <div className="gk-public space-y-6 rounded-2xl border border-border bg-background p-6">
          <div className="border-b border-border pb-4">
            <h2 className="font-serif text-xl font-bold">Welcome, {data.client.company}</h2>
            <p className="text-sm text-muted-foreground">Your projects, invoices and support in one place.</p>
          </div>

          {/* Projects */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <FolderKanban className="h-4 w-4 text-primary" /> Projects
            </h3>
            {data.projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active projects.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.projects.map((p) => {
                  const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0
                  return (
                    <div key={p.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs capitalize text-muted-foreground">{p.status.replace("_", " ")}</span>
                      </div>
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                        <span>{pct}% complete</span>
                        {p.due_date && <span>Due {fmt(p.due_date)}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Invoices */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Receipt className="h-4 w-4 text-primary" /> Invoices
            </h3>
            {data.invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {data.invoices.map((inv) => (
                      <tr key={inv.id} className="bg-card">
                        <td className="px-4 py-2 font-medium">{inv.number || `#${inv.id}`}</td>
                        <td className="px-4 py-2 text-muted-foreground">Due {fmt(inv.due_at)}</td>
                        <td className="px-4 py-2">
                          <span
                            className={cn(
                              "rounded px-2 py-0.5 text-xs font-medium",
                              inv.status === "paid" ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary",
                            )}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-medium">{gbp(inv.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Tickets */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <LifeBuoy className="h-4 w-4 text-primary" /> Support
            </h3>
            {data.tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open tickets.</p>
            ) : (
              <ul className="space-y-2">
                {data.tickets.map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2 text-sm">
                    <span>{t.subject}</span>
                    <span className="text-xs capitalize text-muted-foreground">{t.status.replace("_", " ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
