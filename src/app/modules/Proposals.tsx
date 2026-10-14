import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, Plus, RefreshCw, Trash2, Send, Check, X, Share2, Eye, AlertCircle, FileText } from "lucide-react"
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
  proposals,
  clients as clientsApi,
  type Proposal,
  type ProposalItemInput,
  type Client,
} from "@/lib/api"
import AiAssist from "@/app/components/AiAssist"
import { PageHeader, StatGrid, StatTile, StatusBadge } from "@/app/components/page-kit"
import { EmptyState } from "@/app/components/EmptyState"
import { TableSkeleton } from "@/app/components/TableSkeleton"

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * The schedule proposals.php creates on acceptance: 40/30/30 of the ex-VAT
 * subtotal, due today, +30 and +60 days, each invoice carrying the quote's VAT.
 * Mirrors the server so the owner sees exactly what will be created.
 */
function acceptanceSchedule(p: Proposal) {
  const deposit = round2(p.total * 0.4)
  const stage = round2(p.total * 0.3)
  const final = round2(p.total - deposit - stage)
  const due = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  }
  return [
    { label: "Deposit (40%)", net: deposit, due: due(0) },
    { label: "Stage payment (30%)", net: stage, due: due(30) },
    { label: "Final payment (30%)", net: final, due: due(60) },
  ].map((r) => ({ ...r, gross: round2(r.net + round2((r.net * p.vat_rate) / 100)) }))
}

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

type DraftItem = { description: string; qty: string; unit_price: string }
const blankItem: DraftItem = { description: "", qty: "1", unit_price: "" }

