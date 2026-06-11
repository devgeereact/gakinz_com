import { useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, Send } from "lucide-react"
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
  support,
  clients as clientsApi,
  type Ticket,
  type TicketDetail,
  type TicketStatus,
  type TicketPriority,
  type Client,
} from "@/lib/api"
import { cn } from "@/lib/utils"

const STATUSES: { key: TicketStatus; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In progress" },
  { key: "resolved", label: "Resolved" },
]
const PRIORITIES: TicketPriority[] = ["urgent", "high", "normal", "low"]

const priorityClass: Record<TicketPriority, string> = {
  urgent: "bg-destructive/10 text-destructive",
  high: "bg-primary/10 text-primary",
  normal: "bg-muted text-muted-foreground",
  low: "bg-secondary text-secondary-foreground",
}
const statusClass: Record<TicketStatus, string> = {
  open: "bg-primary/10 text-primary",
  in_progress: "bg-accent text-accent-foreground",
  resolved: "bg-muted text-muted-foreground",
}

function fmt(d: string) {
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

export default function Support() {
  const [items, setItems] = useState<Ticket[]>([])
  const [clientList, setClientList] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ subject: "", client_id: "", priority: "normal" as TicketPriority, body: "" })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await support.list()
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

  const create = async () => {
    if (!form.subject.trim()) return toast.error("A subject is required.")
    setSaving(true)
    const res = await support.create({
      subject: form.subject,
      body: form.body || undefined,
      client_id: form.client_id ? Number(form.client_id) : null,
      priority: form.priority,
    })
    setSaving(false)
    if (res.ok) {
      toast.success("Ticket created.")
      setForm({ subject: "", client_id: "", priority: "normal", body: "" })
      setOpen(false)
      load()
    } else {
      toast.error(res.error || "Could not create the ticket.")
    }
  }

  const onListChanged = () => load()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
          <p className="text-sm text-muted-foreground">Client issues, tracked to resolution.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New ticket
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New ticket</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tsubject">Subject</Label>
                  <Input id="tsubject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="mt-1.5" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Client</Label>
                    <Select value={form.client_id} onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))}>
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
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as TicketPriority }))}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="tbody">Details</Label>
                  <Textarea id="tbody" rows={3} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} className="mt-1.5" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={create} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create ticket
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the support endpoint and DB must be live on the server.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        {/* Ticket list */}
        <div className="rounded-xl border border-border bg-card">
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading tickets…
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No tickets. Raise one above.</div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors hover:bg-accent/40",
                      selectedId === t.id && "bg-accent/50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{t.subject}</span>
                      <span className={cn("rounded px-2 py-0.5 text-xs font-medium", priorityClass[t.priority])}>{t.priority}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn("rounded px-1.5 py-0.5", statusClass[t.status])}>{t.status.replace("_", " ")}</span>
                      <span>{t.client_company || "No client"}</span>
                      <span>· {fmt(t.created_at)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div className="rounded-xl border border-border bg-card p-5">
          {selectedId ? (
            <TicketPanel key={selectedId} id={selectedId} onChanged={onListChanged} />
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center text-sm text-muted-foreground">
              Select a ticket to view the thread.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TicketPanel({ id, onChanged }: { id: number; onChanged: () => void }) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await support.get(id)
    if (res.ok) setTicket(res.data)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const changeStatus = async (status: TicketStatus) => {
    if (!ticket) return
    setTicket({ ...ticket, status })
    const res = await support.setStatus(id, status)
    if (res.ok) onChanged()
    else toast.error(res.error || "Could not update.")
  }
  const changePriority = async (priority: TicketPriority) => {
    if (!ticket) return
    setTicket({ ...ticket, priority })
    const res = await support.setPriority(id, priority)
    if (res.ok) onChanged()
    else toast.error(res.error || "Could not update.")
  }
  const sendReply = async () => {
    if (!reply.trim()) return
    setSending(true)
    const res = await support.reply(id, reply.trim())
    setSending(false)
    if (res.ok) {
      setReply("")
      load()
      onChanged()
    } else {
      toast.error(res.error || "Could not send the reply.")
    }
  }

  if (loading || !ticket) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading ticket…
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border pb-4">
        <h2 className="text-lg font-semibold">{ticket.subject}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{ticket.client_company || "No client"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Select value={ticket.status} onValueChange={(v) => changeStatus(v as TicketStatus)}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.key} value={s.key} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ticket.priority} onValueChange={(v) => changePriority(v as TicketPriority)}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {ticket.body && (
          <div className="rounded-lg bg-muted/40 p-3 text-sm">{ticket.body}</div>
        )}
        {ticket.replies.map((r) => (
          <div key={r.id} className="rounded-lg border border-border p-3 text-sm">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{r.author || "Staff"}</span>
              <span>{fmt(r.created_at)}</span>
            </div>
            {r.body}
          </div>
        ))}
        {ticket.replies.length === 0 && !ticket.body && (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        )}
      </div>

      <div className="flex gap-2 border-t border-border pt-4">
        <Input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendReply()}
          placeholder="Write a reply…"
        />
        <Button onClick={sendReply} disabled={sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
