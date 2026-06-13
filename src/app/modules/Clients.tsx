import { useEffect, useState } from "react"
import { Loader2, Download, RefreshCw, Plus } from "lucide-react"
import { downloadCsv, downloadXlsx } from "@/lib/csv"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { clients, type Client, type ClientInput, type ClientTag, type ClientDetail } from "@/lib/api"
import { cn } from "@/lib/utils"

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)

const timelineMeta: Record<ClientDetail["timeline"][number]["type"], { label: string; cls: string }> = {
  proposal: { label: "Proposal", cls: "bg-primary/10 text-primary" },
  project: { label: "Project", cls: "bg-accent text-accent-foreground" },
  invoice: { label: "Invoice", cls: "bg-secondary text-secondary-foreground" },
  ticket: { label: "Ticket", cls: "bg-muted text-muted-foreground" },
}

const TAGS: ClientTag[] = ["retainer", "one-off", "vip", "dormant"]

const tagClass: Record<ClientTag, string> = {
  retainer: "bg-primary/10 text-primary",
  "one-off": "bg-muted text-muted-foreground",
  vip: "bg-accent text-accent-foreground",
  dormant: "bg-secondary text-secondary-foreground",
}

const emptyForm: ClientInput = { company: "", contact_name: "", email: "", phone: "", tag: "one-off", notes: "" }

export default function Clients() {
  const [items, setItems] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ClientInput>(emptyForm)
  const [saving, setSaving] = useState(false)

  // Client detail (LTV + account history)
  const [detail, setDetail] = useState<ClientDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  const openDetail = async (id: number) => {
    setDetailOpen(true)
    setDetail(null)
    setDetailLoading(true)
    const res = await clients.get(id)
    setDetailLoading(false)
    if (res.ok) setDetail(res.data)
    else toast.error(res.error || "Could not load the client.")
  }

  const load = async () => {
    setLoading(true)
    const res = await clients.list()
    if (res.ok) {
      setItems(res.data)
      setError(null)
    } else {
      setError(res.error)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const set = (k: keyof ClientInput, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.company.trim()) {
      toast.error("A company name is required.")
      return
    }
    setSaving(true)
    const res = await clients.create(form)
    setSaving(false)
    if (res.ok) {
      toast.success("Client added.")
      setForm(emptyForm)
      setOpen(false)
      load()
    } else {
      toast.error(res.error || "Could not add the client.")
    }
  }

  const clientHead = ["id", "company", "contact_name", "email", "phone", "tag", "created_at"]
  const exportCsv = () =>
    downloadCsv("gakinz-clients.csv", clientHead, items as unknown as Record<string, unknown>[])
  const exportXlsx = () =>
    downloadXlsx("gakinz-clients.xlsx", clientHead, items as unknown as Record<string, unknown>[], "Clients")

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Every client, their contacts and history in one record.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!items.length}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportXlsx} disabled={!items.length}>
            <Download className="mr-2 h-4 w-4" /> XLSX
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New client</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" value={form.company} onChange={(e) => set("company", e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="contact">Contact name</Label>
                  <Input id="contact" value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label>Tag</Label>
                  <Select value={form.tag} onValueChange={(v) => set("tag", v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TAGS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} className="mt-1.5" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save client
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the clients endpoint and DB must be live on the server.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading clients…
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No clients yet. Add one, or convert a won lead from the Leads board.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => openDetail(c.id)}>
                  <TableCell className="font-medium">
                    <button className="text-left hover:text-primary hover:underline">{c.company}</button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.contact_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                  <TableCell>
                    <span className={cn("rounded px-2 py-0.5 text-xs font-medium", tagClass[c.tag])}>{c.tag}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(c.created_at.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Client detail: lifetime value + account history */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.client.company ?? "Client"}</DialogTitle>
          </DialogHeader>
          {detailLoading || !detail ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading client…
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-lg font-semibold text-primary">{gbp(detail.stats.ltv)}</div>
                  <div className="text-xs text-muted-foreground">Lifetime value</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-lg font-semibold">{gbp(detail.stats.outstanding)}</div>
                  <div className="text-xs text-muted-foreground">Outstanding</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-lg font-semibold">{detail.stats.projects}</div>
                  <div className="text-xs text-muted-foreground">Projects</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-lg font-semibold">{detail.stats.open_tickets}</div>
                  <div className="text-xs text-muted-foreground">Open tickets</div>
                </div>
              </div>

              {(detail.client.contact_name || detail.client.email || detail.client.phone) && (
                <div className="text-sm text-muted-foreground">
                  {[detail.client.contact_name, detail.client.email, detail.client.phone].filter(Boolean).join(" · ")}
                </div>
              )}

              <div>
                <h3 className="mb-2 text-sm font-semibold">Account history</h3>
                {detail.timeline.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                    {detail.timeline.map((t) => (
                      <li key={`${t.type}-${t.id}`} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                        <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", timelineMeta[t.type].cls)}>
                          {timelineMeta[t.type].label}
                        </span>
                        <span className="flex-1 truncate">{t.label}</span>
                        <span className="text-xs text-muted-foreground">{t.status}</span>
                        {t.amount != null && <span className="font-medium">{gbp(t.amount)}</span>}
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(t.date.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