export default function Proposals() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Proposal[]>([])
  const [clientList, setClientList] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [confirming, setConfirming] = useState<Proposal | null>(null)

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [clientId, setClientId] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [notes, setNotes] = useState("")
  const [vatRate, setVatRate] = useState("20") // carried onto the 40/30/30 invoices
  const [lines, setLines] = useState<DraftItem[]>([{ ...blankItem }])
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await proposals.list()
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

  const draftTotal = lines.reduce(
    (sum, l) => sum + (parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0),
    0,
  )
  const vatNum = Math.max(0, Math.min(100, parseFloat(vatRate) || 0))
  const draftVat = draftTotal * (vatNum / 100)

  const setLine = (i: number, k: keyof DraftItem, v: string) =>
    setLines((xs) => xs.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)))

  // Tiles, from the loaded list. Quote totals are ex VAT, as stored.
  const sent = items.filter((p) => p.status === "sent")
  const accepted = items.filter((p) => p.status === "accepted")
  const declined = items.filter((p) => p.status === "declined").length
  const decided = accepted.length + declined
  const winRate = decided ? Math.round((accepted.length / decided) * 100) : 0
  const drafts = items.filter((p) => p.status === "draft").length
  const sum = (xs: Proposal[]) => xs.reduce((s, p) => s + p.total, 0)

  const create = async () => {
    if (!title.trim()) return toast.error("A title is required.")
    const payloadItems: ProposalItemInput[] = lines
      .filter((l) => l.description.trim())
      .map((l) => ({ description: l.description.trim(), qty: parseFloat(l.qty) || 1, unit_price: parseFloat(l.unit_price) || 0 }))
    if (payloadItems.length === 0) return toast.error("Add at least one line item.")

    setSaving(true)
    const res = await proposals.create({
      title,
      client_id: clientId ? Number(clientId) : null,
      valid_until: validUntil || undefined,
      notes,
      vat_rate: vatNum,
      items: payloadItems,
    })
    setSaving(false)
    if (res.ok) {
      toast.success("Quote created as a draft.")
      setTitle("")
      setClientId("")
      setValidUntil("")
      setNotes("")
      setVatRate("20")
      setLines([{ ...blankItem }])
      setOpen(false)
      load()
    } else {
      toast.error(res.error || "Could not create the quote.")
    }
  }

  const send = async (p: Proposal) => {
    setBusyId(p.id)
    const res = await proposals.setStatus(p.id, "sent")
    setBusyId(null)
    if (res.ok) {
      setItems((xs) => xs.map((x) => (x.id === p.id ? { ...x, status: "sent" } : x)))
    } else toast.error(res.error || "Could not send.")
  }

  const decline = async (p: Proposal) => {
    setBusyId(p.id)
    const res = await proposals.setStatus(p.id, "declined")
    setBusyId(null)
    if (res.ok) {
      setItems((xs) => xs.map((x) => (x.id === p.id ? { ...x, status: "declined" } : x)))
    } else toast.error(res.error || "Could not decline.")
  }

  const share = async (p: Proposal) => {
    setBusyId(p.id)
    const res = await proposals.share(p.id)
    setBusyId(null)
    if (res.ok) {
      const url = `${window.location.origin}/p/${res.data.token}`
      setItems((xs) => xs.map((x) => (x.id === p.id ? { ...x, share_token: res.data.token } : x)))
      try {
        await navigator.clipboard.writeText(url)
        toast.success("Public link copied to clipboard.")
      } catch {
        toast.success(`Public link: ${url}`)
      }
    } else toast.error(res.error || "Could not create a link.")
  }

  const accept = async (p: Proposal) => {
    setConfirming(null)
    setBusyId(p.id)
    const res = await proposals.accept(p.id)
    setBusyId(null)
    if (res.ok) {
      const n = res.data.invoices?.length ?? 0
      toast.success(n > 0 ? `Accepted. Project and ${n} invoices (40/30/30) created.` : "Accepted. Project created.")
      navigate("/app/projects")
    } else toast.error(res.error || "Could not accept.")
  }

  const newQuoteDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> New quote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New quote</DialogTitle>
        </DialogHeader>
        <div className="grid gap-[14px]">
          <div className="grid gap-[14px] sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ptitle">Title</Label>
              <Input id="ptitle" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
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
          </div>

          <div className="grid gap-1.5">
            <Label>Line items</Label>
            <div className="grid gap-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_auto]">
                  <Input
                    className="col-span-3 sm:col-span-1"
                    aria-label="Description"
                    placeholder="Description"
                    value={l.description}
                    onChange={(e) => setLine(i, "description", e.target.value)}
                  />
                  <Input
                    aria-label="Quantity"
                    type="number"
                    placeholder="Qty"
                    value={l.qty}
                    onChange={(e) => setLine(i, "qty", e.target.value)}
                  />
                  <Input
                    aria-label="Unit price in pounds"
                    type="number"
                    placeholder="Unit £"
                    value={l.unit_price}
                    onChange={(e) => setLine(i, "unit_price", e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLines((xs) => (xs.length > 1 ? xs.filter((_, idx) => idx !== i) : xs))}
                    aria-label="Remove line"
                  >
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

          <div className="grid gap-[14px] sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="pvalid">Valid until</Label>
              <Input id="pvalid" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pvat">VAT rate (%)</Label>
              <Input id="pvat" type="number" min="0" max="100" step="0.5" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
            </div>
          </div>

          <dl className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-x-4 gap-y-2.5 rounded-2xl border bg-secondary p-[18px] text-sm" aria-live="polite">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="text-right font-mono tabular-nums">{gbp(draftTotal)}</dd>
            {vatNum > 0 && (
              <>
                <dt className="text-muted-foreground">VAT ({vatNum}%)</dt>
                <dd className="text-right font-mono tabular-nums">{gbp(draftVat)}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Total</dt>
            <dd className="text-right font-mono font-semibold tabular-nums">{gbp(draftTotal + draftVat)}</dd>
          </dl>

          <div className="grid gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="pnotes">Notes / scope</Label>
              <AiAssist
                task="proposal_scope"
                title="Draft the scope"
                label="AI scope"
                variant="ghost"
                input={`Proposal title: ${title || "(untitled)"}.\nLine items:\n${lines.filter((l) => l.description.trim()).map((l) => `- ${l.description} (qty ${l.qty || 1}, £${l.unit_price || 0})`).join("\n") || "(none yet)"}\n\nWrite a short, plain-English scope paragraph for this proposal: what GAkinz will deliver, what is included, and one line on what is out of scope. UK English, no marketing filler.`}
                onUse={(text) => setNotes(text)}
              />
            </div>
            <Textarea id="pnotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={create} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Create quote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return (
    <div>
      <PageHeader
        title="Quotes"
        subtitle="Line-item quotes. Accepting one starts the project."
        actions={
          <>
            {newQuoteDialog}
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
              <p className="font-semibold">Quotes could not be loaded</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}. The proposals endpoint and database must be live on the server.</p>
            </div>
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Try again
            </Button>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <StatGrid className="mb-0">
            <StatTile label="Sent, awaiting reply" value={gbp(sum(sent))} note={plural(sent.length, "quote")} />
            <StatTile label="Accepted" value={gbp(sum(accepted))} note={plural(accepted.length, "quote")} tone={accepted.length ? "up" : undefined} />
            <StatTile label="Win rate" value={`${winRate}%`} note="Of decided quotes" />
            <StatTile label="Drafts" value={String(drafts)} note="Not sent yet" />
          </StatGrid>
        )}

        {loading ? (
          <div className="overflow-hidden rounded-[14px] border bg-card">
            <TableSkeleton rows={4} cols={4} />
          </div>
        ) : error ? null : items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No quotes yet"
            description="Create one to send a quote."
            className="rounded-2xl border border-dashed border-line-strong bg-card py-14"
          />
        ) : (
          <div className="overflow-hidden rounded-[14px] border bg-card">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="min-w-[12rem] font-semibold [overflow-wrap:anywhere]">{p.title}</TableCell>
                    <TableCell className="min-w-[9rem] [overflow-wrap:anywhere]">{p.client_company || <span className="text-muted-foreground">No client</span>}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">{gbp(p.total)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.views > 0 && (
                          <span className="mr-1 inline-flex items-center gap-1 whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground" title={p.last_viewed_at ? `Last viewed ${new Date(p.last_viewed_at.replace(" ", "T")).toLocaleString("en-GB")}` : undefined}>
                            <Eye className="size-3.5" aria-hidden="true" /> {p.views}
                            <span className="sr-only">{p.views === 1 ? "view" : "views"}</span>
                          </span>
                        )}
                        <Button variant="ghost" size="sm" disabled={busyId === p.id} onClick={() => share(p)} title="Copy a public read-only link">
                          <Share2 /> {p.share_token ? "Copy link" : "Share"}
                        </Button>
                        {p.status === "draft" && (
                          <Button variant="ghost" size="sm" disabled={busyId === p.id} onClick={() => send(p)}>
                            <Send /> Send
                          </Button>
                        )}
                        {p.status === "sent" && (
                          <>
                            <Button variant="ghost" size="sm" disabled={busyId === p.id} onClick={() => setConfirming(p)}>
                              <Check /> Accept
                            </Button>
                            <Button variant="ghost" size="sm" disabled={busyId === p.id} onClick={() => decline(p)}>
                              <X /> Decline
                            </Button>
                          </>
                        )}
                        {p.status === "accepted" && <span className="whitespace-nowrap px-3 text-xs text-muted-foreground">Project started</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={confirming !== null} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Accept “{confirming?.title}”?</DialogTitle>
          </DialogHeader>
          {confirming && (
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                Only accept once the client has agreed this exact quote. This creates one project and these three invoices
                {confirming.vat_rate > 0 ? `, each with VAT at ${confirming.vat_rate}%` : ""}. Accepted terms cannot be changed afterwards.
              </p>
              <div className="divide-y">
                {acceptanceSchedule(confirming).map((r) => (
                  <div key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="min-w-0">
                      {r.label}
                      <span className="block text-[13px] text-muted-foreground">Due {r.due}</span>
                    </span>
                    <span className="whitespace-nowrap font-mono font-semibold tabular-nums">{gbp(r.gross)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirming(null)}>Cancel</Button>
            <Button onClick={() => confirming && accept(confirming)} disabled={confirming !== null && busyId === confirming.id}>
              <Check /> Accept and create project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
