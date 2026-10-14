import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2, RefreshCw, Plus, Send, Archive, ArchiveRestore, MessagesSquare, NotebookPen } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import {
  comms,
  clients as clientsApi,
  projects as projectsApi,
  type CommThread,
  type CommThreadDetail,
  type CommChannel,
  type CommDirection,
  type Client,
  type Project,
} from "@/lib/api"
import AiAssist from "@/app/components/AiAssist"
import { EmptyState, LoadError } from "@/app/components/EmptyState"
import { PageHeader } from "@/app/components/page-kit"
import { cn } from "@/lib/utils"

const CHANNELS: { key: CommChannel; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "call", label: "Call" },
  { key: "meeting", label: "Meeting" },
  { key: "client", label: "Client" },
  { key: "internal", label: "Internal" },
]

const DIRECTIONS: { key: CommDirection; label: string }[] = [
  { key: "note", label: "Internal note" },
  { key: "out", label: "We sent" },
  { key: "in", label: "They sent" },
]
const DIRECTION_LABEL = Object.fromEntries(DIRECTIONS.map((d) => [d.key, d.label])) as Record<CommDirection, string>

function channelMeta(c: CommChannel) {
  return CHANNELS.find((x) => x.key === c) ?? CHANNELS.find((x) => x.key === "internal")!
}

function timeAgo(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso.replace(" ", "T"))
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

