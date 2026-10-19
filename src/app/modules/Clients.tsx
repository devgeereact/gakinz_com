import { useEffect, useMemo, useState } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import { Loader2, Download, RefreshCw, Plus, Building2, Search, FileJson } from "lucide-react"
import { saveAs } from "file-saver"
import { downloadCsv, downloadXlsx } from "@/lib/csv"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { clients, privacy, downloadName, type Client, type ClientInput, type ClientTag, type ClientDetail } from "@/lib/api"
import { cn } from "@/lib/utils"
import { gbp } from "@/lib/format"
import { EmptyState, LoadError } from "@/app/components/EmptyState"
import { PageHeader } from "@/app/components/page-kit"
import { ClientFeedback } from "@/app/components/ClientFeedback"
import { TableSkeleton } from "@/app/components/TableSkeleton"
import { useAuth } from "@/store/auth.store"
import { exportOutcome, PRIVACY_NOT_AVAILABLE } from "@/app/modules/privacyToolsModel"
import { clientsLink, linkMark } from "@/lib/deepLink"
import { useApplyLink } from "@/hooks/use-reveal"

const TIMELINE_LABEL: Record<ClientDetail["timeline"][number]["type"], string> = {
  enquiry: "Enquiry",
  call: "Call",
  proposal: "Quote",
  project: "Project",
  invoice: "Invoice",
  ticket: "Message",
  conversation: "Conversation",
  feedback: "Feedback",
}

const TAGS: ClientTag[] = ["retainer", "one-off", "vip", "dormant"]

const TAG_LABEL: Record<ClientTag, string> = {
  retainer: "Retainer",
  "one-off": "One-off",
  vip: "VIP",
  dormant: "Dormant",
}
const TAG_TONE: Record<ClientTag, "acc" | "secondary" | "ok"> = {
  retainer: "acc",
  "one-off": "secondary",
  vip: "ok",
  dormant: "secondary",
}

