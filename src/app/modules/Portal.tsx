import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, FolderKanban, Receipt, LifeBuoy, CreditCard, MessageSquare, ArrowLeft, Send, Plus } from "lucide-react"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
import { useAuth } from "@/store/auth.store"
import { cn } from "@/lib/utils"

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)

function fmt(d: string | null) {
  if (!d) return "—"
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export default function Portal() {
  // A `client`-role login sees only its OWN portal — no picker, server derives
  // the client from the token. Staff get the picker to preview any client.
  const user = useAuth((s) => s.user)
  const isClient = user?.role === "client"

  const [clientList, setClientList] = useState<Client[]>([])
  const [clientId, setClientId] = useState("")
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payId, setPayId] = useState<number | null>(null)

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
  }, [isClient, user?.client_id])

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
        <h1 className="gk-app-grad text-2xl font-bold tracking-tight">
          {isClient ? "Your Portal" : "Client Portal"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isClient
            ? "Your projects, invoices and support in one place."
            : "What a client sees: their projects, invoices and tickets. Pick a client to preview."}
        </p>
      </div>

      {!isClient && (
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
      )}

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

      {!isClient && !clientId && !error && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center text-sm text-muted-foreground">
          Choose a client above to preview their portal.
        </div>
      )}

      {isClient && user?.client_id == null && !error && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center text-sm text-muted-foreground">
          Your account isn’t linked to a client yet. Please contact GAkinz.
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
            <h3 className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold">
              <span className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" /> Invoices
              </span>
              {outstanding > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  Outstanding: <span className="font-semibold text-foreground">{gbp(outstanding)}</span>
                </span>
              )}
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
                        <td className="px-2 py-2 text-right">
                          {inv.status !== "paid" && inv.total > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={payId === inv.id}
                              onClick={() => payNow(inv.id)}
                            >
                              {payId === inv.id ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CreditCard className="mr-1 h-3.5 w-3.5" />
                              )}
                              Pay
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* A client messages the studio here; staff previewing see the ticket list. */}
          {isClient ? (
            <ClientMessages />
          ) : (
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
 * client id, and no status, priority or assignment control is rendered.
 */
function ClientMessages() {
  const [threads, setThreads] = useState<ClientThread[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const [composing, setComposing] = useState(false)

  const apply = useCallback((res: Awaited<ReturnType<typeof clientMessages.list>>) => {
    if (res.ok) {
      setThreads(res.data)
      setLoadError(null)
    } else {
      setLoadError(res.error)
    }
  }, [])

  const load = useCallback(() => clientMessages.list().then(apply), [apply])

  useEffect(() => {
    let live = true
    clientMessages.list().then((res) => {
      if (live) apply(res)
    })
    return () => {
      live = false
    }
  }, [apply])

  const open = openId != null ? (threads?.find((t) => t.id === openId) ?? null) : null

  return (
    <section aria-labelledby="client-messages-heading">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 id="client-messages-heading" className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="h-4 w-4 text-primary" /> Messages
        </h3>
        {!composing && openId == null && (
          <Button variant="outline" size="sm" onClick={() => setComposing(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> New message
          </Button>
        )}
      </div>

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
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <span>Your messages could not be loaded. {loadError}</span>
          <Button variant="outline" size="sm" onClick={load}>
            Try again
          </Button>
        </div>
      ) : !threads ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading messages…
        </div>
      ) : threads.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No messages yet. Use New message to ask a question or report a problem, and the studio will reply here.
        </p>
      ) : (
        <ul className="space-y-2">
          {threads.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setOpenId(t.id)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2 text-left text-sm hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{t.subject}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.replies.length === 0
                      ? "No replies yet"
                      : `${t.replies.length} ${t.replies.length === 1 ? "reply" : "replies"}`}
                    {" · "}
                    {fmtWhen(t.last_activity)}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{THREAD_STATUS[t.status] ?? t.status}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
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
    <form onSubmit={send} className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <Label htmlFor="msg-subject">Subject</Label>
        <Input
          id="msg-subject"
          className="mt-1.5"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={MESSAGE_SUBJECT_MAX}
          disabled={sending}
          required
        />
      </div>
      <div>
        <Label htmlFor="msg-body">Message</Label>
        <Textarea
          id="msg-body"
          className="mt-1.5 min-h-28"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MESSAGE_BODY_MAX}
          disabled={sending}
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error} Your message is still here, so you can try again.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={sending}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!canSend}>
          {sending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />}
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
    <div className="rounded-xl border border-border bg-card p-4">
      <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={onBack}>
        <ArrowLeft className="mr-1 h-3.5 w-3.5" /> All messages
      </Button>
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <h4 className="font-semibold">{thread.subject}</h4>
        <span className="shrink-0 text-xs text-muted-foreground">{THREAD_STATUS[thread.status] ?? thread.status}</span>
      </div>

      <ol className="space-y-3 py-4">
        {thread.body && (
          <li className="rounded-lg bg-muted/40 p-3 text-sm">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Your message</span>
              <span>{fmtWhen(thread.created_at)}</span>
            </div>
            <p className="whitespace-pre-wrap">{thread.body}</p>
          </li>
        )}
        {thread.replies.map((r) => (
          <li
            key={r.id}
            className={cn("rounded-lg border border-border p-3 text-sm", r.from_client ? "bg-muted/40" : "bg-background")}
          >
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{r.from_client ? r.author || "You" : "GAkinz"}</span>
              <span>{fmtWhen(r.created_at)}</span>
            </div>
            <p className="whitespace-pre-wrap">{r.body}</p>
          </li>
        ))}
        {thread.replies.length === 0 && (
          <li className="text-sm text-muted-foreground">No reply yet. The studio will answer here.</li>
        )}
      </ol>

      <form onSubmit={send} className="space-y-2 border-t border-border pt-3">
        <Label htmlFor={`reply-${thread.id}`}>Reply</Label>
        <Textarea
          id={`reply-${thread.id}`}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          maxLength={MESSAGE_BODY_MAX}
          disabled={sending}
          className="min-h-20"
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error} Your reply is still here, so you can try again.
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!canSend}>
            {sending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />}
            {sending ? "Sending…" : "Send reply"}
          </Button>
        </div>
      </form>
    </div>
  )
}
