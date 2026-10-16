import { useEffect, useState } from "react"
import { Loader2, MessageSquarePlus, Star } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { feedback as feedbackApi, FEEDBACK_TEXT_MAX, type Feedback, type FeedbackFollowUp } from "@/lib/api"
import { EMPTY_FEEDBACK, FOLLOW_UP_LABEL, feedbackPayload, feedbackReady, type FeedbackFormState } from "@/app/modules/bookingModel"
import { cn } from "@/lib/utils"

/**
 * Private delivery feedback inside a client record (feedback.php, staff only).
 * The client never sees any of this; publication permission is shown on its
 * own and never publishes anything by itself.
 */

/** An optional 1 to 5 rating as five toggle buttons; pressing the current value clears it. */
export function RatingPicker({ value, onChange, idPrefix }: { value: number | null; onChange: (v: number | null) => void; idPrefix: string }) {
  return (
    <div role="group" aria-labelledby={`${idPrefix}-label`} className="flex flex-wrap gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={value === n}
          aria-label={`${n} of 5`}
          onClick={() => onChange(value === n ? null : n)}
          className={cn(
            "grid size-10 place-items-center rounded-[10px] border transition-colors",
            value !== null && n <= value ? "border-acc bg-acc-soft text-acc" : "bg-card text-muted-foreground hover:border-line-strong",
          )}
        >
          <Star aria-hidden className={cn("size-4", value !== null && n <= value && "fill-current")} />
        </button>
      ))}
    </div>
  )
}

/** The shared form body used by the owner's dialog and the client's portal card. */
export function FeedbackFields({
  form,
  set,
  idPrefix,
  projects,
  disabled,
  audience,
}: {
  form: FeedbackFormState
  set: (patch: Partial<FeedbackFormState>) => void
  idPrefix: string
  projects: { id: number; name: string }[]
  disabled?: boolean
  audience: "client" | "owner"
}) {
  const you = audience === "client"
  return (
    <div className="grid gap-4">
      {projects.length > 0 && (
        <div>
          <Label htmlFor={`${idPrefix}-project`}>Project (optional)</Label>
          <Select value={form.project_id ? String(form.project_id) : "none"} onValueChange={(v) => set({ project_id: v === "none" ? null : Number(v) })} disabled={disabled}>
            <SelectTrigger id={`${idPrefix}-project`} className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No particular project</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <p id={`${idPrefix}-label`} className="mb-1.5 text-sm font-medium">
          Rating (optional)
        </p>
        <RatingPicker value={form.rating} onChange={(rating) => set({ rating })} idPrefix={idPrefix} />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-well`}>What worked</Label>
        <Textarea id={`${idPrefix}-well`} rows={3} maxLength={FEEDBACK_TEXT_MAX} value={form.went_well} onChange={(e) => set({ went_well: e.target.value })} disabled={disabled} className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-improve`}>What could improve</Label>
        <Textarea id={`${idPrefix}-improve`} rows={3} maxLength={FEEDBACK_TEXT_MAX} value={form.could_improve} onChange={(e) => set({ could_improve: e.target.value })} disabled={disabled} className="mt-1.5" />
      </div>
      <div className="flex items-start gap-3">
        <Switch id={`${idPrefix}-follow`} checked={form.follow_up_ok} onCheckedChange={(v) => set({ follow_up_ok: v })} disabled={disabled} className="mt-0.5" />
        <Label htmlFor={`${idPrefix}-follow`} className="font-normal">
          {you ? "I am happy for GAkinz to follow up with me about this" : "They welcome a follow-up"}
        </Label>
      </div>
      <div className="grid gap-2 rounded-xl border bg-secondary p-3">
        <div className="flex items-start gap-3">
          <Switch id={`${idPrefix}-publish`} checked={form.may_publish} onCheckedChange={(v) => set({ may_publish: v })} disabled={disabled} className="mt-0.5" />
          <Label htmlFor={`${idPrefix}-publish`} className="grid gap-0.5 font-normal">
            <span className="font-medium">{you ? "GAkinz may quote this publicly" : "They gave permission to quote it publicly"}</span>
            <span className="text-xs text-muted-foreground">
              {you
                ? "Separate from your feedback and off unless you turn it on. You can withdraw it at any time by messaging us."
                : "Only with their written permission. Nothing is published from here; a testimonial is still added by hand."}
            </span>
          </Label>
        </div>
        {form.may_publish && (
          <div>
            <Label htmlFor={`${idPrefix}-attr`}>{you ? "How you would like to be named" : "Attribution"}</Label>
            <Input id={`${idPrefix}-attr`} maxLength={200} value={form.attribution} onChange={(e) => set({ attribution: e.target.value })} disabled={disabled} className="mt-1.5" placeholder="e.g. Sam, Example Ltd" />
          </div>
        )}
      </div>
    </div>
  )
}

export function ClientFeedback({ clientId, projects }: { clientId: number; projects: { id: number; name: string }[] }) {
  const [state, setState] = useState<{ id: number; list: Feedback[] | null; error: string | null } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [recording, setRecording] = useState(false)

  useEffect(() => {
    let live = true
    feedbackApi.list(clientId).then((r) => {
      if (!live) return
      const error = r.ok ? null : r.status === 503 ? "Feedback appears once the server database update has run." : r.error
      setState({ id: clientId, list: r.ok ? r.data : null, error })
    })
    return () => {
      live = false
    }
  }, [clientId, attempt])

  const current = state && state.id === clientId ? state : null
  const replace = (f: Feedback) => setState((s) => (s && s.list ? { ...s, list: s.list.map((x) => (x.id === f.id ? f : x)) } : s))

  return (
    <section aria-labelledby="client-feedback-heading" className="mt-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p id="client-feedback-heading" className="font-semibold">
          Private feedback
        </p>
        {current && !current.error && (
          <Button size="sm" variant="outline" onClick={() => setRecording(true)}>
            <MessageSquarePlus /> Record feedback
          </Button>
        )}
      </div>
      {!current ? (
        <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading feedback…
        </p>
      ) : current.error ? (
        <p className="py-2 text-sm text-muted-foreground">{current.error}</p>
      ) : (current.list ?? []).length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">No feedback yet. Clients can send it from their portal; only you see it.</p>
      ) : (
        <ul className="m-0 grid list-none gap-2.5 p-0">
          {(current.list ?? []).map((f) => (
            <FeedbackItem key={f.id} item={f} onChange={replace} />
          ))}
        </ul>
      )}
      {recording && (
        <RecordFeedbackDialog
          clientId={clientId}
          projects={projects}
          onClose={() => setRecording(false)}
          onDone={() => {
            setRecording(false)
            setAttempt((n) => n + 1)
          }}
        />
      )}
    </section>
  )
}

