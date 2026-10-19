import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useLocation, useSearchParams } from "react-router-dom"
import { LINKED_ROW, invoicingLink, linkMark, linkRevision, recordElementId } from "@/lib/deepLink"
import { useReveal } from "@/hooks/use-reveal"
import { Loader2, Plus, RefreshCw, Trash2, Send, BadgePoundSterling, FileDown, Download, CreditCard, AlertTriangle, AlertCircle, BellRing, Receipt, Search, Landmark } from "lucide-react"
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
import {
  invoices,
  clients as clientsApi,
  type Invoice,
  type InvoiceStatus,
  type PaymentMethod,
  type ProposalItemInput,
  type Client,
} from "@/lib/api"
import { gbp, localIsoDate } from "@/lib/format"
import { PageHeader, StatGrid, StatTile, StatusBadge } from "@/app/components/page-kit"
import { EmptyState } from "@/app/components/EmptyState"
import { TableSkeleton } from "@/app/components/TableSkeleton"
import { downloadInvoicePdf } from "./invoicePdf"
import {
  PAYMENT_METHODS, amountInput, amountWarning, canRecordPayment, expectedAmount, needsReference, paymentProblem, recordedPaymentLine,
  type PaymentDraft,
} from "./paymentModel"

type Filter = "all" | "sent" | "overdue" | "paid" | "draft"
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sent", label: "Sent" },
  { key: "overdue", label: "Overdue" },
  { key: "paid", label: "Paid" },
  { key: "draft", label: "Draft" },
]

