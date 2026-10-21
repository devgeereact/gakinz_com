import { useEffect, useRef, useState, useCallback } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { LoadError } from "@/app/components/EmptyState"
import { PageHeader } from "@/app/components/page-kit"
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
  const msgReqRef = useRef(0) // newest message opened; drops out-of-order responses

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
    const my = ++msgReqRef.current
    setSelectedUid(uid)
    setDraft(null)
    setLoadingMsg(true)
    setMessage(null)
    const res = await mail.message(uid)
    if (msgReqRef.current !== my) return // a newer message was opened — drop this stale response
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

  // "Try again" after a failed load: re-check the mailbox status first when
  // that is what failed, otherwise reload the inbox with the current search.
  const retry = async () => {
    if (status?.imap) return loadInbox(search)
    setLoadingList(true)
    setListError(null)
    const st = await mail.status()
    if (st.ok) {
      setStatus(st.data)
      if (st.data.imap) loadInbox(search)
      else setLoadingList(false)
    } else {
      setLoadingList(false)
      setListError(st.error)
    }
  }

  return (
    <div>
      <PageHeader
        title="Mailbox"
        subtitle={
          <>
            The studio inbox, hello@gakinz.com, read and answered without leaving the platform.
            {unread > 0 && <span className="font-medium text-foreground"> {unread} unread.</span>}
          </>
        }
        actions={
          <>
            <Button onClick={startCompose} disabled={!status?.smtp}>
              <PenSquare /> Compose
            </Button>
            <Button variant="outline" onClick={() => loadInbox(search)} disabled={!status?.imap || loadingList}>
              <RefreshCw className={cn(loadingList && "animate-spin")} /> Refresh
            </Button>
          </>
        }
      />

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

      <form onSubmit={onSearch} className="mb-3.5 flex flex-wrap items-center gap-2" role="search">
        <label className="flex min-h-10 min-w-0 max-w-[340px] flex-1 items-center gap-2 rounded-[10px] border bg-card px-3 focus-within:border-acc focus-within:ring-[3px] focus-within:ring-acc-soft">
          <Search aria-hidden className="size-[18px] shrink-0 text-muted-foreground" />
          <span className="sr-only">Search mail</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mail…"
            disabled={!status?.imap}
            className="w-full min-w-0 border-0 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
        </label>
      </form>

      {listError && <LoadError what="the inbox" detail={listError} onRetry={retry} className="mb-4" />}

      {/* Two panes */}
      <div className="grid items-start gap-4 min-[901px]:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* List */}
        <div className="min-w-0 rounded-2xl border bg-card p-1.5">
          {loadingList ? (
            <div aria-busy="true" aria-label="Loading inbox" className="grid gap-1 p-1">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="grid gap-2 px-2.5 py-2.5">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              ))}
            </div>
          ) : listError ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">The inbox could not be loaded.</p>
          ) : list.length === 0 ? (
            <div className="grid place-items-center gap-2.5 px-4 py-12 text-center">
              <span aria-hidden className="grid size-12 place-items-center rounded-[14px] bg-acc-soft text-acc">
                <InboxIcon className="size-[18px]" />
              </span>
              <p className="font-display text-[1.05rem] font-semibold">{status?.imap ? "No messages" : "Inbox unavailable"}</p>
              <p className="max-w-[30ch] text-sm text-muted-foreground">
                {status?.imap ? "New mail to the studio inbox lands here." : "Set up the inbox on the server to read mail here."}
              </p>
            </div>
          ) : (
            <ul className="max-h-[34rem] overflow-y-auto">
              {list.map((m) => (
                <li key={m.uid}>
                  <button
                    type="button"
                    data-mail-row
                    onClick={() => openMessage(m.uid)}
                    aria-current={selectedUid === m.uid || undefined}
                    className={cn(
                      "flex min-h-10 w-full flex-col items-start gap-0.5 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-secondary",
                      selectedUid === m.uid && "bg-secondary",
                    )}
                  >
                    <span className="flex w-full min-w-0 items-start gap-2">
                      <b className={cn("min-w-0 flex-1 [overflow-wrap:anywhere]", m.seen ? "font-medium" : "font-bold")}>
                        {!m.seen && <span className="sr-only">Unread: </span>}
                        {m.from_name || m.from_email}
                      </b>
                      <span className="shrink-0 pt-0.5 font-mono text-xs tabular-nums text-muted-foreground">{when(m.date)}</span>
                      {!m.seen && <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-acc" />}
                    </span>
                    <span className={cn("w-full min-w-0 text-[13.5px] [overflow-wrap:anywhere]", m.seen && "text-muted-foreground")}>{m.subject}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Reading or compose pane */}
        <div className="min-h-[24rem] min-w-0 rounded-2xl border bg-card p-[18px]">
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
            <p className="flex min-h-[20rem] items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Opening…
            </p>
          ) : message ? (
            <article>
              <h2 className="font-display text-[1.3rem] font-semibold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere]">{message.subject}</h2>
              <p className="mb-4 mt-1.5 text-muted-foreground [overflow-wrap:anywhere]">
                From {message.from_name ? <>{message.from_name} &lt;{message.from_email}&gt;</> : message.from_email}
                {message.date ? ` · ${new Date(message.date).toLocaleString("en-GB")}` : ""}
              </p>
              <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-foreground [overflow-wrap:anywhere]">
                {message.text || "(no text content)"}
              </pre>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={startReply} disabled={!status?.smtp}>
                  <Reply /> Reply
                </Button>
              </div>
            </article>
          ) : (
            <div className="flex min-h-[20rem] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <Mail aria-hidden className="size-8 opacity-50" />
              <p>Select a message to read, or compose a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="mb-3 flex items-start gap-3 rounded-2xl bg-warn-soft p-4 text-sm text-foreground [overflow-wrap:anywhere]">
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" />
      <span className="min-w-0">{children}</span>
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
    <div className="grid gap-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-[1.3rem] font-semibold leading-tight tracking-[-0.02em]">{isReply ? "Reply" : "New message"}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close without sending">
          <X />
        </Button>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="m-to">To</Label>
        <Input id="m-to" value={draft.to} onChange={(e) => set("to", e.target.value)} placeholder="name@example.com" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="m-subject">Subject</Label>
        <Input id="m-subject" value={draft.subject} onChange={(e) => set("subject", e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="m-body">Message</Label>
        <Textarea id="m-body" value={draft.body} onChange={(e) => set("body", e.target.value)} rows={12} className="font-sans" />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={onAiDraft} disabled={drafting}>
          {drafting ? <Loader2 className="animate-spin" /> : <Sparkles />}
          AI draft
        </Button>
        <Button onClick={onSend} disabled={sending}>
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
          Send
        </Button>
      </div>
    </div>
  )
}
