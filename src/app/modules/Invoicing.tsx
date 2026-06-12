import { useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, Trash2, Send, BadgePoundSterling, FileDown, Download, CreditCard } from "lucide-react"
import { saveAs } from "file-saver"
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
import {
  invoices,
  clients as clientsApi,
  type Invoice,
  type InvoiceStatus,
  type ProposalItemInput,
  type Client,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import { downloadInvoicePdf } from "./invoicePdf"

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)

const statusClass: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  paid: "bg-accent text-accent-foreground",
}

type DraftItem = { description: string; qty: string; unit_price: string }
const blankItem: DraftItem = { description: "", qty: "1", unit_price: "" }

function fmt(d: string | null) {
  if (!d) return "—"
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export default function Invoicing() {
  const [items, setItems] = useState<Invoice[]>([])
  const [clientList, setClientList] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const [open, setOpen] = useState(false)
  const [clientId, setClientId] = useState("")
  const [dueAt, setDueAt] = useState("")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<DraftItem[]>([{ ...blankItem }])
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await invoices.list()
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
    clientsApi.list().then((r) => r.ok && setClientList(r.data))
  }, [])

  const outstanding = items.filter((i) => i.status !== "paid").reduce((s, i) => s + i.total, 0)

  const draftTotal = lines.reduce(
    (sum, l) => sum + (parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0),
    0,
  )
  const setLine = (i: number, k: keyof DraftItem, v: string) =>
    setLines((xs) => xs.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)))

  const create = async () => {
    const payloadItems: ProposalItemInput[] = lines
      .filter((l) => l.description.trim())
      .map((l) => ({ description: l.description.trim(), qty: parseFloat(l.qty) || 1, unit_price: parseFloat(l.unit_price) || 0 }))
    if (payloadItems.length === 0) return toast.error("Add at least one line item.")
    setSaving(true)
    const res = await invoices.create({
      client_id: clientId ? Number(clientId) : null,
      due_at: dueAt || undefined,
      notes,
      items: payloadItems,
    })
    setSaving(false)
    if (res.ok) {
      toast.success(`Invoice ${res.data.number} created.`)
      setClientId("")
      setDueAt("")
      setNotes("")
      setLines([{ ...blankItem }])
      setOpen(false)
      load()
    } else {
      toast.error(res.error || "Could not create the invoice.")
    }
  }

  const setStatus = async (inv: Invoice, status: InvoiceStatus) => {
    setBusyId(inv.id)
    const res = await invoices.setStatus(inv.id, status)
    setBusyId(null)
    if (res.ok) {
      setItems((xs) => xs.map((x) => (x.id === inv.id ? { ...x, status, overdue: status === "paid" ? false : x.overdue } : x)))
    } else {
      toast.error(res.error || "Could not update the invoice.")
    }
  }

  // Stripe Checkout: open a hosted payment link in a new tab. The webhook marks
  // the invoice paid once Stripe confirms — no manual "mark paid" needed.
  const createPayLink = async (inv: Invoice) => {
    setBusyId(inv.id)
    const res = await invoices.payLink(inv.id)
    setBusyId(null)
    if (res.ok) {
      window.open(res.data.url, "_blank", "noopener")
      toast.success("Stripe checkout opened — the invoice marks paid automatically once settled.")
    } else {
      toast.error(res.error || "Could not create a payment link.")
    }
  }

  const downloadPdf = async (inv: Invoice) => {
    setBusyId(inv.id)
    const res = await invoices.get(inv.id)
    setBusyId(null)
    if (res.ok) downloadInvoicePdf(res.data)
    else toast.error(res.error || "Could not load the invoice.")
  }

  const exportCsv = () => {
    const head = ["number", "client_company", "status", "total", "issued_at", "due_at"]
    const rows = items.map((i) =>
      head.map((k) => `"${String((i as Record<string, unknown>)[k] ?? "").replace(/"/g, '""')}"`).join(","),
    )
    const blob = new Blob([[head.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" })
    saveAs(blob, "gakinz-invoices.csv")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Invoicing</h1>
          <p className="text-sm text-muted-foreground">
            Outstanding: <span className="font-medium text-foreground">{gbp(outstanding)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!items.length}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>New invoice</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Client</Label>
                    <Select value={clientId} onValueChange={setClientId}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="No client" />
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
                  <div>
                    <Label htmlFor="idue">Due date</Label>
                    <Input id="idue" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="mt-1.5" />
                  </div>
                </div>

                <div>
                  <Label>Line items</Label>
                  <div className="mt-1.5 space-y-2">
                    {lines.map((l, i) => (
                      <div key={i} className="flex gap-2">
                        <Input placeholder="Description" value={l.description} onChange={(e) => setLine(i, "description", e.target.value)} className="flex-1" />
                        <Input type="number" placeholder="Qty" value={l.qty} onChange={(e) => setLine(i, "qty", e.target.value)} className="w-20" />
                        <Input type="number" placeholder="Unit £" value={l.unit_price} onChange={(e) => setLine(i, "unit_price", e.target.value)} className="w-28" />
                        <Button variant="ghost" size="icon" aria-label="Remove line" onClick={() => setLines((xs) => (xs.length > 1 ? xs.filter((_, idx) => idx !== i) : xs))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setLines((xs) => [...xs, { ...blankItem }])}>
                      <Plus className="mr-2 h-4 w-4" /> Add line
                    </Button>
                  </div>
                  <div className="mt-2 text-right text-sm font-medium">Total: {gbp(draftTotal)}</div>
                </div>

                <div>
                  <Label htmlFor="inotes">Notes</Label>
                  <Textarea id="inotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={create} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create invoice
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the invoices endpoint and DB must be live on the server.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading invoices…
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No invoices yet. Create one to bill a client.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.number || `#${inv.id}`}</TableCell>
                  <TableCell className="text-muted-foreground">{inv.client_company || "—"}</TableCell>
                  <TableCell>
                    <span className={cn("rounded px-2 py-0.5 text-xs font-medium", statusClass[inv.status])}>{inv.status}</span>
                    {inv.overdue && <span className="ml-1 rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">overdue</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fmt(inv.due_at)}</TableCell>
                  <TableCell className="text-right font-medium">{gbp(inv.total)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" disabled={busyId === inv.id} onClick={() => downloadPdf(inv)} title="Download PDF">
                        <FileDown className="h-3.5 w-3.5" />
                      </Button>
                      {inv.status === "draft" && (
                        <Button variant="ghost" size="sm" disabled={busyId === inv.id} onClick={() => setStatus(inv, "sent")}>
                          <Send className="mr-1 h-3.5 w-3.5" /> Send
                        </Button>
                      )}
                      {inv.status !== "paid" && (
                        <Button variant="ghost" size="sm" disabled={busyId === inv.id} onClick={() => createPayLink(inv)} title="Create a Stripe payment link">
                          <CreditCard className="mr-1 h-3.5 w-3.5" /> Pay link
                        </Button>
                      )}
                      {inv.status !== "paid" && (
                        <Button variant="ghost" size="sm" disabled={busyId === inv.id} onClick={() => setStatus(inv, "paid")} title="Mark paid manually (no Stripe)">
                          <BadgePoundSterling className="mr-1 h-3.5 w-3.5" /> Mark paid
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
