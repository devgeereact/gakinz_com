import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, CreditCard, ArrowLeft, Send, Plus, Eye, Link2Off, MessageSquarePlus } from "lucide-react"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  portal,
  invoices,
  clients as clientsApi,
  clientMessages,
  MESSAGE_BODY_MAX,
  MESSAGE_SUBJECT_MAX,
  type PortalData,
  type Client,
  type ClientThread,
} from "@/lib/api"
import { feedback as feedbackApi } from "@/lib/api"
import { FeedbackFields } from "@/app/components/ClientFeedback"
import { PortalRequests } from "@/app/components/PortalRequests"
import { PortalAssets } from "@/app/components/AssetChecklist"
import { EMPTY_FEEDBACK, feedbackPayload, feedbackReady, type FeedbackFormState } from "@/app/modules/bookingModel"
import { useAuth } from "@/store/auth.store"
import { EmptyState, LoadError } from "@/app/components/EmptyState"
import { PageHeader, StatusBadge } from "@/app/components/page-kit"
import { cn } from "@/lib/utils"

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)

function fmt(d: string | null) {
  if (!d) return "—"
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function fmtShort(d: string) {
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

export default function Portal() {
  // A `client`-role login sees only its OWN portal: no picker, and the server
  // derives the client from the token. Staff get the picker to preview any client.
  const user = useAuth((s) => s.user)
  const isClient = user?.role === "client"

  const [clientList, setClientList] = useState<Client[]>([])
  const [clientId, setClientId] = useState("")
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payId, setPayId] = useState<number | null>(null)
  // Bumped by "Try again" to re-run the loads below with the same inputs.
  const [attempt, setAttempt] = useState(0)
  // The client's New message form, opened from the page header.
  const [composing, setComposing] = useState(false)
  // The client's message threads, loaded once here and shared by Requests (its
  // open update requests) and Messages, so the portal fetches them once and a
  // reload after an update request never remounts Messages or loses a draft.
  const [threads, setThreads] = useState<ClientThread[] | null>(null)
  const [threadsError, setThreadsError] = useState<string | null>(null)
  const applyThreads = useCallback((res: Awaited<ReturnType<typeof clientMessages.list>>) => {
    if (res.ok) {
      setThreads(res.data)
      setThreadsError(null)
    } else {
      setThreadsError(res.error)
    }
  }, [])
  const loadThreads = useCallback(() => clientMessages.list().then(applyThreads), [applyThreads])

  // Open a Stripe Checkout link for an outstanding invoice (webhook settles it).
  const payNow = async (invoiceId: number) => {
    setPayId(invoiceId)
    const res = await invoices.payLink(invoiceId)
    setPayId(null)
    if (res.ok) {
      window.open(res.data.url, "_blank", "noopener")
    } else {
      toast.error(res.error || "Could not open the payment page.")
    }
  }

  const outstanding = data
    ? data.invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + i.total, 0)
    : 0
  // The earliest-due unpaid invoice, offered as the welcome card's Pay button.
  const nextDue = data
    ? ([...data.invoices]
        .filter((i) => i.status !== "paid" && i.total > 0)
        .sort((a, b) => (a.due_at ?? "9999").localeCompare(b.due_at ?? "9999"))[0] ?? null)
    : null

  useEffect(() => {
    if (isClient) {
      // Load own portal; the server ignores the param and derives from the token.
      if (user?.client_id != null) setClientId(String(user.client_id))
      return
    }
    clientsApi.list().then((r) => {
      if (r.ok) setClientList(r.data)
      else setError(r.error)
    })
  }, [isClient, user?.client_id, attempt])

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
  }, [clientId, attempt])

  useEffect(() => {
    if (!isClient) return
    let live = true
    clientMessages.list().then((res) => {
      if (live) applyThreads(res)
    })
    return () => {
      live = false
    }
  }, [isClient, applyThreads])

  const retry = () => {
    setError(null)
    setAttempt((n) => n + 1)
  }

  return (
    <div>
      <PageHeader
        title={isClient ? "Your Portal" : "Client Portal"}
        subtitle={
          isClient
            ? "Your projects, invoices and support in one place."
            : "What a client sees: their projects, invoices and tickets. Pick a client to preview."
        }
        actions={
          isClient && user?.client_id != null ? (
            <Button onClick={() => setComposing(true)} disabled={composing}>
              <Plus /> New message
            </Button>
          ) : undefined
        }
      />

      {!isClient && (
        <div className="mb-3.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex min-h-10 w-full min-w-0 max-w-[360px] items-center gap-2 rounded-[10px] border bg-card pl-3 focus-within:border-acc focus-within:ring-[3px] focus-within:ring-acc-soft">
            <span id="portal-preview-label" className="whitespace-nowrap text-muted-foreground">
              Previewing
            </span>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger
                aria-labelledby="portal-preview-label"
                className="h-auto min-h-[38px] min-w-0 flex-1 whitespace-normal border-0 bg-transparent text-left shadow-none focus:shadow-none [&>span]:line-clamp-none [&>span]:[overflow-wrap:anywhere]"
              >
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
          <span className="text-[13px] text-muted-foreground">Clients only ever see their own records.</span>
        </div>
      )}

      {error && (
        <LoadError
          what={isClient ? "your portal" : "the portal"}
          detail={`${error}. The portal endpoint and database must be live on the server.`}
          onRetry={retry}
          className="mb-4"
        />
      )}

      {loading && !data && (
        <div aria-busy="true" aria-label="Loading portal" className="grid gap-4">
          <Skeleton className="h-[92px] rounded-2xl" />
          <div className="grid gap-4 min-[901px]:grid-cols-2">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
      )}

      {!isClient && !clientId && !error && (
        <EmptyState
          className="rounded-2xl border border-dashed border-line-strong bg-card py-14" icon={Eye} title="Choose a client to preview" description="Pick a client above to see their portal exactly as they do." />
      )}

      {isClient && user?.client_id == null && !error && (
        <EmptyState
          className="rounded-2xl border border-dashed border-line-strong bg-card py-14" icon={Link2Off} title="Your account isn’t linked to a client yet" description="Please contact GAkinz and we will link it." />
      )}

      {data && (
        <div className={cn("grid gap-4", loading && "opacity-60")} aria-busy={loading || undefined}>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-[18px]">
            <div className="min-w-0">
              <p className="font-mono text-[11.5px] uppercase tracking-[.06em] text-muted-foreground">Welcome</p>
              <h2 className="mt-1 font-display text-[1.6rem] font-semibold leading-tight tracking-[-0.025em] [overflow-wrap:anywhere]">
                {data.client.company}
              </h2>
            </div>
            {nextDue ? (
              <Button onClick={() => payNow(nextDue.id)} disabled={payId === nextDue.id}>
                {payId === nextDue.id ? <Loader2 className="animate-spin" /> : <CreditCard />}
                Pay {gbp(nextDue.total)}
                {nextDue.due_at ? ` due ${fmtShort(nextDue.due_at)}` : ""}
              </Button>
            ) : (
              <StatusBadge status="paid">Nothing to pay</StatusBadge>
            )}
          </div>

          <div className="grid gap-4 min-[901px]:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center gap-2.5 space-y-0">
                <CardTitle>Projects</CardTitle>
              </CardHeader>
              <CardContent>
                {data.projects.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">No active projects.</p>
                ) : (
                  <ul className="divide-y">
                    {data.projects.map((p) => {
                      const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0
                      return (
                        <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                          <span className="min-w-0">
                            <b className="block font-semibold [overflow-wrap:anywhere]">{p.name}</b>
                            <span className="block text-[13px] text-muted-foreground">
                              {pct}% complete{p.due_date ? ` · due ${fmt(p.due_date)}` : ""}
                            </span>
                            <span
                              role="progressbar"
                              aria-valuenow={pct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${p.name}, ${pct}% complete`}
                              className="mt-2 block h-1.5 overflow-hidden rounded-full border bg-secondary"
                            >
                              <i className="block h-full rounded-full bg-acc" style={{ width: `${pct}%` }} />
                            </span>
                          </span>
                          <StatusBadge status={p.status} />
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center gap-2.5 space-y-0">
                <CardTitle>Invoices</CardTitle>
                {outstanding > 0 && (
                  <span className="ml-auto text-right text-[13px] text-muted-foreground">
                    Outstanding <b className="font-semibold tabular-nums text-foreground">{gbp(outstanding)}</b>
                  </span>
                )}
              </CardHeader>
              <CardContent>
                {data.invoices.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">No invoices.</p>
                ) : (
                  <ul className="divide-y">
                    {data.invoices.map((inv) => (
                      <li key={inv.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                        <span className="min-w-0">
                          <b className="block font-mono font-semibold tabular-nums [overflow-wrap:anywhere]">{inv.number || `#${inv.id}`}</b>
                          <span className="block text-[13px] text-muted-foreground">
                            Due {fmt(inv.due_at)} · <span className="tabular-nums">{gbp(inv.total)}</span>
                          </span>
                        </span>
                        {inv.status !== "paid" && inv.total > 0 ? (
                          <Button size="sm" disabled={payId === inv.id} onClick={() => payNow(inv.id)} aria-label={`Pay ${inv.number || `invoice ${inv.id}`}`}>
                            {payId === inv.id ? <Loader2 className="animate-spin" /> : <CreditCard />}
                            Pay
                          </Button>
                        ) : (
                          <StatusBadge status={inv.status} />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* A client messages the studio here; staff previewing see the ticket list. */}
          {isClient ? (
            <>
              <PortalAssets />
              <PortalRequests projects={data.projects} threads={threads} threadsError={threadsError} reloadThreads={loadThreads} />
              <ClientMessages
                threads={threads}
                loadError={threadsError}
                reload={loadThreads}
                composing={composing}
                setComposing={setComposing}
              />
              <PortalFeedback projects={data.projects} />
            </>
          ) : (
            <Card>
              <CardHeader className="flex-row items-center gap-2.5 space-y-0">
                <CardTitle>Support</CardTitle>
              </CardHeader>
              <CardContent>
                {data.tickets.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">No open tickets.</p>
                ) : (
                  <ul className="divide-y">
                    {data.tickets.map((t) => (
                      <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                        <span className="min-w-0">
                          <b className="block font-semibold [overflow-wrap:anywhere]">{t.subject}</b>
                          <span className="block text-[13px] text-muted-foreground">Raised {fmt(t.created_at)}</span>
                        </span>
                        <StatusBadge status={t.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

const THREAD_STATUS: Record<ClientThread["status"], string> = {
  open: "Sent",
  in_progress: "In progress",
  resolved: "Resolved",
}

function fmtWhen(d: string) {
  return new Date(d.replace(" ", "T")).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * The client's own messages to the studio (support.php, client branch). The
 * server scopes everything to the signed-in client, so nothing here passes a
 * client id, and no status, priority or assignment control is rendered. The
 * threads are loaded by the page and shared with Requests; `reload` refreshes
 * them in place, so an open draft or reply survives.
 */
function ClientMessages({
  threads,
  loadError,
  reload: load,
  composing,
  setComposing,
}: {
  threads: ClientThread[] | null
  loadError: string | null
  reload: () => Promise<void>
  composing: boolean
  setComposing: (on: boolean) => void
}) {
  const [openId, setOpenId] = useState<number | null>(null)

  const open = openId != null ? (threads?.find((t) => t.id === openId) ?? null) : null

  return (
    <Card aria-labelledby="client-messages-heading">
      <CardHeader className="flex-row items-center gap-2.5 space-y-0">
        <CardTitle id="client-messages-heading">Messages</CardTitle>
      </CardHeader>
      <CardContent>
        {composing ? (
          <NewMessage
            onCancel={() => setComposing(false)}
            onSent={async (id) => {
              await load()
              setComposing(false)
              setOpenId(id)
            }}
          />
        ) : open ? (
          <Thread thread={open} onBack={() => setOpenId(null)} onReplied={load} />
        ) : loadError && !threads ? (
          <LoadError what="your messages" detail={loadError} onRetry={load} />
        ) : !threads ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading messages…
          </div>
        ) : threads.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            No messages yet. Use New message to ask a question or report a problem, and the studio will reply here.
          </p>
        ) : (
          <ul className="divide-y">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(t.id)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 text-left hover:text-acc"
                >
                  <span className="min-w-0">
                    <b className="block font-semibold [overflow-wrap:anywhere]">{t.subject}</b>
                    <span className="block text-[13px] text-muted-foreground">
                      {t.replies.length === 0
                        ? "No replies yet"
                        : `${t.replies.length} ${t.replies.length === 1 ? "reply" : "replies"}`}
                      {" · "}
                      {fmtWhen(t.last_activity)}
                    </span>
                  </span>
                  <StatusBadge status={THREAD_STATUS[t.status] ?? t.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function NewMessage({ onCancel, onSent }: { onCancel: () => void; onSent: (id: number) => Promise<void> }) {
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false) // blocks a second submit before React re-renders

  const canSend = subject.trim() !== "" && body.trim() !== "" && !sending

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSend || inFlight.current) return
    inFlight.current = true
    setSending(true)
    setError(null)
    const res = await clientMessages.start(subject.trim(), body.trim())
    if (res.ok) {
      await onSent(res.data.id)
      return // the form unmounts once the new thread opens
    }
    // Keep what they typed so nothing is lost.
    setError(res.error || "Your message was not sent.")
    inFlight.current = false
    setSending(false)
  }

  return (
    <form onSubmit={send} className="grid gap-3.5">
      <div className="grid gap-1.5">
        <Label htmlFor="msg-subject">Subject</Label>
        <Input
          id="msg-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={MESSAGE_SUBJECT_MAX}
          disabled={sending}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="msg-body">Message</Label>
        <Textarea
          id="msg-body"
          className="min-h-28"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MESSAGE_BODY_MAX}
          disabled={sending}
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error} Your message is still here, so you can try again.
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={sending}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSend}>
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>
    </form>
  )
}

function Thread({
  thread,
  onBack,
  onReplied,
}: {
  thread: ClientThread
  onBack: () => void
  onReplied: () => Promise<void>
}) {
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false) // blocks a second submit before React re-renders

  const canSend = reply.trim() !== "" && !sending

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSend || inFlight.current) return
    inFlight.current = true
    setSending(true)
    setError(null)
    const res = await clientMessages.reply(thread.id, reply.trim())
    if (res.ok) {
      setReply("")
      await onReplied()
    } else {
      // Keep what they typed so nothing is lost.
      setError(res.error || "Your reply was not sent.")
    }
    inFlight.current = false
    setSending(false)
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="-ml-3 mb-2" onClick={onBack}>
        <ArrowLeft /> All messages
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="min-w-0 font-display text-[1.15rem] font-semibold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere]">{thread.subject}</h3>
        <StatusBadge status={THREAD_STATUS[thread.status] ?? thread.status} />
      </div>

      <ol className="m-0 list-none py-3 pl-0">
        {thread.body && (
          <TimelineItem who="Your message" when={fmtWhen(thread.created_at)}>
            {thread.body}
          </TimelineItem>
        )}
        {thread.replies.map((r) => (
          <TimelineItem key={r.id} on={!r.from_client} who={r.from_client ? r.author || "You" : "GAkinz"} when={fmtWhen(r.created_at)}>
            {r.body}
          </TimelineItem>
        ))}
        {thread.replies.length === 0 && (
          <li className="py-2 pl-[30px] text-sm text-muted-foreground">No reply yet. The studio will answer here.</li>
        )}
      </ol>

      <form onSubmit={send} className="grid gap-2">
        <Label htmlFor={`reply-${thread.id}`} className="sr-only">
          Reply
        </Label>
        <Textarea
          id={`reply-${thread.id}`}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          maxLength={MESSAGE_BODY_MAX}
          disabled={sending}
          placeholder="Write a reply…"
          className="min-h-20"
        />
        {error && (
          <p role="alert" className="text-sm text-bad">
            {error} Your reply is still here, so you can try again.
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={!canSend}>
            {sending ? <Loader2 className="animate-spin" /> : <Send />}
            {sending ? "Sending…" : "Send reply"}
          </Button>
        </div>
      </form>
    </div>
  )
}

/**
 * Private feedback from the client (feedback.php, client branch). Send-only:
 * the server never returns feedback to a client, so nothing is listed here.
 * Permission to quote is a separate switch, off by default.
 */
function PortalFeedback({ projects }: { projects: { id: number; name: string }[] }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FeedbackFormState>(EMPTY_FEEDBACK)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const inFlight = useRef(false)

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackReady(form) || inFlight.current) return
    inFlight.current = true
    setSending(true)
    setError(null)
    const res = await feedbackApi.send(feedbackPayload(form))
    inFlight.current = false
    setSending(false)
    if (res.ok) {
      setSent(true)
      setOpen(false)
      setForm(EMPTY_FEEDBACK)
    } else {
      // Keep what they wrote so nothing is lost.
      setError(res.status === 503 ? "Feedback cannot be sent just yet. Please try again later, or message us instead." : res.error || "Your feedback was not sent.")
    }
  }

  return (
    <Card aria-labelledby="portal-feedback-heading">
      <CardHeader className="flex-row flex-wrap items-center gap-2.5 space-y-0">
        <CardTitle id="portal-feedback-heading">Feedback</CardTitle>
        {!open && (
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => { setOpen(true); setSent(false) }}>
            <MessageSquarePlus /> Give feedback
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {open ? (
          <form onSubmit={send} className="grid gap-3.5">
            <p className="text-sm text-muted-foreground">Only the studio reads this. It is never published unless you say so below.</p>
            <FeedbackFields form={form} set={(p) => setForm((f) => ({ ...f, ...p }))} idPrefix="portal-fb" projects={projects} disabled={sending} audience="client" />
            {error && (
              <p role="alert" className="text-sm text-bad">
                {error} Your feedback is still here, so you can try again.
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={sending}>
                Cancel
              </Button>
              <Button type="submit" disabled={!feedbackReady(form) || sending}>
                {sending ? <Loader2 className="animate-spin" /> : <Send />}
                {sending ? "Sending…" : "Send privately"}
              </Button>
            </div>
          </form>
        ) : sent ? (
          <p role="status" className="py-2 text-sm">
            Thank you. Your feedback reached the studio privately.
          </p>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">Tell us how the work went. Your feedback is private to the studio.</p>
        )}
      </CardContent>
    </Card>
  )
}

// One entry in the prototype's `.tl` timeline: a dot, who and when, then the text.
function TimelineItem({ who, when, on, children }: { who: string; when: string; on?: boolean; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[20px_minmax(0,1fr)] gap-2.5 py-2">
      <span aria-hidden className={cn("ml-[5px] mt-1.5 size-[9px] rounded-full shadow-[0_0_0_3px_hsl(var(--card))]", on ? "bg-acc" : "bg-line-strong")} />
      <span className="min-w-0">
        <b className="font-semibold">{who}</b> <small className="text-[12.5px] text-muted-foreground">· {when}</small>
        <span className="mt-0.5 block whitespace-pre-wrap [overflow-wrap:anywhere]">{children}</span>
      </span>
    </li>
  )
}