function FeedbackItem({ item, onChange }: { item: Feedback; onChange: (f: Feedback) => void }) {
  const [note, setNote] = useState(item.owner_note ?? "")
  const [saving, setSaving] = useState(false)

  const save = async (patch: { follow_up?: FeedbackFollowUp; owner_note?: string | null; may_publish?: boolean }) => {
    setSaving(true)
    const res = await feedbackApi.update(item.id, patch)
    setSaving(false)
    if (res.ok) onChange(res.data)
    else toast.error(res.error || "Could not save.")
  }

  return (
    <li className="grid min-w-0 gap-2 rounded-xl border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] text-muted-foreground">
          {item.rating !== null ? `Rated ${item.rating} of 5 · ` : ""}
          {item.source === "portal" ? "From the portal" : `Recorded by ${item.submitted_by ?? "staff"}`} · {item.created_at.slice(0, 10)}
          {item.project_name ? ` · ${item.project_name}` : ""}
        </span>
        {item.may_publish ? <Badge variant="ok">May be quoted</Badge> : <Badge variant="secondary">Private only</Badge>}
      </div>
      {item.went_well && (
        <p className="text-sm [overflow-wrap:anywhere]">
          <b className="font-semibold">Worked:</b> {item.went_well}
        </p>
      )}
      {item.could_improve && (
        <p className="text-sm [overflow-wrap:anywhere]">
          <b className="font-semibold">Could improve:</b> {item.could_improve}
        </p>
      )}
      {item.may_publish && item.attribution && <p className="text-[13px] text-muted-foreground [overflow-wrap:anywhere]">Named as {item.attribution}</p>}
      {item.follow_up_ok && <p className="text-[13px] text-acc">Welcomes a follow-up</p>}
      <div className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        <div>
          <Label htmlFor={`fb-${item.id}-state`} className="text-[13px]">
            Follow-up
          </Label>
          <Select value={item.follow_up} onValueChange={(v) => save({ follow_up: v as FeedbackFollowUp })} disabled={saving}>
            <SelectTrigger id={`fb-${item.id}-state`} className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FOLLOW_UP_LABEL) as FeedbackFollowUp[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {FOLLOW_UP_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={`fb-${item.id}-note`} className="text-[13px]">
            Your note
          </Label>
          <Input
            id={`fb-${item.id}-note`}
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note.trim() !== (item.owner_note ?? "") && save({ owner_note: note.trim() || null })}
            disabled={saving}
            className="mt-1"
          />
        </div>
      </div>
      {item.may_publish && (
        <div>
          <Button size="sm" variant="ghost" className="text-bad" disabled={saving} onClick={() => save({ may_publish: false })}>
            Record withdrawal
          </Button>
        </div>
      )}
    </li>
  )
}

function RecordFeedbackDialog({
  clientId,
  projects,
  onClose,
  onDone,
}: {
  clientId: number
  projects: { id: number; name: string }[]
  onClose: () => void
  onDone: () => void
}) {
  const [form, setForm] = useState<FeedbackFormState>(EMPTY_FEEDBACK)
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!feedbackReady(form)) return toast.error("Add a rating or a few words first.")
    setSaving(true)
    const res = await feedbackApi.record(clientId, feedbackPayload(form))
    setSaving(false)
    if (!res.ok) return toast.error(res.error || "Could not save the feedback.")
    toast.success("Feedback recorded.")
    onDone()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record feedback</DialogTitle>
          <DialogDescription>Feedback the client gave by email, phone or in person. It stays private.</DialogDescription>
        </DialogHeader>
        <FeedbackFields form={form} set={(p) => setForm((f) => ({ ...f, ...p }))} idPrefix="owner-fb" projects={projects} disabled={saving} audience="owner" />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Save feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
