import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Mail,
  RefreshCw,
  Search,
  Loader2,
  PenSquare,
  Reply,
  Send,
  X,
  AlertTriangle,
  Inbox as InboxIcon,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  mail,
  ai,
  type MailStatus,
  type MailSummary,
  type MailMessage,
  type SendMailPayload,
} from "@/lib/api"

function when(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return sameDay
    ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase()
}

type Draft = SendMailPayload

export default function Mailbox() {
  const [status, setStatus] = useState<MailStatus | null>(null)
  const [list, setList] = useState<MailSummary[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const [selectedUid, setSelectedUid] = useState<number | null>(null)
  const [message, setMessage] = useState<MailMessage | null>(null)
  const [loadingMsg, setLoadingMsg] = useState(false)

  const [draft, setDraft] = useState<Draft | null>(null)
  const [sending, setSending] = useState(false)
  const [drafting, setDrafting] = useState(false)

  const loadInbox = useCallback(async (q = "") => {
    setLoadingList(true)
    setListError(null)
    const res = await mail.inbox(40, q)
    setLoadingList(false)
    if (res.ok) setList(res.data)
    else setListError(res.error)
  }, [])

  useEffect(() => {
    ;(async () => {
      const st = await mail.status()
      if (st.ok) {
        setStatus(st.data)
        if (st.data.imap) loadInbox()
        else setLoadingList(false)
      } else {
        setStatus({ smtp: false, imap: false, imap_ext: false })
        setLoadingList(false)
        setListError(st.error)
      }
    })()
  }, [loadInbox])

  const openMessage = async (uid: number) => {
    setSelectedUid(uid)
    setDraft(null)
    setLoadingMsg(true)
    setMessage(null)
    const res = await mail.message(uid)
    setLoadingMsg(false)
    if (res.ok) {
      setMessage(res.data)
      setList((prev) => prev.map((m) => (m.uid === uid ? { ...m, seen: true } : m)))
    } else {
      toast.error(res.error)
    }
  }

  const startCompose = () => {
    setDraft({ to: "", subject: "", body: "" })
    setMessage(null)
    setSelectedUid(null)
  }

  const startReply = () => {
    if (!message) return
    const quoted = message.text
      .split("\n")
      .map((l) => "> " + l)
      .join("\n")
    setDraft({
      to: message.from_email,
      subject: message.subject.startsWith("Re:") ? message.subject : `Re: ${message.subject}`,
      body: `\n\n— — —\nOn ${message.date ? new Date(message.date).toLocaleString("en-GB") : ""}, ${message.from_name} wrote:\n${quoted}`,
      in_reply_to: message.message_id,
      references: message.message_id,
    })
  }

  const aiDraft = async () => {
    if (!draft) return
    setDrafting(true)
    const context = message
      ? `You are replying to an email from ${message.from_name} <${message.from_email}>. Their message:\n\n${message.text.slice(0, 2000)}`
      : `Compose a new email to ${draft.to || "a client"} with subject "${draft.subject}".`
    const res = await ai.run(
      "email-draft",
      context,
      "You write email replies for GAkinz, a UK web design & development studio. Write a concise, warm, professional reply in UK English. Plain text only, no markdown, no subject line — just the body. Sign off as the GAkinz team.",
    )
    setDrafting(false)
    if (res.ok) {
      setDraft((d) => (d ? { ...d, body: res.data.text.trim() + (d.body.includes("— — —") ? "\n\n" + d.body : "") } : d))
    } else {
      toast.error(`Couldn't draft: ${res.error}`)
    }
  }

  const send = async () => {
    if (!draft) return
    if (!draft.to.trim()) return toast.error("Add a recipient.")
    if (!draft.subject.trim()) return toast.error("Add a subject.")
    if (!draft.body.trim()) return toast.error("The message is empty.")
    setSending(true)
    const res = await mail.send(draft)
    setSending(false)
    if (res.ok) {
      toast.success("Email sent.")
      setDraft(null)
      if (status?.imap) loadInbox(search)
    } else {
      toast.error(res.error)
    }
  }

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadInbox(search)
  }

  const unread = list.filter((m) => !m.seen).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Mailbox</h1>
          <p className="text-sm text-muted-foreground">
            hello@gakinz.com — read and reply without leaving GAkinzOS.
            {unread > 0 && <span className="ml-1 font-medium text-foreground">{unread} unread.</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadInbox(search)}
            disabled={!status?.imap || loadingList}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loadingList && "animate-spin")} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={startCompose}
            disabled={!status?.smtp}
            className="gk-shine shadow-md shadow-primary/20"
          >
            <PenSquare className="mr-2 h-4 w-4" /> Compose
          </Button>
        </div>
      </div>

      {/* Config banners */}
      {status && !status.smtp && (
        <Banner>
          Outgoing mail isn’t configured. Set <code>$SMTP_HOST</code> and the mailbox password in the
          server <code>config.php</code> to enable sending.
        </Banner>
      )}
      {status && !status.imap_ext && (
        <Banner>
          The inbox needs the PHP <code>imap</code> extension, which isn’t enabled on this server.
          Sending still works once SMTP is set.
        </Banner>
      )}
      {status && status.imap_ext && !status.imap && (
        <Banner>
          The inbox isn’t configured. Set <code>$IMAP_HOST</code> in the server <code>config.php</code>.
        </Banner>
      )}

      {/* Two-pane */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        {/* List */}
        <div className="gk-app-card overflow-hidden">
          <form onSubmit={onSearch} className="flex items-center gap-2 border-b p-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search mail…"
                className="h-9 pl-8"
                disabled={!status?.imap}
              />
            </div>
          </form>

          <div className="max-h-[34rem] divide-y overflow-y-auto">
            {loadingList ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading inbox…
              </div>
            ) : listError ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">{listError}</div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-16 text-center text-sm text-muted-foreground">
                <InboxIcon className="h-8 w-8 opacity-40" />
                {status?.imap ? "No messages." : "Inbox unavailable."}
              </div>
            ) : (
              list.map((m) => (
                <button
                  key={m.uid}
                  onClick={() => openMessage(m.uid)}
                  className={cn(
                    "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                    selectedUid === m.uid && "bg-primary/5",
                  )}
                >
                  <span className="gk-app-chip mt-0.5 h-9 w-9 shrink-0 text-xs font-semibold">
                    {initials(m.from_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("truncate text-sm", !m.seen ? "font-semibold" : "text-foreground")}>
                        {m.from_name || m.from_email}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{when(m.date)}</span>
                    </div>
                    <p className={cn("truncate text-sm", !m.seen ? "font-medium text-foreground" : "text-muted-foreground")}>
                      {m.subject}
                    </p>
                  </div>
                  {!m.seen && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Reading / compose pane */}
        <div className="gk-app-card min-h-[28rem] p-0">
          {draft ? (
            <Compose
              draft={draft}
              setDraft={setDraft}
              onClose={() => setDraft(null)}
              onSend={send}
              sending={sending}
              onAiDraft={aiDraft}
              drafting={drafting}
              isReply={!!draft.in_reply_to}
            />
          ) : loadingMsg ? (
            <div className="flex h-full min-h-[28rem] items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening…
            </div>
          ) : message ? (
            <article className="flex h-full flex-col">
              <header className="gk-app-accent border-b p-6">
                <h2 className="text-lg font-semibold">{message.subject}</h2>
                <div className="mt-3 flex items-center gap-3">
                  <span className="gk-app-chip h-10 w-10 text-sm font-semibold">
                    {initials(message.from_name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {message.from_name}{" "}
                      <span className="font-normal text-muted-foreground">&lt;{message.from_email}&gt;</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {message.date ? new Date(message.date).toLocaleString("en-GB") : ""}
                    </p>
                  </div>
                  <Button size="sm" className="ml-auto gk-shine" onClick={startReply} disabled={!status?.smtp}>
                    <Reply className="mr-2 h-4 w-4" /> Reply
                  </Button>
                </div>
              </header>
              <div className="flex-1 overflow-y-auto p-6">
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">
                  {message.text || "(no text content)"}
                </pre>
              </div>
            </article>
          ) : (
            <div className="flex h-full min-h-[28rem] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <Mail className="h-10 w-10 opacity-40" />
              <p className="text-sm">Select a message to read, or compose a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

function Compose({
  draft,
  setDraft,
  onClose,
  onSend,
  sending,
  onAiDraft,
  drafting,
  isReply,
}: {
  draft: Draft
  setDraft: React.Dispatch<React.SetStateAction<Draft | null>>
  onClose: () => void
  onSend: () => void
  sending: boolean
  onAiDraft: () => void
  drafting: boolean
  isReply: boolean
}) {
  const set = (k: keyof Draft, v: string) => setDraft((d) => (d ? { ...d, [k]: v } : d))
  return (
    <div className="flex h-full flex-col">
      <header className="gk-app-accent flex items-center justify-between border-b p-4">
        <h2 className="text-base font-semibold">{isReply ? "Reply" : "New message"}</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div>
          <Label htmlFor="m-to">To</Label>
          <Input
            id="m-to"
            value={draft.to}
            onChange={(e) => set("to", e.target.value)}
            placeholder="name@example.com"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="m-subject">Subject</Label>
          <Input
            id="m-subject"
            value={draft.subject}
            onChange={(e) => set("subject", e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="m-body">Message</Label>
          <Textarea
            id="m-body"
            value={draft.body}
            onChange={(e) => set("body", e.target.value)}
            rows={12}
            className="mt-1.5 font-sans"
          />
        </div>
      </div>
      <footer className="flex items-center justify-between gap-2 border-t p-4">
        <Button variant="outline" size="sm" onClick={onAiDraft} disabled={drafting}>
          {drafting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          AI draft
        </Button>
        <Button onClick={onSend} disabled={sending} className="gk-shine shadow-md shadow-primary/20">
          {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Send
        </Button>
      </footer>
    </div>
  )
}