/** Which filter chip an invoice belongs to. Overdue is a sent invoice past its due date. */
function bucket(inv: Invoice): Exclude<Filter, "all"> {
  if (inv.status === "paid") return "paid"
  if (inv.status === "draft") return "draft"
  return inv.overdue ? "overdue" : "sent"
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

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
  const [vatRate, setVatRate] = useState("20") // UK standard rate; 0 = not VAT-registered
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

  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")
  // ?invoice=<id> scrolls to and outlines that invoice, read on every render so a
  // new link on the open screen applies; the search's nonce scrolls to it again.
  // An id not on the list is ignored.
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const invoiceLink = invoicingLink(searchParams)
  const linkedInvoice = invoiceLink.invoice
  const invoiceRevision = linkRevision(linkMark(invoiceLink, location.state))

  // Figures for the tiles, all from the loaded list. Outstanding is what has
  // been sent and not paid; drafts are counted on their own tile.
  const unpaidSent = items.filter((i) => i.status === "sent")
  const outstanding = unpaidSent.reduce((s, i) => s + i.total, 0)
  const outstandingCount = unpaidSent.length
  const overdueList = items.filter((i) => i.overdue && i.status !== "paid")
  const overdue = { n: overdueList.length, sum: overdueList.reduce((s, i) => s + i.total, 0) }
  const monthNow = localIsoDate().slice(0, 7)
  const paidNow = items.filter((i) => i.status === "paid" && (i.paid_at ?? "").slice(0, 7) === monthNow)
  const paidThisMonth = { n: paidNow.length, sum: paidNow.reduce((s, i) => s + i.total, 0) }
  const counts: Record<Filter, number> = { all: items.length, sent: 0, overdue: 0, paid: 0, draft: 0 }
  for (const i of items) counts[bucket(i)] += 1
  const q = query.trim().toLowerCase()
  const shown = items.filter(
    (i) =>
      (filter === "all" || bucket(i) === filter) &&
      (!q || `${i.number ?? ""} ${i.client_company ?? ""}`.toLowerCase().includes(q)),
  )
  useReveal(linkedInvoice !== null && shown.some((i) => i.id === linkedInvoice) ? recordElementId("invoice", linkedInvoice) : null, !loading, invoiceRevision)
  // Clients with at least one overdue invoice → studio "work-pause" flag.
  const overdueClients = Array.from(
    new Set(items.filter((i) => i.overdue && i.client_company).map((i) => i.client_company as string)),
  )

  const draftSubtotal = lines.reduce(
    (sum, l) => sum + (parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0),
    0,
  )
  const vatNum = Math.max(0, Math.min(100, parseFloat(vatRate) || 0))
  const draftVat = draftSubtotal * (vatNum / 100)
  const draftTotal = draftSubtotal + draftVat
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
      vat_rate: vatNum,
      items: payloadItems,
    })
    setSaving(false)
    if (res.ok) {
      toast.success(`Invoice ${res.data.number} created.`)
      setClientId("")
      setDueAt("")
      setNotes("")
      setVatRate("20")
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

  // Record a bank transfer, cash or cheque payment the owner has checked.
  const [payFor, setPayFor] = useState<Invoice | null>(null)
  const [payDraft, setPayDraft] = useState<PaymentDraft>({ method: "bank_transfer", reference: "", paid_on: "", amount: "" })
  const [payError, setPayError] = useState<string | null>(null)
  const [payExpected, setPayExpected] = useState<string | null>(null) // total the server asked for, in pounds
  const [paySaving, setPaySaving] = useState(false)
  const openPayment = (inv: Invoice) => {
    setPayDraft({ method: "bank_transfer", reference: "", paid_on: localIsoDate(), amount: amountInput(inv.total) })
    setPayError(null)
    setPayExpected(null)
    setPayFor(inv)
  }
  const payProblem = payFor ? paymentProblem(payDraft, payFor, localIsoDate()) : null
  const payWarning = payFor && !payProblem ? amountWarning(payDraft.amount, payFor) : null
  const recordPayment = async () => {
    if (!payFor || payProblem) return
    setPaySaving(true)
    const res = await invoices.recordPayment({
      id: payFor.id,
      method: payDraft.method,
      reference: payDraft.reference.trim() || undefined,
      paid_on: payDraft.paid_on,
      amount: payDraft.amount.trim(),
    })
    setPaySaving(false)
    if (res.ok) {
      const d = res.data
      setItems((xs) =>
        xs.map((x) =>
          x.id === d.id
            ? { ...x, status: "paid", overdue: false, paid_at: d.paid_at, paid_method: d.paid_method, paid_reference: d.paid_reference, paid_amount_pence: d.paid_amount_pence }
            : x,
        ),
      )
      toast.success(`Payment recorded on ${payFor.number || `invoice ${payFor.id}`}.`)
      setPayFor(null)
    } else {
      // 503 carries the server's own message that SQL 13 has not run yet. A
      // 400 on the amount carries the server's payable total in expected_pence.
      setPayError(res.error || "Could not record the payment.")
      setPayExpected(expectedAmount(res.details))
    }
  }

  const chase = async (inv: Invoice) => {
    setBusyId(inv.id)
    const res = await invoices.chase(inv.id)
    setBusyId(null)
    if (res.ok) toast.success(`Reminder emailed to ${res.data.sent_to}.`)
    else toast.error(res.error || "Could not send the reminder.")
  }

  const downloadPdf = async (inv: Invoice) => {
    setBusyId(inv.id)
    const res = await invoices.get(inv.id)
    setBusyId(null)
    if (res.ok) downloadInvoicePdf(res.data)
    else toast.error(res.error || "Could not load the invoice.")
  }

  const invoiceHead = ["number", "client_company", "status", "subtotal", "vat_rate", "vat_amount", "total", "issued_at", "due_at"]
  const exportCsv = () =>
    downloadCsv("gakinz-invoices.csv", invoiceHead, items as unknown as Record<string, unknown>[])
  const exportXlsx = () =>
    downloadXlsx("gakinz-invoices.xlsx", invoiceHead, items as unknown as Record<string, unknown>[], "Invoices")

  const newInvoiceDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> New invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
        </DialogHeader>
        <div className="grid gap-[14px]">
          <div className="grid gap-[14px] sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
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
            <div className="grid gap-1.5">
              <Label htmlFor="idue">Due date</Label>
              <Input id="idue" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ivat">VAT rate (%)</Label>
              <Input id="ivat" type="number" min="0" max="100" step="0.5" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Line items</Label>
            <div className="grid gap-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_auto]">
                  <Input className="col-span-3 sm:col-span-1" aria-label="Description" placeholder="Description" value={l.description} onChange={(e) => setLine(i, "description", e.target.value)} />
                  <Input aria-label="Quantity" type="number" placeholder="Qty" value={l.qty} onChange={(e) => setLine(i, "qty", e.target.value)} />
                  <Input aria-label="Unit price in pounds" type="number" placeholder="Unit £" value={l.unit_price} onChange={(e) => setLine(i, "unit_price", e.target.value)} />
                  <Button variant="ghost" size="icon" aria-label="Remove line" onClick={() => setLines((xs) => (xs.length > 1 ? xs.filter((_, idx) => idx !== i) : xs))}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <div>
                <Button variant="ghost" onClick={() => setLines((xs) => [...xs, { ...blankItem }])}>
                  <Plus /> Add line
                </Button>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-x-4 gap-y-2.5 rounded-2xl border bg-secondary p-[18px] text-sm">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="text-right font-mono tabular-nums">{gbp(draftSubtotal)}</dd>
            <dt className="text-muted-foreground">VAT ({vatNum}%)</dt>
            <dd className="text-right font-mono tabular-nums">{gbp(draftVat)}</dd>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="text-right font-mono font-semibold tabular-nums">{gbp(draftTotal)}</dd>
          </dl>

          <div className="grid gap-1.5">
            <Label htmlFor="inotes">Notes</Label>
            <Textarea id="inotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={create} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Create invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  const paymentDialog = (
    <Dialog open={payFor !== null} onOpenChange={(o) => !o && setPayFor(null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record payment{payFor ? ` on ${payFor.number || `invoice ${payFor.id}`}` : ""}</DialogTitle>
        </DialogHeader>
        {payFor && (
          <div className="grid gap-[14px]">
            <p className="text-sm text-muted-foreground">
              Record money you have checked has arrived. The amount must be the full total of {gbp(payFor.total)}
              {payFor.vat_rate > 0 ? " including VAT" : ""}; a part payment is a separate instalment invoice.
            </p>
            {payError && (
              <div role="alert" className="flex items-start gap-3 rounded-2xl border border-bad/30 bg-bad-soft p-[14px] text-sm text-foreground">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-bad" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p>{payError}</p>
                  {payExpected && payExpected !== payDraft.amount.trim() && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setPayDraft((d) => ({ ...d, amount: payExpected }))
                        setPayError(null)
                        setPayExpected(null)
                      }}
                    >
                      Use £{payExpected}
                    </Button>
                  )}
                </div>
              </div>
            )}
            <div className="grid gap-[14px] sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="pmethod">Method</Label>
                <Select value={payDraft.method} onValueChange={(v) => setPayDraft((d) => ({ ...d, method: v as PaymentMethod }))}>
                  <SelectTrigger id="pmethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pdate">Date paid</Label>
                <Input id="pdate" type="date" min={payFor.issued_at.slice(0, 10)} max={localIsoDate()} value={payDraft.paid_on} onChange={(e) => setPayDraft((d) => ({ ...d, paid_on: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pref">Reference{needsReference(payDraft.method) ? "" : " (optional)"}</Label>
                <Input id="pref" maxLength={100} value={payDraft.reference} onChange={(e) => setPayDraft((d) => ({ ...d, reference: e.target.value }))} placeholder={payDraft.method === "cheque" ? "Cheque number" : "As shown on the statement"} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pamount">Amount (£)</Label>
                <Input id="pamount" inputMode="decimal" value={payDraft.amount} onChange={(e) => setPayDraft((d) => ({ ...d, amount: e.target.value }))} />
              </div>
            </div>
            {(payProblem || payWarning) && (
              <p className={payProblem ? "text-sm text-muted-foreground" : "rounded-[10px] border border-warn/35 bg-warn-soft px-3 py-2 text-sm text-foreground"} aria-live="polite">
                {payProblem || payWarning}
              </p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setPayFor(null)}>
            Cancel
          </Button>
          <Button onClick={recordPayment} disabled={paySaving || payProblem !== null}>
            {paySaving && <Loader2 className="animate-spin" />}
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return (
    <div>
      {paymentDialog}
      <PageHeader
        title="Invoicing"
        subtitle="Invoices, payments and chasing, in pounds with VAT."
        actions={
          <>
            {newInvoiceDialog}
            <Button variant="outline" onClick={exportCsv} disabled={!items.length}>
              <Download /> CSV
            </Button>
            <Button variant="outline" onClick={exportXlsx} disabled={!items.length}>
              <Download /> XLSX
            </Button>
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Refresh
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        {error && (
          <div role="alert" className="flex flex-wrap items-start gap-3.5 rounded-2xl border border-bad/30 bg-bad-soft p-[18px] text-foreground">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-bad" aria-hidden="true" />
            <div className="min-w-[min(100%,200px)] flex-1">
              <p className="font-semibold">Invoices could not be loaded</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}. The invoices endpoint and database must be live on the server.</p>
            </div>
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Try again
            </Button>
          </div>
        )}

        {overdueClients.length > 0 && (
          <div role="status" className="flex flex-wrap items-start gap-3.5 rounded-2xl border border-warn/35 bg-warn-soft p-[18px] text-foreground">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden="true" />
            <p className="min-w-[min(100%,200px)] flex-1">
              <b>Work-pause flag:</b> {overdueClients.join(", ")} {overdueClients.length === 1 ? "has an overdue invoice" : "have overdue invoices"}.
              Studio policy is to pause delivery until it is settled. Chase it below.
            </p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <StatGrid className="mb-0">
            <StatTile label="Paid this month" value={gbp(paidThisMonth.sum)} note={plural(paidThisMonth.n, "invoice")} tone={paidThisMonth.n ? "up" : undefined} />
            <StatTile label="Outstanding" value={gbp(outstanding)} note={plural(outstandingCount, "invoice")} />
            <StatTile label="Overdue" value={gbp(overdue.sum)} note={plural(overdue.n, "invoice")} tone={overdue.n ? "down" : undefined} />
            <StatTile label="Drafts" value={String(counts.draft)} note="Not sent yet" />
          </StatGrid>
        )}

        {loading ? (
          <div className="overflow-hidden rounded-[14px] border bg-card">
            <TableSkeleton rows={5} cols={5} />
          </div>
        ) : error ? null : items.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices yet"
            description="Create one to bill a client."
            className="rounded-2xl border border-dashed border-line-strong bg-card py-14"
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className="inline-flex min-h-[34px] items-center whitespace-nowrap rounded-full border bg-card px-3 text-[13px] font-medium transition-colors hover:border-line-strong aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
                >
                  {f.label}
                  <span className="ml-1 font-mono text-[11px] tabular-nums opacity-70">{counts[f.key]}</span>
                </button>
              ))}
              <label className="flex min-h-10 min-w-0 max-w-[340px] flex-1 basis-[200px] items-center gap-2 rounded-[10px] border bg-card px-3 text-muted-foreground focus-within:border-acc focus-within:shadow-[0_0_0_3px_hsl(var(--os-acc-soft))]">
                <Search className="size-4 shrink-0" aria-hidden="true" />
                <span className="sr-only">Search invoices</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search invoices…"
                  className="w-full min-w-0 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </label>
            </div>

            <div className="overflow-hidden rounded-[14px] border bg-card">
              <Table className="min-w-[760px]">
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
                  {shown.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No invoices match this filter.
                      </TableCell>
                    </TableRow>
                  )}
                  {shown.map((inv) => (
                    <TableRow
                      key={inv.id}
                      id={recordElementId("invoice", inv.id)}
                      className={cn("scroll-m-4", inv.id === linkedInvoice && LINKED_ROW)}
                      aria-current={inv.id === linkedInvoice ? "true" : undefined}
                    >
                      <TableCell className="whitespace-nowrap font-mono font-semibold">{inv.number || `#${inv.id}`}</TableCell>
                      <TableCell className="min-w-[10rem] max-w-[16rem] [overflow-wrap:anywhere]">{inv.client_company || <span className="text-muted-foreground">No client</span>}</TableCell>
                      <TableCell>
                        <StatusBadge status={inv.overdue && inv.status !== "paid" ? "overdue" : inv.status} />
                        {inv.status === "paid" && recordedPaymentLine(inv) && (
                          <p className="mt-1 max-w-[14rem] text-xs text-muted-foreground [overflow-wrap:anywhere]">
                            {recordedPaymentLine(inv)}, {fmt(inv.paid_at)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {inv.due_at ? fmt(inv.due_at) : <span className="text-muted-foreground">{inv.status === "draft" ? "Not sent" : "No date"}</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                        {gbp(inv.total)}
                        {inv.vat_rate > 0 && <span className="ml-1 font-sans text-xs text-muted-foreground">inc. VAT</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" disabled={busyId === inv.id} onClick={() => downloadPdf(inv)} title="Download PDF" aria-label={`Download PDF of ${inv.number || `invoice ${inv.id}`}`}>
                            <FileDown />
                          </Button>
                          {inv.status === "draft" && (
                            <Button variant="ghost" size="sm" disabled={busyId === inv.id} onClick={() => setStatus(inv, "sent")}>
                              <Send /> Send
                            </Button>
                          )}
                          {inv.overdue && (
                            <Button variant="ghost" size="sm" disabled={busyId === inv.id} onClick={() => chase(inv)} title="Email the client a payment reminder">
                              <BellRing /> Chase
                            </Button>
                          )}
                          {inv.status !== "paid" && (
                            <Button variant="ghost" size="sm" disabled={busyId === inv.id} onClick={() => createPayLink(inv)} title="Create a Stripe payment link">
                              <CreditCard /> Pay link
                            </Button>
                          )}
                          {canRecordPayment(inv) && (
                            <Button variant="ghost" size="sm" disabled={busyId === inv.id} onClick={() => openPayment(inv)} title="Record a bank transfer, cash or cheque payment">
                              <Landmark /> Record payment
                            </Button>
                          )}
                          {inv.status !== "paid" && (
                            <Button variant="ghost" size="sm" disabled={busyId === inv.id} onClick={() => setStatus(inv, "paid")} title="Mark paid manually (no Stripe)">
                              <BadgePoundSterling /> Mark paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
