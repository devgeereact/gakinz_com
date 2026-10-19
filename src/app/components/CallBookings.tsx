import { useState } from "react"
import { LINKED_RECORD, recordElementId } from "@/lib/deepLink"
import { CalendarClock, Check, Download, ExternalLink, Loader2, MapPin, Pencil, RotateCw, X } from "lucide-react"
import { saveAs } from "file-saver"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { bookings, type Booking, type BookingChange, type BookingInput } from "@/lib/api"
import {
  BOOKING_NEXT,
  BOOKING_STATUS,
  callWith,
  canReschedule,
  describeEvent,
  failedNotice,
  formatCallTime,
  isOverdueCall,
  isWebLink,
  noticeText,
  validLocal,
  viewerZone,
  zoneOptions,
} from "@/app/modules/bookingModel"
import { cn } from "@/lib/utils"

/**
 * Call bookings (bookings.php), shared by the enquiry drawer and the Calls view
 * in Enquiries. Every call is recorded by hand; a request stays "Requested, not
 * confirmed" until the owner confirms it. Times show in the zone they were
 * agreed in, with the viewer's own time underneath when it differs.
 */

type Change = (b: Booking) => void

/** Tell the owner what happened to a customer email, if one was asked for. */
function reportNotice(res: BookingChange) {
  if (!res.notice) return
  if (res.notice.status === "sent") toast.success(`Customer emailed${res.notice.to ? ` at ${res.notice.to}` : ""}.`)
  else toast.error(`The change is saved, but the email failed${res.notice.error ? `: ${res.notice.error}` : "."} Retry it from the call.`)
}

