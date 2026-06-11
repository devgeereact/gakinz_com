import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, Plus, RefreshCw, Trash2, Send, Check, X } from "lucide-react"
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
  type ProposalStatus,
  type ProposalItemInput,
  type Client,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import AiAssist from "@/app/components/AiAssist"

const statusClass: Record<ProposalStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  accepted: "bg-accent text-accent-foreground",
  declined: "bg-destructive/10 text-destructive",
}

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)

type DraftItem = { description: string; qty: string; unit_price: string }
const blankItem: DraftItem = { description: "", qty: "1", unit_price: "" }

export default function Proposals() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Proposal[]>([])
  const [clientList, setClientList] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [clientId, setClientId] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [notes, setNotes] = useState("")
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

  const setLine = (i: number, k: keyof DraftItem, v: string) =>
    setLines((xs) => xs.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)))

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
      items: payloadItems,
    })
    setSaving(false)
    if (res.ok) {
      toast.success("Proposal created.")
      setTitle("")
      setClientId("")
      setValidUntil("")
      setNotes("")
      setLines([{ ...blankItem }])
      setOpen(false)
      load()
    } else {
      toast.error(res.error || "Could not create the proposal.")
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

  const accept = async (p: Proposal) => {
    setBusyId(p.id)
    const res = await proposals.accept(p.id)
    setBusyId(null)
    if (res.ok) {
      toast.success("Accepted — project created.")
      navigate("/app/projects")
    } else toast.error(res.error || "Could not accept.")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Proposals</h1>
          <p className="text-sm text-muted-foreground">
            Line-item quotes. Accepting one starts the project.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New proposal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>New proposal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="ptitle">Title</Label>
                    <Input id="ptitle" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
                  </div>
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
                </div>

                <div>
                  <Label>Line items</Label>
                  <div className="mt-1.5 space-y-2">
                    {lines.map((l, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          placeholder="Description"
                          value={l.description}
                          onChange={(e) => setLine(i, "description", e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={l.qty}
                          onChange={(e) => setLine(i, "qty", e.target.value)}
                          className="w-20"
                        />
                        <Input
                          type="number"
                          placeholder="Unit £"
                          value={l.unit_price}
                          onChange={(e) => setLine(i, "unit_price", e.target.value)}
                          className="w-28"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLines((xs) => (xs.length > 1 ? xs.filter((_, idx) => idx !== i) : xs))}
                          aria-label="Remove line"
                        >
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="pvalid">Valid until</Label>
                    <Input id="pvalid" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="mt-1.5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
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
                  <Textarea id="pnotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={create} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create proposal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the proposals endpoint and DB must be live on the server.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading proposals…
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No proposals yet. Create one to send a quote.
          </div>
        ) : (
          <Table>
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
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="text-muted-foreground">{p.client_company || "—"}</TableCell>
                  <TableCell>
                    <span className={cn("rounded px-2 py-0.5 text-xs font-medium", statusClass[p.status])}>{p.status}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium">{gbp(p.total)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {p.status === "draft" && (
                        <Button variant="ghost" size="sm" disabled={busyId === p.id} onClick={() => send(p)}>
                          <Send className="mr-1 h-3.5 w-3.5" /> Send
                        </Button>
                      )}
                      {p.status === "sent" && (
                        <>
                          <Button variant="ghost" size="sm" disabled={busyId === p.id} onClick={() => accept(p)}>
                            <Check className="mr-1 h-3.5 w-3.5" /> Accept
                          </Button>
                          <Button variant="ghost" size="sm" disabled={busyId === p.id} onClick={() => decline(p)}>
                            <X className="mr-1 h-3.5 w-3.5" /> Decline
                          </Button>
                        </>
                      )}
                      {p.status === "accepted" && <span className="text-xs text-muted-foreground">Project started</span>}
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
