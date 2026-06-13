import { useEffect, useMemo, useRef, useState } from "react"
import {
  Loader2,
  RefreshCw,
  Plus,
  Send,
  Archive,
  ArchiveRestore,
  Mail,
  MessageSquare,
  Phone,
  Users2,
  StickyNote,
  CalendarDays,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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

const CHANNELS: { key: CommChannel; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "email", label: "Email", icon: Mail },
  { key: "sms", label: "SMS", icon: MessageSquare },
  { key: "call", label: "Call", icon: Phone },
  { key: "meeting", label: "Meeting", icon: CalendarDays },
  { key: "client", label: "Client", icon: Users2 },
  { key: "internal", label: "Internal", icon: StickyNote },
]

const DIRECTIONS: { key: CommDirection; label: string }[] = [
  { key: "note", label: "Internal note" },
  { key: "out", label: "We sent" },
  { key: "in", label: "They sent" },
]

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
      toast.success(`${res.data.channel === "sms" ? "Text" : "Email"} sent to ${res.data.sent_to}.`)
      setComposer("")
      await loadDetail(detail.id)
      loadThreads()
    } else {
      toast.error(res.error || "Could not send the message.")
    }
  }

  // An email or SMS conversation tied to a client can be delivered, not just logged.
  const canSend =
    !!detail && (detail.channel === "email" || detail.channel === "sms") && detail.client_id != null
  const sendLabel = detail?.channel === "sms" ? "Send SMS" : "Send email"

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Communication Hub</h1>
          <p className="text-sm text-muted-foreground">
            Every conversation — emails, calls, client messages, internal notes — tied to its client
            and project.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "Hide archived" : "Show archived"}
          </Button>
          <Button variant="outline" size="sm" onClick={loadThreads}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New conversation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New conversation</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Subject"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    value={form.channel}
                    onValueChange={(v) => setForm((f) => ({ ...f, channel: v as CommChannel }))}
                  >
                    <SelectTrigger>
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
                  <Select
                    value={form.client_id}
                    onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))}
                  >
                    <SelectTrigger>
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
                <Select
                  value={form.project_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, project_id: v }))}
                >
                  <SelectTrigger>
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
                <Textarea
                  placeholder="First note (optional)"
                  rows={4}
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button onClick={createThread} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Start
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
          {error}. If you’re running locally, make sure <code>comms.php</code> is uploaded and the
          schema migration has run.
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Thread list */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3">
          <div className="rounded-xl border bg-card">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : visible.length === 0 ? (
              <div className="px-4 py-16 text-center text-sm text-muted-foreground">
                No conversations yet. Start one to keep a thread of every touchpoint.
              </div>
            ) : (
              <ul className="max-h-[70vh] divide-y overflow-auto">
                {visible.map((t) => {
                  const Meta = channelMeta(t.channel)
                  const active = t.id === selectedId
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => loadDetail(t.id)}
                        className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                          active ? "bg-muted" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <Meta.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm font-medium">{t.subject}</span>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {timeAgo(t.last_message_at ?? t.created_at)}
                          </span>
                        </div>
                        {(t.client_company || t.project_name) && (
                          <span className="truncate text-xs text-muted-foreground">
                            {[t.client_company, t.project_name].filter(Boolean).join(" · ")}
                          </span>
                        )}
                        {t.preview && (
                          <span className="truncate text-xs text-muted-foreground/80">{t.preview}</span>
                        )}
                        {t.status === "archived" && (
                          <Badge variant="secondary" className="mt-0.5 w-fit text-[10px]">
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
        </div>

        {/* Thread detail */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9">
          {!detail ? (
            <div className="flex h-[60vh] items-center justify-center rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground">
              {detailLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Opening…
                </span>
              ) : (
                "Select a conversation to read and reply."
              )}
            </div>
          ) : (
            <div className="flex h-[72vh] flex-col rounded-xl border bg-card">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b p-4">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    {(() => {
                      const M = channelMeta(detail.channel)
                      return <M.icon className="h-4 w-4 text-muted-foreground" />
                    })()}
                    <span className="truncate">{detail.subject}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {[detail.client_company, detail.project_name].filter(Boolean).join(" · ") ||
                      "No client or project linked"}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={toggleArchive}>
                  {detail.status === "archived" ? (
                    <>
                      <ArchiveRestore className="mr-2 h-4 w-4" /> Reopen
                    </>
                  ) : (
                    <>
                      <Archive className="mr-2 h-4 w-4" /> Archive
                    </>
                  )}
                </Button>
              </div>

              {/* Feed */}
              <div ref={feedRef} className="flex-1 space-y-3 overflow-auto p-4">
                {detail.messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No messages yet. Add the first note below.
                  </p>
                ) : (
                  detail.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.direction === "in" ? "items-start" : "items-end"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                          m.direction === "note"
                            ? "bg-muted text-foreground"
                            : m.direction === "in"
                              ? "bg-secondary text-secondary-foreground"
                              : "bg-primary text-primary-foreground"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      </div>
                      <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        {m.direction === "in" ? (
                          <ArrowDownLeft className="h-3 w-3" />
                        ) : m.direction === "out" ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <StickyNote className="h-3 w-3" />
                        )}
                        {m.author ?? "—"} · {timeAgo(m.created_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Composer */}
              <div className="border-t p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Select value={direction} onValueChange={(v) => setDirection(v as CommDirection)}>
                    <SelectTrigger className="h-8 w-40 text-xs">
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
                    input={aiContext}
                    system="You are a GAkinz studio account manager. Given the conversation log, draft a concise, warm, professional reply we (the studio) would send next. Plain text, no greetings boilerplate unless natural."
                    onUse={(t) => {
                      setComposer(t)
                      setDirection("out")
                    }}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Textarea
                    placeholder="Write a message or note…"
                    rows={2}
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") post()
                    }}
                    className="resize-none"
                  />
                  {canSend && (
                    <Button
                      onClick={sendMessage}
                      disabled={sending || posting || !composer.trim()}
                      title="Deliver this to the client and record it"
                    >
                      {sending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : detail?.channel === "sms" ? (
                        <MessageSquare className="mr-2 h-4 w-4" />
                      ) : (
                        <Mail className="mr-2 h-4 w-4" />
                      )}
                      {sendLabel}
                    </Button>
                  )}
                  <Button
                    onClick={post}
                    disabled={posting || sending || !composer.trim()}
                    size="icon"
                    variant={canSend ? "outline" : "default"}
                    title="Record as a message or note (nothing sent)"
                  >
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
