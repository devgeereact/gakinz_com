import { useCallback, useEffect, useRef, useState } from "react"
import { CalendarClock, Download, Loader2, MessageCircleQuestion, Plus, Send, X } from "lucide-react"
import { saveAs } from "file-saver"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  CALL_SLOTS_MAX,
  CALL_TOPIC_MAX,
  MESSAGE_BODY_MAX,
  clientMessages,
  portalRequests,
  type ClientThread,
  type PortalCallRequest,
} from "@/lib/api"
import { LoadError } from "@/app/components/EmptyState"
import { StatusBadge } from "@/app/components/page-kit"
import { formatCallTime, viewerZone, zoneOptions } from "@/app/modules/bookingModel"
import {
  UPDATE_PREFIX,
  callFormProblem,
  callPayload,
  emptyCallForm,
  openCallRequests,
  openUpdateRequests,
  requestsLoadState,
  todayIn,
  type CallFormState,
} from "@/app/modules/portalRequestsModel"

const NO_PROJECT = "none"
const CALLS_OFF = "Call requests open once the studio finishes a server update. Please send a message instead for now."

/**
 * The portal's two requests (docs/PRODUCT-SPEC.md 6.2): ask the studio for an
 * update, or propose times for a call. The server takes the client from the
 * token, so nothing here sends a client id, and only the client's own open
 * requests come back to be listed.
 */