export function CallList({
  calls,
  onChange,
  showWith = false,
  empty,
  linked = null,
}: {
  calls: Booking[]
  onChange: Change
  showWith?: boolean
  empty: string
  /** A call a deep link points at (src/lib/deepLink.ts): outlined. */
  linked?: number | null
}) {
  const [moving, setMoving] = useState<Booking | null>(null)
  const [ending, setEnding] = useState<{ call: Booking; to: "completed" | "cancelled" } | null>(null)
  const [editing, setEditing] = useState<Booking | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const viewer = viewerZone()

  const confirm = async (c: Booking) => {
    setBusy(c.id)
    const res = await bookings.setStatus(c.id, "confirmed")
    setBusy(null)
    if (res.ok) {
      onChange(res.data.booking)
      toast.success("Call confirmed.")
    } else toast.error(res.error || "Could not confirm the call.")
  }

  const retry = async (c: Booking, eventId: number) => {
    setBusy(c.id)
    const res = await bookings.retryNotice(eventId)
    setBusy(null)
    if (!res.ok) {
      toast.error(res.error || "Could not retry the email.")
      return
    }
    reportNotice({ booking: c, notice: res.data.notice })
    const list = await bookings.list(c.enquiry_id ? { enquiry_id: c.enquiry_id } : { client_id: c.client_id ?? 0 })
    const fresh = list.ok ? list.data.find((x) => x.id === c.id) : undefined
    if (fresh) onChange(fresh)
  }

  const calendarFile = async (c: Booking) => {
    setBusy(c.id)
    const res = await bookings.calendarFile(c.id)
    setBusy(null)
    if (res.ok) saveAs(res.data, `gakinz-call-${c.id}.ics`)
    else toast.error(res.error || "Could not download the calendar file.")
  }

  if (calls.length === 0) return <p className="py-3 text-sm text-muted-foreground">{empty}</p>

  return (
    <>
      <ul className="m-0 grid list-none gap-2.5 p-0">
        {calls.map((c) => {
          const t = formatCallTime(c.starts_at, c.timezone, viewer)
          const meta = BOOKING_STATUS[c.status]
          const failed = failedNotice(c)
          const overdue = isOverdueCall(c)
          return (
            <li
              key={c.id}
              id={recordElementId("call", c.id)}
              className={cn("grid min-w-0 scroll-m-4 gap-2 rounded-xl border bg-card p-3", c.id === linked && LINKED_RECORD)}
            >
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                <div className="min-w-0">
                  {showWith && <b className="block font-semibold [overflow-wrap:anywhere]">{callWith(c)}</b>}
                  <span className={cn("block [overflow-wrap:anywhere]", !showWith && "font-semibold")}>{t.agreed}</span>
                  {t.yours && <small className="block text-[12.5px] text-muted-foreground">{t.yours}</small>}
                </div>
                <Badge variant={meta.tone}>{meta.label}</Badge>
              </div>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock aria-hidden className="size-3.5 shrink-0" /> {c.duration_min} min
                </span>
                {c.location && (
                  <span className="inline-flex min-w-0 items-center gap-1 [overflow-wrap:anywhere]">
                    <MapPin aria-hidden className="size-3.5 shrink-0" />
                    {isWebLink(c.location) ? (
                      <a href={c.location.trim()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-acc hover:underline">
                        Meeting link <ExternalLink aria-hidden className="size-3" />
                      </a>
                    ) : (
                      c.location
                    )}
                  </span>
                )}
              </p>
              {overdue && <p className="text-[13px] text-warn">This time has passed. Record whether the call happened.</p>}
              {c.outcome && <p className="text-[13px] [overflow-wrap:anywhere]"><b className="font-semibold">Outcome:</b> {c.outcome}</p>}
              {c.notes && <p className="whitespace-pre-wrap text-[13px] text-muted-foreground [overflow-wrap:anywhere]">{c.notes}</p>}
              {failed && (
                <p role="status" className="text-[13px] text-bad [overflow-wrap:anywhere]">
                  {noticeText(failed)}
                </p>
              )}
              {c.history.length > 0 && (
                <details className="text-[13px] text-muted-foreground">
                  <summary className="cursor-pointer select-none">History ({c.history.length})</summary>
                  <ul className="mt-1.5 grid list-none gap-1 p-0">
                    {c.history.map((e) => (
                      <li key={e.id} className="[overflow-wrap:anywhere]">
                        {describeEvent(e)}
                        {e.by ? ` by ${e.by}` : ""}, {e.created_at.slice(0, 16).replace("T", " ")}
                        {noticeText(e) ? `. ${noticeText(e)}` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="flex flex-wrap gap-2">
                {c.status === "requested" && (
                  <Button size="sm" onClick={() => confirm(c)} disabled={busy === c.id}>
                    {busy === c.id ? <Loader2 className="animate-spin" /> : <Check />} Confirm
                  </Button>
                )}
                {BOOKING_NEXT[c.status].includes("completed") && (
                  <Button size="sm" variant="outline" onClick={() => setEnding({ call: c, to: "completed" })}>
                    <Check /> Completed
                  </Button>
                )}
                {canReschedule(c.status) && (
                  <Button size="sm" variant="outline" onClick={() => setMoving(c)}>
                    <CalendarClock /> Reschedule
                  </Button>
                )}
                {c.status === "confirmed" && (
                  <Button size="sm" variant="outline" onClick={() => calendarFile(c)} disabled={busy === c.id}>
                    <Download /> Download calendar file
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                  <Pencil /> Notes
                </Button>
                {failed && (
                  <Button size="sm" variant="outline" onClick={() => retry(c, failed.id)} disabled={busy === c.id}>
                    <RotateCw /> Retry email
                  </Button>
                )}
                {BOOKING_NEXT[c.status].includes("cancelled") && (
                  <Button size="sm" variant="ghost" className="text-bad" onClick={() => setEnding({ call: c, to: "cancelled" })}>
                    <X /> Cancel call
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {moving && <RescheduleDialog call={moving} onClose={() => setMoving(null)} onDone={onChange} />}
      {ending && <EndDialog call={ending.call} to={ending.to} onClose={() => setEnding(null)} onDone={onChange} />}
      {editing && <NotesDialog call={editing} onClose={() => setEditing(null)} onDone={onChange} />}
    </>
  )
}

function ZoneSelect({ id, value, onChange }: { id: string; value: string; onChange: (z: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="mt-1.5">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {zoneOptions(viewerZone(), value).map((z) => (
          <SelectItem key={z} value={z}>
            {z.replace(/_/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function NotifySwitch({ id, checked, onChange, what }: { id: string; checked: boolean; onChange: (v: boolean) => void; what: string }) {
  return (
    <div className="flex items-start gap-3">
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
      <Label htmlFor={id} className="grid gap-0.5 font-normal">
        <span className="font-medium">Email the customer</span>
        <span className="text-xs text-muted-foreground">Sends a short note about the {what} to the client or enquiry email. Notes are never included.</span>
      </Label>
    </div>
  )
}

export type CallLink = { value: string; label: string } // "e:12" or "c:4"

/** Record a new call, against a fixed enquiry or client, or one picked from `links`. */
export function RecordCallDialog({
  open,
  onClose,
  onDone,
  fixed,
  links,
  title = "Record a call",
}: {
  open: boolean
  onClose: () => void
  onDone: Change
  fixed?: { enquiry_id?: number; client_id?: number }
  links?: CallLink[]
  title?: string
}) {
  const [link, setLink] = useState("")
  const [local, setLocal] = useState("")
  const [zone, setZone] = useState("Europe/London")
  const [duration, setDuration] = useState("30")
  const [location, setLocation] = useState("")
  const [status, setStatus] = useState<"requested" | "confirmed">("requested")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!validLocal(local)) return toast.error("Choose a date and time.")
    const payload: BookingInput = { start_local: local, timezone: zone, duration_min: Number(duration), location: location.trim() || null, status, notes: notes.trim() || null }
    if (fixed) Object.assign(payload, fixed)
    else if (link.startsWith("e:")) payload.enquiry_id = Number(link.slice(2))
    else if (link.startsWith("c:")) payload.client_id = Number(link.slice(2))
    else return toast.error("Choose who the call is with.")
    setSaving(true)
    const res = await bookings.create(payload)
    setSaving(false)
    if (!res.ok) return toast.error(res.error || "Could not record the call.")
    toast.success(status === "confirmed" ? "Call recorded as confirmed." : "Call recorded as a request.")
    onDone(res.data)
    setLocal("")
    setLocation("")
    setNotes("")
    setStatus("requested")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>A phone or email booking, recorded by hand. It stays a request until you confirm it.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {!fixed && (
            <div className="sm:col-span-2">
              <Label htmlFor="call-with">With</Label>
              <Select value={link} onValueChange={setLink}>
                <SelectTrigger id="call-with" className="mt-1.5">
                  <SelectValue placeholder="Choose an enquiry or client" />
                </SelectTrigger>
                <SelectContent>
                  {(links ?? []).map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="call-start">Date and time</Label>
            <Input id="call-start" type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="call-zone">Time zone</Label>
            <ZoneSelect id="call-zone" value={zone} onChange={setZone} />
          </div>
          <div>
            <Label htmlFor="call-duration">Length (minutes)</Label>
            <Input id="call-duration" type="number" min={5} max={480} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="call-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "requested" | "confirmed")}>
              <SelectTrigger id="call-status" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requested">Requested, not confirmed</SelectItem>
                <SelectItem value="confirmed">Confirmed with the customer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="call-location">Meeting link, phone number or place</Label>
            <Input id="call-location" value={location} maxLength={500} onChange={(e) => setLocation(e.target.value)} className="mt-1.5" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="call-notes">Notes, for you only</Label>
            <Textarea id="call-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Save call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RescheduleDialog({ call, onClose, onDone }: { call: Booking; onClose: () => void; onDone: Change }) {
  const [local, setLocal] = useState(call.start_local)
  const [zone, setZone] = useState(call.timezone)
  const [duration, setDuration] = useState(String(call.duration_min))
  const [notify, setNotify] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!validLocal(local)) return toast.error("Choose a date and time.")
    setSaving(true)
    const res = await bookings.reschedule(call.id, { start_local: local, timezone: zone, duration_min: Number(duration), notify })
    setSaving(false)
    if (!res.ok) return toast.error(res.error || "Could not reschedule the call.")
    onDone(res.data.booking)
    toast.success("Call moved. The old time is kept in its history.")
    reportNotice(res.data)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule the call</DialogTitle>
          <DialogDescription>Now {formatCallTime(call.starts_at, call.timezone).agreed}.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="move-start">New date and time</Label>
            <Input id="move-start" type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="move-zone">Time zone</Label>
            <ZoneSelect id="move-zone" value={zone} onChange={setZone} />
          </div>
          <div>
            <Label htmlFor="move-duration">Length (minutes)</Label>
            <Input id="move-duration" type="number" min={5} max={480} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1.5" />
          </div>
          <div className="sm:col-span-2">
            <NotifySwitch id="move-notify" checked={notify} onChange={setNotify} what="new time" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Move call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EndDialog({ call, to, onClose, onDone }: { call: Booking; to: "completed" | "cancelled"; onClose: () => void; onDone: Change }) {
  const [outcome, setOutcome] = useState(call.outcome ?? "")
  const [notify, setNotify] = useState(false)
  const [saving, setSaving] = useState(false)
  const cancelling = to === "cancelled"

  const save = async () => {
    setSaving(true)
    const res = await bookings.setStatus(call.id, to, cancelling ? { notify } : { outcome: outcome.trim() || null })
    setSaving(false)
    if (!res.ok) return toast.error(res.error || "Could not update the call.")
    onDone(res.data.booking)
    toast.success(cancelling ? "Call cancelled." : "Call marked completed.")
    reportNotice(res.data)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cancelling ? "Cancel the call" : "Record the outcome"}</DialogTitle>
          <DialogDescription>{formatCallTime(call.starts_at, call.timezone).agreed}</DialogDescription>
        </DialogHeader>
        {cancelling ? (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">A cancelled call stays on the record and cannot be moved. Record a new call to rebook.</p>
            <NotifySwitch id="end-notify" checked={notify} onChange={setNotify} what="cancellation" />
          </div>
        ) : (
          <div>
            <Label htmlFor="end-outcome">What was decided</Label>
            <Textarea id="end-outcome" rows={3} maxLength={1000} value={outcome} onChange={(e) => setOutcome(e.target.value)} className="mt-1.5" />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant={cancelling ? "destructive" : "default"} onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            {cancelling ? "Cancel call" : "Mark completed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NotesDialog({ call, onClose, onDone }: { call: Booking; onClose: () => void; onDone: Change }) {
  const [location, setLocation] = useState(call.location ?? "")
  const [notes, setNotes] = useState(call.notes ?? "")
  const [outcome, setOutcome] = useState(call.outcome ?? "")
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const res = await bookings.update(call.id, { location: location.trim() || null, notes: notes.trim() || null, outcome: outcome.trim() || null })
    setSaving(false)
    if (!res.ok) return toast.error(res.error || "Could not save.")
    onDone(res.data)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Call details</DialogTitle>
          <DialogDescription>For you only. None of this is sent to the customer.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="det-location">Meeting link, phone number or place</Label>
            <Input id="det-location" value={location} maxLength={500} onChange={(e) => setLocation(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="det-notes">Notes</Label>
            <Textarea id="det-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="det-outcome">Outcome</Label>
            <Textarea id="det-outcome" rows={2} maxLength={1000} value={outcome} onChange={(e) => setOutcome(e.target.value)} className="mt-1.5" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
