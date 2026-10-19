import { useEffect, useRef, useState } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import { AlertCircle, Clock, Loader2, Plus, RefreshCw, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader, StatusBadge } from "@/app/components/page-kit"
import { TableSkeleton } from "@/app/components/TableSkeleton"
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
import { hoursMinutes, localIsoDate, formatYmd } from "@/lib/format"
import { linkMark, supportLink } from "@/lib/deepLink"
import { notAvailableYet } from "@/lib/notAvailable"
import { useApplyLink } from "@/hooks/use-reveal"
import AiAssist from "@/app/components/AiAssist"

const STATUSES: { key: TicketStatus; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In progress" },
  { key: "resolved", label: "Resolved" },
]
const PRIORITIES: TicketPriority[] = ["urgent", "high", "normal", "low"]

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function fmt(d: string) {
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

export default function Support() {
  const [items, setItems] = useState<Ticket[]>([])
  const [clientList, setClientList] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [filter, setFilter] = useState<"all" | TicketStatus>("all")

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

  // ?ticket=<id> (from a ticket's time on the Time screen) opens that ticket
  // once the list has loaded, and again whenever the link changes or is
  // re-sent (useApplyLink). An id that is not listed leaves the plain screen.
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const link = supportLink(searchParams)
  useApplyLink(linkMark(link, location.state), !loading && error === null, () => {
    if (link.ticket !== null && items.some((t) => t.id === link.ticket)) {
      setFilter("all")
      setSelectedId(link.ticket)
    }
  })

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

  const counts = {
    all: items.length,
    open: items.filter((t) => t.status === "open").length,
    in_progress: items.filter((t) => t.status === "in_progress").length,
    resolved: items.filter((t) => t.status === "resolved").length,
  }
  const shown = filter === "all" ? items : items.filter((t) => t.status === filter)

  return (
    <div>
      <PageHeader
        title="Support"
        subtitle="Client issues, tracked to resolution."
        actions={
          <>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> New ticket
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
                    <Label htmlFor="support-sel1">Client</Label>
                    <Select value={form.client_id} onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))}>
                      <SelectTrigger id="support-sel1" className="mt-1.5">
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
                    <Label htmlFor="support-sel2">Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as TicketPriority }))}>
                      <SelectTrigger id="support-sel2" className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {cap(p)}
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
                  {saving && <Loader2 className="animate-spin" />}
                  Create ticket
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={load}>
            <RefreshCw /> Refresh
          </Button>
          </>
        }
      />

      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-start gap-3.5 rounded-2xl border border-bad/30 bg-bad-soft p-[18px] text-foreground">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-bad" />
          <div className="min-w-[min(100%,200px)] flex-1">
            <p className="font-semibold">Could not load support tickets.</p>
            <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {error}. The support endpoint and database must be live on the server.
            </p>
          </div>
          <Button variant="outline" onClick={load}>
            <RefreshCw /> Try again
          </Button>
        </div>
      )}

      {/* Status filter chips */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
        {(
          [
            ["all", "All"],
            ["open", "Open"],
            ["in_progress", "In progress"],
            ["resolved", "Resolved"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            aria-pressed={filter === k}
            onClick={() => setFilter(k)}
            className={cn(
              "inline-flex min-h-[34px] items-center whitespace-nowrap rounded-full border bg-card px-3 text-[13px] font-medium transition-colors hover:border-line-strong",
              filter === k && "border-foreground bg-foreground text-background hover:border-foreground",
            )}
          >
            {l}
            <span className="ml-1 font-mono text-[11px] tabular-nums opacity-70">{counts[k]}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        {/* Ticket list */}
        <div className="min-w-0 self-start rounded-2xl border bg-card p-1.5">
          {loading ? (
            <TableSkeleton rows={5} cols={2} />
          ) : items.length === 0 ? (
            <p className="px-4 py-10 text-center text-muted-foreground">No tickets. Raise one above.</p>
          ) : shown.length === 0 ? (
            <p className="px-4 py-10 text-center text-muted-foreground">No tickets with this status.</p>
          ) : (
            <ul>
              {shown.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    aria-current={selectedId === t.id ? "true" : undefined}
                    className={cn(
                      "flex w-full flex-col items-start gap-1 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none",
                      selectedId === t.id && "bg-secondary",
                    )}
                  >
                    <span className="flex w-full items-start gap-2">
                      <b className="min-w-0 flex-1 font-semibold [overflow-wrap:anywhere]">{t.subject}</b>
                      <StatusBadge status={t.priority} />
                    </span>
                    <span className="text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                      {t.client_company || "No client"} · {fmt(t.created_at)}
                    </span>
                    <StatusBadge status={t.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div className="min-w-0 rounded-2xl border bg-card p-[18px]">
          {selectedId ? (
            <TicketPanel key={selectedId} id={selectedId} onChanged={onListChanged} />
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center text-center text-muted-foreground">
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
  const reqRef = useRef(0) // newest load; drops out-of-order responses on fast ticket switches

  const load = async () => {
    const my = ++reqRef.current
    setLoading(true)
    const res = await support.get(id)
    if (reqRef.current !== my) return // a newer ticket was opened — ignore this stale response
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
      <div role="status" className="grid gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-20 w-full" />
        <span className="sr-only">Loading ticket…</span>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3.5 flex flex-wrap items-end gap-2.5">
        <div className="min-w-[min(100%,200px)] flex-1">
          <p className="font-mono text-xs uppercase tracking-[.08em] text-muted-foreground [overflow-wrap:anywhere]">
            {ticket.client_company || "No client"} · {cap(ticket.priority)}
          </p>
          <h2 className="mt-1 font-display text-[1.3rem] font-semibold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere]">{ticket.subject}</h2>
        </div>
        <div className="grid min-w-[140px] gap-1.5 max-sm:flex-1">
          <Label htmlFor="tst">Status</Label>
          <Select value={ticket.status} onValueChange={(v) => changeStatus(v as TicketStatus)}>
            <SelectTrigger id="tst">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid min-w-[120px] gap-1.5 max-sm:flex-1">
          <Label htmlFor="tpr">Priority</Label>
          <Select value={ticket.priority} onValueChange={(v) => changePriority(v as TicketPriority)}>
            <SelectTrigger id="tpr">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {cap(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ul className="m-0 flex-1 list-none p-0">
        {ticket.body && (
          <li className="grid grid-cols-[20px_minmax(0,1fr)] gap-2.5 py-2">
            <span aria-hidden className="ml-[5px] mt-1.5 h-[9px] w-[9px] rounded-full bg-line-strong shadow-[0_0_0_3px_hsl(var(--card))]" />
            <span className="min-w-0 [overflow-wrap:anywhere]">
              <b className="font-semibold">{ticket.client_company || "Client"}</b>
              <small className="text-[12.5px] text-muted-foreground"> · {fmt(ticket.created_at)}</small>
              <br />
              <span className="whitespace-pre-line">{ticket.body}</span>
            </span>
          </li>
        )}
        {ticket.replies.map((r) => (
          <li key={r.id} className="grid grid-cols-[20px_minmax(0,1fr)] gap-2.5 py-2">
            <span aria-hidden className="ml-[5px] mt-1.5 h-[9px] w-[9px] rounded-full bg-acc shadow-[0_0_0_3px_hsl(var(--card))]" />
            <span className="min-w-0 [overflow-wrap:anywhere]">
              <b className="font-semibold">{r.author || "Staff"}</b>
              <small className="text-[12.5px] text-muted-foreground"> · {fmt(r.created_at)}</small>
              <br />
              <span className="whitespace-pre-line">{r.body}</span>
            </span>
          </li>
        ))}
        {ticket.replies.length === 0 && !ticket.body && (
          <li className="py-2 text-sm text-muted-foreground">No messages yet.</li>
        )}
      </ul>

      <div className="mt-3">
        <Label htmlFor="treply" className="sr-only">
          Reply
        </Label>
        <Textarea
          id="treply"
          rows={4}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, as before; Shift+Enter starts a new line.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              sendReply()
            }
          }}
          placeholder="Write a reply…"
        />
      </div>
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <AiAssist
          task="ticket_reply"
          title="Draft a reply"
          label="AI draft"
          size="default"
          input={`Support ticket: ${ticket.subject}\n\nDetails: ${ticket.body || "(none)"}\n\nThread so far:\n${ticket.replies.map((r) => `${r.author || "Staff"}: ${r.body}`).join("\n") || "(no replies yet)"}\n\nDraft the next staff reply to the client: acknowledge the issue, state what we will do or have done, and give a clear next step.`}
          onUse={(text) => setReply(text)}
        />
        <Button onClick={sendReply} disabled={sending}>
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
          Send reply
        </Button>
      </div>

      <TicketTimeSection ticket={ticket} onLogged={load} />
    </div>
  )
}

/**
 * IT support time for one ticket (SQL 17). Logged time goes onto the client's
 * standing "IT support" project, which the server creates on the first log.
 * Hidden while the server has no ticket time (`time` null or missing, or the
 * log route answers as not available yet). Staff only: a client never sees it.
 */
function TicketTimeSection({ ticket, onLogged }: { ticket: TicketDetail; onLogged: () => void }) {
  const [minutes, setMinutes] = useState("")
  const [desc, setDesc] = useState("")
  const [billable, setBillable] = useState(true)
  const [saving, setSaving] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  const time = ticket.time
  if (!time || unavailable) return null

  const log = async () => {
    const mins = Number(minutes)
    if (!Number.isInteger(mins) || mins <= 0) return toast.error("Enter the minutes spent, as a whole number above zero.")
    setSaving(true)
    const res = await support.logTime({
      id: ticket.id,
      minutes: mins,
      description: desc.trim() || undefined,
      billable,
      entry_date: localIsoDate(),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(res.data.project_created ? "Time logged. The client's IT support project was created for it." : "Time logged.")
      setMinutes("")
      setDesc("")
      onLogged()
    } else if (notAvailableYet(res)) {
      setUnavailable(true)
      toast.info("Logging time on a ticket is not available yet.")
    } else {
      toast.error(res.error || "Could not log the time.")
    }
  }

  return (
    <section className="mt-5 border-t pt-4" aria-labelledby={`ttime-${ticket.id}`}>
      <div className="mb-2.5 flex flex-wrap items-baseline gap-2">
        <h3 id={`ttime-${ticket.id}`} className="flex items-center gap-2 font-semibold">
          <Clock aria-hidden className="h-4 w-4 text-muted-foreground" /> Logged time
        </h3>
        <span className="text-[13px] text-muted-foreground">
          Total <b className="font-mono font-semibold tabular-nums text-foreground">{hoursMinutes(time.total_minutes)}</b>
        </span>
      </div>

      {time.entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No time logged on this ticket yet.</p>
      ) : (
        <ul className="m-0 list-none divide-y p-0">
          {time.entries.map((e) => (
            <li key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-2">
              <span className="min-w-0 [overflow-wrap:anywhere]">
                <span className="block">{e.description || <span className="text-muted-foreground">No description</span>}</span>
                <small className="text-[12.5px] text-muted-foreground">
                  {formatYmd(e.entry_date)} · {e.user_name || "Unknown"} · {e.billable ? "Billable" : "Internal"}
                </small>
              </span>
              <span className="flex flex-col items-end gap-1">
                <span className="font-mono text-sm tabular-nums">{hoursMinutes(e.minutes)}</span>
                <StatusBadge status={e.status === "approved" ? "approved" : e.status === "rejected" ? "rejected" : "pending"} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {ticket.client_id === null ? (
        <p className="mt-3 text-sm text-muted-foreground">
          This ticket has no client, so time logged on it would have nobody to bill.
        </p>
      ) : (
        <div className="mt-3 grid items-end gap-3 sm:grid-cols-[7rem_minmax(0,1fr)_auto_auto]">
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor={`ttmin-${ticket.id}`}>Minutes</Label>
            <Input id={`ttmin-${ticket.id}`} type="number" inputMode="numeric" min={1} step={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor={`ttdesc-${ticket.id}`}>What did you do?</Label>
            <Input id={`ttdesc-${ticket.id}`} maxLength={300} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="flex min-h-[40px] items-center gap-2">
            <Switch id={`ttbill-${ticket.id}`} checked={billable} onCheckedChange={setBillable} />
            <Label htmlFor={`ttbill-${ticket.id}`} className="cursor-pointer">Billable</Label>
          </div>
          <Button onClick={log} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Plus />}
            Log time
          </Button>
          <p className="text-[13px] text-muted-foreground sm:col-span-4">
            Goes on {ticket.client_company || "the client"}&apos;s IT support project as a draft, for approval on the Time screen.
          </p>
        </div>
      )}
    </section>
  )
}