export function PortalRequests({ projects, onUpdateSent }: { projects: { id: number; name: string }[]; onUpdateSent: () => void }) {
  const [mode, setMode] = useState<"update" | "call" | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const [threads, setThreads] = useState<ClientThread[] | null>(null)
  const [calls, setCalls] = useState<PortalCallRequest[] | null>(null)
  const [callsOff, setCallsOff] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const apply = useCallback(
    ([t, c]: [Awaited<ReturnType<typeof clientMessages.list>>, Awaited<ReturnType<typeof portalRequests.calls>>]) => {
      if (t.ok) setThreads(t.data)
      if (c.ok) {
        setCalls(c.data)
        setCallsOff(false)
      } else if (c.status === 503) {
        setCalls([])
        setCallsOff(true)
      }
      const err = !t.ok ? t.error : !c.ok && c.status !== 503 ? c.error : null
      setLoadError(err)
    },
    [],
  )
  const load = useCallback(() => Promise.all([clientMessages.list(), portalRequests.calls()]).then(apply), [apply])

  useEffect(() => {
    let live = true
    Promise.all([clientMessages.list(), portalRequests.calls()]).then((r) => {
      if (live) apply(r)
    })
    return () => {
      live = false
    }
  }, [apply])

  const start = (m: "update" | "call") => {
    setSent(null)
    setMode(m)
  }
  const done = async (message: string) => {
    setMode(null)
    setSent(message)
    await load()
  }

  const updates = threads ? openUpdateRequests(threads) : []
  const openCalls = calls ? openCallRequests(calls) : []
  const zone = viewerZone()
  const view = requestsLoadState(threads, calls, loadError)

  return (
    <Card aria-labelledby="portal-requests-heading">
      <CardHeader className="flex-row flex-wrap items-center gap-2.5 space-y-0">
        <CardTitle id="portal-requests-heading">Requests</CardTitle>
        {mode === null && (
          <span className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => start("update")}>
              <MessageCircleQuestion /> Ask for an update
            </Button>
            {!callsOff && (
              <Button size="sm" variant="outline" onClick={() => start("call")}>
                <CalendarClock /> Request a call
              </Button>
            )}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {mode === "update" ? (
          <UpdateForm
            projects={projects}
            onCancel={() => setMode(null)}
            onSent={async () => {
              onUpdateSent()
              await done("Your question reached the studio. The answer will appear in Messages.")
            }}
          />
        ) : mode === "call" ? (
          <CallForm
            onCancel={() => setMode(null)}
            onUnavailable={() => {
              setCallsOff(true)
              setMode(null)
            }}
            onSent={() => done("Your call request reached the studio. It is not booked until the studio confirms a time.")}
          />
        ) : (
          <>
            {sent && (
              <p role="status" className="mb-3 text-sm">
                {sent}
              </p>
            )}
            {callsOff && <p className="mb-3 text-[13px] text-muted-foreground">{CALLS_OFF}</p>}
            {view === "error" ? (
              <LoadError what="your requests" detail={loadError ?? ""} onRetry={load} />
            ) : view === "loading" ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading requests…
              </div>
            ) : updates.length === 0 && openCalls.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                No open requests. Ask for an update on your work, or suggest times for a call with the studio.
              </p>
            ) : (
              <ul className="divide-y" aria-label="Your open requests">
                {updates.map((t) => (
                  <li key={`u${t.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                    <span className="min-w-0">
                      <b className="block font-semibold [overflow-wrap:anywhere]">{t.subject.slice(UPDATE_PREFIX.length) || "Update request"}</b>
                      <span className="block text-[13px] text-muted-foreground">
                        Update request · {t.replies.some((r) => !r.from_client) ? "answered in Messages" : "waiting for the studio"}
                      </span>
                    </span>
                    <StatusBadge status={t.status === "open" ? "Sent" : "In progress"} />
                  </li>
                ))}
                {openCalls.map((c) => {
                  const when = formatCallTime(c.starts_at, c.timezone, zone)
                  return (
                    <li key={`c${c.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                      <span className="min-w-0">
                        <b className="block font-semibold [overflow-wrap:anywhere]">Call · {when.agreed}</b>
                        <span className="block text-[13px] text-muted-foreground">
                          {c.status === "requested" ? "Your first choice. The studio will confirm a time." : "Confirmed by the studio."}
                          {when.yours ? ` ${when.yours}.` : ""}
                        </span>
                        {c.status === "confirmed" && <CalendarFileButton id={c.id} />}
                      </span>
                      <StatusBadge status={c.status === "requested" ? "pending" : "approved"}>
                        {c.status === "requested" ? "Awaiting confirmation" : "Confirmed"}
                      </StatusBadge>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function UpdateForm({
  projects,
  onCancel,
  onSent,
}: {
  projects: { id: number; name: string }[]
  onCancel: () => void
  onSent: () => Promise<void>
}) {
  const [project, setProject] = useState(NO_PROJECT)
  const [question, setQuestion] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false) // blocks a second submit before React re-renders

  const canSend = question.trim() !== "" && !sending

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSend || inFlight.current) return
    inFlight.current = true
    setSending(true)
    setError(null)
    const res = await portalRequests.askUpdate(question.trim(), project === NO_PROJECT ? null : Number(project))
    if (res.ok || res.status === 409) {
      await onSent() // a 409 means the same question already arrived
      return
    }
    // Keep what they wrote so nothing is lost.
    setError(res.error || "Your question was not sent.")
    inFlight.current = false
    setSending(false)
  }

  return (
    <form onSubmit={send} className="grid gap-3.5">
      <p className="text-sm text-muted-foreground">Ask the studio a clear question. The reply comes back in Messages.</p>
      {projects.length > 0 && (
        <div className="grid gap-1.5">
          <Label id="upd-project-label">Project</Label>
          <Select value={project} onValueChange={setProject} disabled={sending}>
            <SelectTrigger aria-labelledby="upd-project-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PROJECT}>Not about one project</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="upd-question">Your question</Label>
        <Textarea
          id="upd-question"
          className="min-h-24"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={MESSAGE_BODY_MAX}
          disabled={sending}
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error} Your question is still here, so you can try again.
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={sending}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSend}>
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
          {sending ? "Sending…" : "Send question"}
        </Button>
      </div>
    </form>
  )
}

function CallForm({ onCancel, onSent, onUnavailable }: { onCancel: () => void; onSent: () => Promise<void>; onUnavailable: () => void }) {
  const [form, setForm] = useState<CallFormState>(() => emptyCallForm(viewerZone() ?? "Europe/London"))
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const problem = callFormProblem(form)
  const minDate = todayIn(form.zone)
  const setSlot = (i: number, patch: Partial<CallFormState["slots"][number]>) =>
    setForm((f) => ({ ...f, slots: f.slots.map((s, j) => (j === i ? { ...s, ...patch } : s)) }))

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (problem || inFlight.current) return
    inFlight.current = true
    setSending(true)
    setError(null)
    const res = await portalRequests.requestCall(callPayload(form))
    if (res.ok || res.status === 409) {
      await onSent() // a 409 means the same request already arrived
      return
    }
    inFlight.current = false
    setSending(false)
    if (res.status === 503) {
      onUnavailable()
      return
    }
    setError(res.error || "Your call request was not sent.")
  }

  return (
    <form onSubmit={send} className="grid gap-3.5">
      <p className="text-sm text-muted-foreground">
        Suggest up to {CALL_SLOTS_MAX} times that suit you. Nothing is booked until the studio confirms one.
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="call-topic">What is the call about?</Label>
        <Input
          id="call-topic"
          value={form.topic}
          onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
          maxLength={CALL_TOPIC_MAX}
          disabled={sending}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label id="call-zone-label">Your time zone</Label>
        <Select value={form.zone} onValueChange={(zone) => setForm((f) => ({ ...f, zone }))} disabled={sending}>
          <SelectTrigger aria-labelledby="call-zone-label">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {zoneOptions(viewerZone(), form.zone).map((z) => (
              <SelectItem key={z} value={z}>
                {z}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <fieldset className="grid gap-2.5">
        <legend className="mb-1.5 text-sm font-medium">Times that suit you, first choice first</legend>
        {form.slots.map((s, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,8rem)_auto] items-end gap-2">
            <div className="grid gap-1">
              <Label htmlFor={`call-date-${i}`} className="text-[13px] text-muted-foreground">
                Choice {i + 1}, date
              </Label>
              <Input id={`call-date-${i}`} type="date" min={minDate} value={s.date} onChange={(e) => setSlot(i, { date: e.target.value })} disabled={sending} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`call-time-${i}`} className="text-[13px] text-muted-foreground">
                Time
              </Label>
              <Input id={`call-time-${i}`} type="time" value={s.time} onChange={(e) => setSlot(i, { time: e.target.value })} disabled={sending} />
            </div>
            {form.slots.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove choice ${i + 1}`}
                onClick={() => setForm((f) => ({ ...f, slots: f.slots.filter((_, j) => j !== i) }))}
                disabled={sending}
              >
                <X />
              </Button>
            ) : (
              <span className="w-9" aria-hidden />
            )}
          </div>
        ))}
        {form.slots.length < CALL_SLOTS_MAX && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-self-start"
            onClick={() => setForm((f) => ({ ...f, slots: [...f.slots, { date: "", time: "" }] }))}
            disabled={sending}
          >
            <Plus /> Add another time
          </Button>
        )}
      </fieldset>
      {problem && form.topic.trim() !== "" && <p className="text-[13px] text-muted-foreground">{problem}</p>}
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error} Your times are still here, so you can try again.
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={sending}>
          Cancel
        </Button>
        <Button type="submit" disabled={!!problem || sending}>
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
          {sending ? "Sending…" : "Send call request"}
        </Button>
      </div>
    </form>
  )
}

/** Saves the calendar file for one of the client's own confirmed calls. */
function CalendarFileButton({ id }: { id: number }) {
  const [busy, setBusy] = useState(false)
  const download = async () => {
    setBusy(true)
    const res = await portalRequests.calendarFile(id)
    setBusy(false)
    if (res.ok) saveAs(res.data, `gakinz-call-${id}.ics`)
    else toast.error(res.error || "Could not download the calendar file.")
  }
  return (
    <Button size="sm" variant="outline" className="mt-2" onClick={download} disabled={busy}>
      {busy ? <Loader2 className="animate-spin" /> : <Download />} Download calendar file
    </Button>
  )
}