export default function Comms() {
  const [threads, setThreads] = useState<CommThread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<CommThreadDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [clientList, setClientList] = useState<Client[]>([])
  const [projectList, setProjectList] = useState<Project[]>([])

  const [composer, setComposer] = useState("")
  const [direction, setDirection] = useState<CommDirection>("note")
  const [posting, setPosting] = useState(false)
  const [sending, setSending] = useState(false)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    subject: "",
    client_id: "",
    project_id: "",
    channel: "internal" as CommChannel,
    body: "",
  })
  const [saving, setSaving] = useState(false)

  const feedRef = useRef<HTMLDivElement>(null)
  const lastReqId = useRef<number | null>(null) // newest thread requested; guards out-of-order loads

  const loadThreads = async () => {
    setLoading(true)
    const res = await comms.list()
    if (res.ok) {
      setThreads(res.data)
      setError(null)
    } else {
      setError(res.error)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadThreads()
    clientsApi.list().then((r) => r.ok && setClientList(r.data))
    projectsApi.list().then((r) => r.ok && setProjectList(r.data))
  }, [])

  const loadDetail = async (id: number) => {
    lastReqId.current = id
    setSelectedId(id)
    setDetailLoading(true)
    const res = await comms.get(id)
    // Drop a stale response: if a newer thread was opened while this was in
    // flight, ignore it so the feed never shows the wrong thread's messages.
    if (lastReqId.current !== id) return
    setDetailLoading(false)
    if (res.ok) setDetail(res.data)
    else toast.error(res.error || "Could not open the thread.")
  }

  useEffect(() => {
    // Scroll the feed to the newest message when a thread loads or grows.
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight })
  }, [detail])

  const visible = useMemo(
    () => threads.filter((t) => (showArchived ? true : t.status === "open")),
    [threads, showArchived],
  )

  const createThread = async () => {
    if (!form.subject.trim()) {
      toast.error("A subject is required.")
      return
    }
    setSaving(true)
    const res = await comms.create({
      subject: form.subject,
      client_id: form.client_id ? Number(form.client_id) : null,
      project_id: form.project_id ? Number(form.project_id) : null,
      channel: form.channel,
      body: form.body || undefined,
    })
    setSaving(false)
    if (res.ok) {
      toast.success("Conversation started.")
      setForm({ subject: "", client_id: "", project_id: "", channel: "internal", body: "" })
      setOpen(false)
      await loadThreads()
      loadDetail(res.data.id)
    } else {
      toast.error(res.error || "Could not start the conversation.")
    }
  }

  const post = async () => {
    if (!detail || !composer.trim()) return
    setPosting(true)
    const res = await comms.post(detail.id, composer, direction)
    setPosting(false)
    if (res.ok) {
      setComposer("")
      await loadDetail(detail.id)
      loadThreads()
    } else {
      toast.error(res.error || "Could not post the message.")
    }
  }

  // Email/SMS threads with a linked client can actually deliver: this sends a
  // real email or text to the client AND records it as an outbound message.
  const sendMessage = async () => {
    if (!detail || !composer.trim()) return
    setSending(true)
    const res = await comms.send(detail.id, composer)
    setSending(false)
    if (res.ok) {
      const kind = res.data.channel === "sms" ? "Text" : res.data.channel === "whatsapp" ? "WhatsApp message" : "Email"
      toast.success(`${kind} sent to ${res.data.sent_to}.`)
      setComposer("")
      await loadDetail(detail.id)
      loadThreads()
    } else {
      toast.error(res.error || "Could not send the message.")
    }
  }

  // An email / SMS / WhatsApp conversation tied to a client can be delivered.
  const canSend =
    !!detail && ["email", "sms", "whatsapp"].includes(detail.channel) && detail.client_id != null
  const sendLabel =
    detail?.channel === "sms" ? "Send SMS" : detail?.channel === "whatsapp" ? "Send WhatsApp" : "Send email"

  const toggleArchive = async () => {
    if (!detail) return
    const next = detail.status === "archived" ? "open" : "archived"
    const res = await comms.setStatus(detail.id, next)
    if (res.ok) {
      setDetail({ ...detail, status: next })
      loadThreads()
      toast.success(next === "archived" ? "Thread archived." : "Thread reopened.")
    } else {
      toast.error(res.error || "Could not update the thread.")
    }
  }

  // Context handed to the AI so a reply draft is grounded in the conversation.
  const aiContext = useMemo(() => {
    if (!detail) return ""
    const head = `Subject: ${detail.subject}\nClient: ${detail.client_company ?? "—"}\nProject: ${
      detail.project_name ?? "—"
    }`
    const log = detail.messages
      .map((m) => `[${m.direction}] ${m.author ?? "—"}: ${m.body}`)
      .join("\n")
    return `${head}\n\n${log}`
  }, [detail])

  // View filters only; nothing is fetched or saved.
  const [channelFilter, setChannelFilter] = useState<CommChannel | "all">("all")
  const channelsInUse = useMemo(() => CHANNELS.filter((c) => threads.some((t) => t.channel === c.key)), [threads])
  const listed = visible.filter((t) => channelFilter === "all" || t.channel === channelFilter)
  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-[34px] items-center gap-1 whitespace-nowrap rounded-full border px-3 text-[13px] font-medium transition-colors",
      active ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-line-strong",
    )

  const newButton = (
    <Button onClick={() => setOpen(true)}>
      <Plus /> New conversation
    </Button>
  )

  return (
    <div>
      <PageHeader
        title="Communication Hub"
        subtitle="Every conversation, emails, calls, client messages and internal notes, tied to its client and project."
        actions={
          <>
            {newButton}
            <Button variant="outline" onClick={loadThreads} disabled={loading}>
              <RefreshCw className={cn(loading && "animate-spin")} /> Refresh
            </Button>
          </>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New conversation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3.5">
            <div className="grid gap-1.5">
              <Label htmlFor="comm-subject">Subject</Label>
              <Input
                id="comm-subject"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="comm-channel">Channel</Label>
                <Select value={form.channel} onValueChange={(v) => setForm((f) => ({ ...f, channel: v as CommChannel }))}>
                  <SelectTrigger id="comm-channel">
                    <SelectValue placeholder="Channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="comm-client">Client</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))}>
                  <SelectTrigger id="comm-client">
                    <SelectValue placeholder="Client (optional)" />
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
              <Label htmlFor="comm-project">Project</Label>
              <Select value={form.project_id} onValueChange={(v) => setForm((f) => ({ ...f, project_id: v }))}>
                <SelectTrigger id="comm-project">
                  <SelectValue placeholder="Project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {projectList.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="comm-body">First note</Label>
              <Textarea
                id="comm-body"
                placeholder="Optional"
                rows={4}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createThread} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} Start conversation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && (
        <LoadError
          what="conversations"
          detail={`${error}. Make sure comms.php is uploaded and the schema migration has run.`}
          onRetry={loadThreads}
          className="mb-4"
        />
      )}

      {!loading && !error && threads.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No conversations yet"
          description="Start one to keep a thread of every touchpoint."
          action={newButton}
        />
      ) : (
        <>
          <div className="mb-3.5 flex flex-wrap items-center gap-2" role="group" aria-label="Filter conversations">
            <button type="button" className={chip(channelFilter === "all")} aria-pressed={channelFilter === "all"} onClick={() => setChannelFilter("all")}>
              All
            </button>
            {channelsInUse.map((c) => (
              <button
                key={c.key}
                type="button"
                className={chip(channelFilter === c.key)}
                aria-pressed={channelFilter === c.key}
                onClick={() => setChannelFilter(c.key)}
              >
                {c.label}
              </button>
            ))}
            <span aria-hidden className="mx-1 h-5 w-px bg-border" />
            <button type="button" className={chip(showArchived)} aria-pressed={showArchived} onClick={() => setShowArchived((v) => !v)}>
              Show archived
            </button>
          </div>

          <div className="grid items-start gap-4 min-[901px]:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            {/* Thread list */}
            <div className="min-w-0 rounded-2xl border bg-card p-1.5">
              {loading ? (
                <div aria-busy="true" aria-label="Loading conversations" className="grid gap-1 p-1">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="grid gap-2 px-2.5 py-2.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : listed.length === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-muted-foreground">No conversations match this filter.</p>
              ) : (
                <ul className="max-h-[70vh] overflow-y-auto">
                  {listed.map((t) => {
                    const active = t.id === selectedId
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => loadDetail(t.id)}
                          aria-current={active || undefined}
                          className={cn(
                            "flex min-h-10 w-full flex-col items-start gap-0.5 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-secondary",
                            active && "bg-secondary",
                          )}
                        >
                          <span className="flex w-full min-w-0 items-start gap-2">
                            <b className="min-w-0 flex-1 font-semibold [overflow-wrap:anywhere]">{t.subject}</b>
                            <span className="shrink-0 pt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                              {timeAgo(t.last_message_at ?? t.created_at)}
                            </span>
                          </span>
                          <span className="w-full min-w-0 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                            {[t.client_company, t.project_name, channelMeta(t.channel).label].filter(Boolean).join(" · ")}
                          </span>
                          {t.preview && <span className="line-clamp-1 w-full min-w-0 text-[12.5px] text-muted-foreground">{t.preview}</span>}
                          {t.status === "archived" && (
                            <Badge variant="secondary" className="mt-1">
                              Archived
                            </Badge>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Thread detail */}
            <div className="min-w-0 rounded-2xl border bg-card p-[18px]">
              {!detail ? (
                <p className="py-16 text-center text-muted-foreground">
                  {detailLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Opening…
                    </span>
                  ) : (
                    "Select a conversation to read and reply."
                  )}
                </p>
              ) : (
                <>
                  <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                    <h2 className="min-w-[min(100%,12rem)] flex-1 font-display text-[1.25rem] font-semibold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere]">
                      {detail.subject}
                    </h2>
                    <Badge variant="secondary">{channelMeta(detail.channel).label}</Badge>
                    <Button variant="ghost" onClick={toggleArchive}>
                      {detail.status === "archived" ? (
                        <>
                          <ArchiveRestore /> Reopen
                        </>
                      ) : (
                        <>
                          <Archive /> Archive
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="mb-3.5 text-muted-foreground [overflow-wrap:anywhere]">
                    {[detail.client_company, detail.project_name].filter(Boolean).join(" · ") || "No client or project linked"}
                  </p>

                  {/* Feed */}
                  <div ref={feedRef} className="max-h-[50vh] overflow-y-auto">
                    {detail.messages.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">No messages yet. Add the first note below.</p>
                    ) : (
                      <ul className="m-0 list-none p-0">
                        {detail.messages.map((m) => (
                          <li key={m.id} className="grid grid-cols-[20px_minmax(0,1fr)] gap-2.5 py-2">
                            <span
                              aria-hidden
                              className={cn(
                                "ml-[5px] mt-1.5 size-[9px] rounded-full shadow-[0_0_0_3px_hsl(var(--card))]",
                                m.direction === "out" ? "bg-acc" : "bg-line-strong",
                              )}
                            />
                            <span className="min-w-0">
                              <b className="font-semibold">{DIRECTION_LABEL[m.direction]}</b>{" "}
                              <small className="text-[12.5px] text-muted-foreground">
                                · {m.author ?? "—"} · {timeAgo(m.created_at)}
                              </small>
                              <span className="mt-0.5 block whitespace-pre-wrap [overflow-wrap:anywhere]">{m.body}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Composer */}
                  <div className="mt-3 grid gap-1.5">
                    <Label htmlFor="comm-composer" className="sr-only">
                      Message
                    </Label>
                    <Textarea
                      id="comm-composer"
                      placeholder="Write a message or note…"
                      rows={3}
                      value={composer}
                      onChange={(e) => setComposer(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") post()
                      }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                    <Select value={direction} onValueChange={(v) => setDirection(v as CommDirection)}>
                      <SelectTrigger aria-label="Record as" className="mr-auto w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIRECTIONS.map((d) => (
                          <SelectItem key={d.key} value={d.key}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <AiAssist
                      task="comm_reply"
                      title="Draft a reply"
                      label="AI draft"
                      size="default"
                      input={aiContext}
                      system="You are a GAkinz studio account manager. Given the conversation log, draft a concise, warm, professional reply we (the studio) would send next. Plain text, no greetings boilerplate unless natural."
                      onUse={(t) => {
                        setComposer(t)
                        setDirection("out")
                      }}
                    />
                    <Button
                      onClick={post}
                      disabled={posting || sending || !composer.trim()}
                      variant={canSend ? "outline" : "default"}
                      title="Record as a message or note (nothing sent)"
                    >
                      {posting ? <Loader2 className="animate-spin" /> : <NotebookPen />}
                      Record (nothing sent)
                    </Button>
                    {canSend && (
                      <Button onClick={sendMessage} disabled={sending || posting || !composer.trim()} title="Deliver this to the client and record it">
                        {sending ? <Loader2 className="animate-spin" /> : <Send />}
                        {sendLabel}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