const emptyForm: ClientInput = { company: "", contact_name: "", email: "", phone: "", tag: "one-off", retainer_amount: 0, notes: "" }

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

  // Subject access export (privacy.php): super_admin and admin only, which the
  // server enforces; this only hides the button from other roles.
  const role = useAuth((s) => s.user?.role)
  const canExport = role === "super_admin" || role === "admin"
  const [exporting, setExporting] = useState(false)
  const exportData = async (id: number) => {
    setExporting(true)
    const out = exportOutcome(await privacy.exportClient(id))
    setExporting(false)
    if (out.kind === "saved") {
      saveAs(out.file, downloadName(out.file, `gakinz-data-export-client-${id}-${new Date().toISOString().slice(0, 10)}.json`))
      toast.success("Export downloaded. It holds personal data: store it safely and delete it once sent.")
    } else if (out.kind === "not_on_server") toast(PRIVACY_NOT_AVAILABLE)
    else toast.error(out.error || "Could not export the client's data.")
  }

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

  // ?client=<id> (from the record search) opens that client's detail sheet
  // once the list has loaded, and again whenever the link changes or the
  // search re-sends it (useApplyLink). An id that is not listed leaves the
  // plain screen.
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const link = clientsLink(searchParams)
  useApplyLink(linkMark(link, location.state), !loading && error === null, () => {
    if (link.client !== null && items.some((c) => c.id === link.client)) openDetail(link.client)
  })

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

  // A view filter over the loaded list; nothing is fetched or saved.
  const [query, setQuery] = useState("")
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((c) =>
      [c.company, c.contact_name, c.email, c.phone, c.tag].some((v) => (v ?? "").toLowerCase().includes(q)),
    )
  }, [items, query])

  const addButton = (
    <Button onClick={() => setOpen(true)}>
      <Plus /> New client
    </Button>
  )

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Every client, their contacts and history in one record."
        actions={
          <>
            {addButton}
            <Button variant="outline" onClick={exportCsv} disabled={!items.length}>
              <Download /> CSV
            </Button>
            <Button variant="outline" onClick={exportXlsx} disabled={!items.length}>
              <Download /> XLSX
            </Button>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={cn(loading && "animate-spin")} /> Refresh
            </Button>
          </>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
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
            <div>
              <Label htmlFor="retainer">Care plan / retainer (£ per month)</Label>
              <Input
                id="retainer"
                type="number"
                min="0"
                step="10"
                value={String(form.retainer_amount ?? 0)}
                onChange={(e) => setForm((f) => ({ ...f, retainer_amount: parseFloat(e.target.value) || 0 }))}
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-muted-foreground">Billed automatically each month by the cron runner (if &gt; 0).</p>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Save client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && <LoadError what="clients" detail={`${error}. The clients endpoint and database must be live on the server.`} onRetry={load} className="mb-4" />}

      {!error && (
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          <label className="flex min-h-10 min-w-0 max-w-[340px] flex-1 items-center gap-2 rounded-[10px] border bg-card px-3 focus-within:border-acc focus-within:ring-[3px] focus-within:ring-acc-soft">
            <Search aria-hidden className="size-[18px] shrink-0 text-muted-foreground" />
            <span className="sr-only">Search clients</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients…"
              className="w-full min-w-0 border-0 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>
      )}

      {loading ? (
        <div className="overflow-hidden rounded-[14px] border bg-card">
          <TableSkeleton rows={6} cols={5} />
        </div>
      ) : error ? null : items.length === 0 ? (
        <EmptyState
          className="rounded-2xl border border-dashed border-line-strong bg-card py-14"
          icon={Building2}
          title="No clients yet"
          description="Add one, or convert a won lead from the Enquiries board."
          action={addButton}
        />
      ) : shown.length === 0 ? (
        <EmptyState
          className="rounded-2xl border border-dashed border-line-strong bg-card py-14" icon={Search} title="No matching clients" description={`Nothing matches “${query.trim()}”. Try a company, contact or email.`} />
      ) : (
        <div className="overflow-hidden rounded-[14px] border bg-card">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Company</TableHead>
                <TableHead scope="col">Email</TableHead>
                <TableHead scope="col">Phone</TableHead>
                <TableHead scope="col">Tag</TableHead>
                <TableHead scope="col">Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((c) => (
                <TableRow
                  key={c.id}
                  tabIndex={0}
                  aria-label={`Open ${c.company}`}
                  className="cursor-pointer focus-visible:bg-secondary focus-visible:outline-none"
                  onClick={() => openDetail(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      openDetail(c.id)
                    }
                  }}
                >
                  <TableCell>
                    <span className="flex min-w-[12rem] max-w-[22rem] items-center gap-2.5">
                      <Avatar name={c.company} />
                      <span className="min-w-0">
                        <b className="block font-semibold [overflow-wrap:anywhere]">{c.company}</b>
                        {c.contact_name && <small className="block text-[12.5px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">{c.contact_name}</small>}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="min-w-[12rem] max-w-[18rem] text-muted-foreground [overflow-wrap:anywhere]">{c.email || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[13px] text-muted-foreground">{c.phone || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={TAG_TONE[c.tag]}>{TAG_LABEL[c.tag]}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(c.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Client detail: lifetime value and account history */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="flex flex-col gap-0 p-0 sm:p-0">
          <SheetHeader className="border-b p-5 pb-4 text-left">
            <SheetTitle className="[overflow-wrap:anywhere]">{detail?.client.company ?? "Client"}</SheetTitle>
            <SheetDescription>Client</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-5">
            {detailLoading || !detail ? (
              <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading client…
              </div>
            ) : (
              <>
                <div className="mb-[18px] grid grid-cols-2 gap-3">
                  {[
                    ["Lifetime value", gbp(detail.stats.ltv)],
                    ["Outstanding", gbp(detail.stats.outstanding)],
                    ["Projects", String(detail.stats.projects)],
                    ["Open tickets", String(detail.stats.open_tickets)],
                  ].map(([l, v]) => (
                    <div key={l} className="grid min-w-0 gap-1.5 rounded-2xl border bg-card px-4 py-3.5">
                      <span className="text-[13px] text-muted-foreground">{l}</span>
                      <span className="font-display text-[1.4rem] font-bold leading-none tracking-[-0.03em] tabular-nums [overflow-wrap:anywhere]">{v}</span>
                    </div>
                  ))}
                </div>

                <dl className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-x-4 gap-y-2.5 max-sm:grid-cols-1">
                  <dt className="text-[13.5px] text-muted-foreground">Contact</dt>
                  <dd className="m-0 min-w-0 [overflow-wrap:anywhere]">{detail.client.contact_name || <span className="text-muted-foreground">None</span>}</dd>
                  <dt className="text-[13.5px] text-muted-foreground">Email</dt>
                  <dd className="m-0 min-w-0 [overflow-wrap:anywhere]">
                    {detail.client.email ? (
                      <a href={`mailto:${detail.client.email}`} className="text-acc hover:underline">{detail.client.email}</a>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </dd>
                  <dt className="text-[13.5px] text-muted-foreground">Phone</dt>
                  <dd className="m-0 min-w-0 font-mono text-[13px] [overflow-wrap:anywhere]">{detail.client.phone || <span className="font-sans text-muted-foreground">None</span>}</dd>
                  <dt className="text-[13.5px] text-muted-foreground">Tag</dt>
                  <dd className="m-0">
                    <Badge variant={TAG_TONE[detail.client.tag]}>{TAG_LABEL[detail.client.tag]}</Badge>
                  </dd>
                  <dt className="text-[13.5px] text-muted-foreground">Care plan</dt>
                  <dd className="m-0 min-w-0">
                    {detail.client.retainer_amount > 0 ? (
                      <span className="tabular-nums">{gbp(detail.client.retainer_amount)} per month</span>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </dd>
                </dl>

                <p className="mb-2 mt-5 font-semibold">Timeline</p>
                {(detail.unavailable ?? []).length > 0 && (
                  <p className="mb-2 text-[13px] text-muted-foreground">
                    {(detail.unavailable ?? []).map((u) => (u === "calls" ? "Calls" : "Feedback")).join(" and ")} not shown until the server database update has run.
                  </p>
                )}
                {detail.timeline.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  <ul className="m-0 list-none p-0">
                    {detail.timeline.map((t, i) => (
                      <li key={`${t.type}-${t.id}`} className="grid grid-cols-[20px_minmax(0,1fr)] gap-2.5 py-2">
                        <span
                          aria-hidden
                          className={cn("ml-[5px] mt-1.5 size-[9px] rounded-full shadow-[0_0_0_3px_hsl(var(--card))]", i === 0 ? "bg-acc" : "bg-line-strong")}
                        />
                        <span className="min-w-0 [overflow-wrap:anywhere]">
                          {t.label}
                          {t.amount != null && <span className="tabular-nums"> · {gbp(t.amount)}</span>}
                          <small className="block text-[12.5px] text-muted-foreground">
                            {TIMELINE_LABEL[t.type]} · {t.status.replace(/_/g, " ")} · {fmtDate(t.date)}
                          </small>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <ClientFeedback
                  clientId={detail.client.id}
                  projects={detail.timeline.filter((t) => t.type === "project").map((t) => ({ id: t.id, name: t.label }))}
                />
              </>
            )}
          </div>
          <SheetFooter className="m-0 px-5 pb-[calc(14px+env(safe-area-inset-bottom,0px))]">
            {canExport && detail && (
              <Button variant="outline" onClick={() => exportData(detail.client.id)} disabled={exporting}>
                {exporting ? <Loader2 className="animate-spin" /> : <FileJson />} Export data
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(iso.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
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
