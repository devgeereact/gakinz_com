import { useCallback, useEffect, useRef, useState } from "react"
import { saveAs } from "file-saver"
import { Download, FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  BRIEF_FIELD_MAX,
  MEASURE_FIELD_MAX,
  MEASURE_LABEL_MAX,
  MEASUREMENT_RESULTS,
  projectBriefs,
  type BriefView,
  type Measurement,
  type MeasurementKind,
  type MeasurementResult,
  type ProjectBrief,
} from "@/lib/api"
import { LoadError } from "@/app/components/EmptyState"
import { assetsLoadState } from "@/app/modules/assetChecklistModel"
import {
  BRIEF_SECTIONS,
  briefFailure,
  briefPatch,
  briefProblem,
  briefProgress,
  draftFromBrief,
  handoffFileName,
  HANDOFF_NOTE,
  measureDraft,
  measureInput,
  measureProblem,
  measurementSummary,
  RESULT_BADGE,
  type BriefDraft,
  type BriefFailure,
  type MeasureDraft,
} from "@/app/modules/projectBriefModel"

/**
 * Staff panel on a project board: the brief and the agreed measurements
 * (docs/PRODUCT-SPEC.md 6.4), filled in progressively, one group at a time,
 * and the sanitised GEE OS handoff download (6.5). Until SQL 16 runs,
 * briefs.php answers 503 and this panel says so.
 */
export function ProjectBriefPanel({
  projectId,
  projectName,
  onDirtyChange,
  requestLeave,
}: {
  projectId: number
  projectName: string
  /** Tells the page whether any section holds unsaved edits. The page owns the single unsaved-changes guard. */
  onDirtyChange: (dirty: boolean) => void
  /** The page guard's requestLeave: runs the action now, or after Leave is confirmed. */
  requestLeave: (leave: () => void) => void
}) {
  const [data, setData] = useState<BriefView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Why the panel cannot be used yet, or null: SQL 16 not run, or briefs.php not uploaded.
  const [unavailable, setUnavailable] = useState<Exclude<BriefFailure, "error"> | null>(null)
  const [downloading, setDownloading] = useState(false)
  // Sections being edited with unsaved changes, reported up as one flag.
  const [dirtySections, setDirtySections] = useState<ReadonlySet<string>>(new Set())
  const reportDirty = useCallback((id: string, isDirty: boolean) => {
    setDirtySections((prev) => {
      if (prev.has(id) === isDirty) return prev
      const next = new Set(prev)
      if (isDirty) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])
  const anyDirty = dirtySections.size > 0
  useEffect(() => {
    onDirtyChange(anyDirty)
    return () => onDirtyChange(false)
  }, [anyDirty, onDirtyChange])

  const apply = useCallback((res: Awaited<ReturnType<typeof projectBriefs.get>>) => {
    if (res.ok) {
      setData(res.data)
      setLoadError(null)
      setUnavailable(null)
    } else {
      const why = briefFailure(res)
      if (why === "error") setLoadError(res.error)
      else setUnavailable(why)
    }
  }, [])
  const load = useCallback(() => projectBriefs.get(projectId).then(apply), [projectId, apply])
  // Retry clears the error first, so the panel shows its loading line while it asks again.
  const retry = useCallback(() => {
    setLoadError(null)
    return load()
  }, [load])

  useEffect(() => {
    // The parent keys this panel on the project, so a new project starts from fresh state.
    let live = true
    projectBriefs.get(projectId).then((r) => {
      if (live) apply(r)
    })
    return () => {
      live = false
    }
  }, [projectId, apply])

  const download = async () => {
    setDownloading(true)
    const res = await projectBriefs.handoff(projectId)
    setDownloading(false)
    if (res.ok) saveAs(res.data, handoffFileName(projectId))
    else toast.error(res.error || "Could not download the handoff.")
  }

  const view = assetsLoadState(data ? [data] : null, loadError, unavailable !== null)
  const brief = data?.brief ?? null
  const setBrief = (b: ProjectBrief) => setData((d) => (d ? { ...d, brief: b } : d))
  const setMeasurements = (fn: (xs: Measurement[]) => Measurement[]) => setData((d) => (d ? { ...d, measurements: fn(d.measurements) } : d))

  return (
    <section className="mt-4 min-w-0 rounded-2xl border bg-card p-[18px]" aria-labelledby={`brief-${projectId}-heading`}>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 id={`brief-${projectId}-heading`} className="flex items-center gap-2 font-display text-lg font-semibold tracking-[-0.01em]">
          <FileText className="size-4 text-muted-foreground" aria-hidden /> Brief
        </h3>
        {view === "ready" && <span className="text-[13px] text-muted-foreground">{briefProgress(brief).text}</span>}
        {view === "ready" && (
          <Button size="sm" variant="outline" className="ml-auto" onClick={download} disabled={downloading}>
            {downloading ? <Loader2 className="animate-spin" /> : <Download />} Download handoff
          </Button>
        )}
      </div>

      {view === "unavailable" ? (
        <p className="text-sm text-muted-foreground">
          {unavailable === "not_on_server"
            ? "The project brief is not available yet."
            : "The project brief needs a database update first (SQL 16 in docs/DEPLOYMENT.md)."}
        </p>
      ) : view === "error" ? (
        <LoadError what="the brief" detail={loadError ?? ""} onRetry={retry} />
      ) : view === "loading" || !data ? (
        <div role="status" className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading the brief…
        </div>
      ) : (
        <>
          <p className="mb-3 text-[13px] text-muted-foreground">
            No field is required. Fill in what is known and come back as the project moves. {HANDOFF_NOTE}
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {BRIEF_SECTIONS.map((section) => (
              <BriefSection key={section.title} projectId={projectId} section={section} brief={brief} onSaved={setBrief} onUnavailable={() => setUnavailable("sql")} reportDirty={reportDirty} requestLeave={requestLeave} />
            ))}
          </div>
          <Measurements
            projectId={projectId}
            projectName={projectName}
            items={data.measurements}
            onChange={setMeasurements}
            onStale={load}
          />
        </>
      )}
    </section>
  )
}

function BriefSection({
  projectId,
  section,
  brief,
  onSaved,
  onUnavailable,
  reportDirty,
  requestLeave,
}: {
  projectId: number
  section: (typeof BRIEF_SECTIONS)[number]
  brief: ProjectBrief | null
  onSaved: (b: ProjectBrief) => void
  onUnavailable: () => void
  reportDirty: (id: string, dirty: boolean) => void
  requestLeave: (leave: () => void) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<BriefDraft>(() => draftFromBrief(brief))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const slug = section.title.toLowerCase().replace(/\W+/g, "-")

  const problem = briefProblem(draft)
  // Only this group's fields are compared, so another group's edit is never resent.
  const keys = section.fields.map((f) => f.key)
  const patch = Object.fromEntries(Object.entries(briefPatch(brief, draft)).filter(([k]) => keys.includes(k as (typeof keys)[number])))

  // Dirty = open for editing and differs from the saved brief (the patch is exactly that difference).
  const dirty = editing && Object.keys(patch).length > 0
  useEffect(() => {
    reportDirty(slug, dirty)
    return () => reportDirty(slug, false)
  }, [slug, dirty, reportDirty])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (problem || inFlight.current) return
    if (Object.keys(patch).length === 0) {
      setEditing(false)
      return
    }
    inFlight.current = true
    setSaving(true)
    setError(null)
    const res = await projectBriefs.save(projectId, patch)
    inFlight.current = false
    setSaving(false)
    if (!res.ok) {
      if (res.status === 503) onUnavailable()
      setError(res.error || "The brief was not saved.")
      return
    }
    onSaved(res.data)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="min-w-0 rounded-xl border p-3.5">
        <div className="mb-2 flex items-center gap-2">
          <h4 className="font-semibold">{section.title}</h4>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => {
              setDraft(draftFromBrief(brief))
              setError(null)
              setEditing(true)
            }}
            aria-label={`Edit ${section.title.toLowerCase()}`}
          >
            <Pencil /> Edit
          </Button>
        </div>
        <dl className="grid gap-2 text-sm">
          {section.fields.map((f) => (
            <div key={f.key} className="min-w-0">
              <dt className="text-[12.5px] text-muted-foreground">{f.label}</dt>
              <dd className="whitespace-pre-wrap [overflow-wrap:anywhere]">{brief?.[f.key] || <span className="text-muted-foreground">Not recorded</span>}</dd>
            </div>
          ))}
        </dl>
      </div>
    )
  }

  return (
    <form onSubmit={save} className="grid min-w-0 gap-2.5 rounded-xl border p-3.5" aria-label={`Edit ${section.title.toLowerCase()}`}>
      <h4 className="font-semibold">{section.title}</h4>
      {section.fields.map((f) => {
        const id = `brief-${projectId}-${slug}-${f.key}`
        const max = f.key === "completion_ack_on" ? undefined : BRIEF_FIELD_MAX[f.key]
        return (
          <div key={f.key} className="grid gap-1.5">
            <Label htmlFor={id}>{f.label}</Label>
            {f.key === "completion_ack_on" ? (
              <Input id={id} type="date" value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} disabled={saving} />
            ) : f.multiline ? (
              <Textarea
                id={id}
                className="min-h-16"
                value={draft[f.key]}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                maxLength={max}
                disabled={saving}
                aria-describedby={f.hint ? `${id}-hint` : undefined}
              />
            ) : (
              <Input id={id} value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} maxLength={max} disabled={saving} />
            )}
            {f.hint && (
              <p id={`${id}-hint`} className="text-[12.5px] text-muted-foreground">
                {f.hint}
              </p>
            )}
          </div>
        )
      })}
      {(error || problem) && (
        <p role="alert" className="text-sm text-bad">
          {error || problem}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => (dirty ? requestLeave(() => setEditing(false)) : setEditing(false))} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!!problem || saving}>
          {saving && <Loader2 className="animate-spin" />} Save
        </Button>
      </div>
    </form>
  )
}

function Measurements({
  projectId,
  projectName,
  items,
  onChange,
  onStale,
}: {
  projectId: number
  projectName: string
  items: Measurement[]
  onChange: (fn: (xs: Measurement[]) => Measurement[]) => void
  onStale: () => void
}) {
  const [editing, setEditing] = useState<number | null>(null)
  const [removing, setRemoving] = useState<number | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)

  const remove = async (m: Measurement) => {
    setBusy(m.id)
    const res = await projectBriefs.removeMeasurement(projectId, m.id)
    setBusy(null)
    setRemoving(null)
    if (!res.ok) {
      toast.error(res.error || "The measurement was not removed.")
      if (res.status === 404) onStale()
      return
    }
    onChange((xs) => xs.filter((x) => x.id !== m.id))
  }

  return (
    <div className="mt-4 border-t pt-3">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h4 className="font-semibold">Agreed measurements</h4>
        <span className="text-[13px] text-muted-foreground">{measurementSummary(items)}</span>
      </div>
      <p className="mb-2 text-[13px] text-muted-foreground">
        Technical checks use PASS, FAIL, PARTIAL or NOT TESTED. Record a business outcome, such as enquiries or sales, as a business observation with its time window and caveats.
      </p>
      {items.length > 0 && (
        <ul className="divide-y" aria-label={`Measurements for ${projectName}`}>
          {items.map((m) =>
            editing === m.id ? (
              <li key={m.id} className="py-3">
                <MeasureForm
                  idPrefix={`measure-edit-${m.id}`}
                  initial={measureDraft(m)}
                  submitLabel="Save"
                  onCancel={() => setEditing(null)}
                  onSubmit={async (d) => {
                    const res = await projectBriefs.updateMeasurement(projectId, m.id, measureInput(d))
                    if (!res.ok) {
                      if (res.status === 404) onStale()
                      return res.error || "The measurement was not saved."
                    }
                    onChange((xs) => xs.map((x) => (x.id === m.id ? res.data : x)))
                    setEditing(null)
                    return null
                  }}
                />
              </li>
            ) : (
              <li key={m.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <span className="min-w-0 text-sm">
                  <b className="block font-semibold [overflow-wrap:anywhere]">{m.label}</b>
                  <MeasureLine label="Target" value={m.target} />
                  <MeasureLine label="Baseline" value={m.baseline} />
                  <MeasureLine label="Actual" value={m.actual} />
                  <MeasureLine
                    label="Checked"
                    value={[m.measured_on, m.environment].filter(Boolean).join(", ") || null}
                  />
                  <MeasureLine label="Method" value={m.method} />
                  <MeasureLine label="Evidence" value={m.evidence_location} />
                  {m.kind === "business" && <MeasureLine label="Business observation, window" value={m.observation_window ?? "not set"} />}
                </span>
                <span className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                  <Badge variant={RESULT_BADGE[m.result].variant}>{RESULT_BADGE[m.result].label}</Badge>
                  <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditing(m.id)} disabled={busy === m.id} aria-label={`Edit ${m.label}`}>
                    <Pencil />
                  </Button>
                  {removing === m.id ? (
                    <Button size="sm" variant="destructive" onClick={() => remove(m)} disabled={busy === m.id}>
                      {busy === m.id && <Loader2 className="animate-spin" />} Remove it
                    </Button>
                  ) : (
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => setRemoving(m.id)} disabled={busy === m.id} aria-label={`Remove ${m.label}`}>
                      <Trash2 />
                    </Button>
                  )}
                </span>
              </li>
            ),
          )}
        </ul>
      )}
      <div className="mt-2">
        {adding ? (
          <MeasureForm
            idPrefix={`measure-new-${projectId}`}
            initial={measureDraft(null)}
            submitLabel="Add measurement"
            onCancel={() => setAdding(false)}
            onSubmit={async (d) => {
              const res = await projectBriefs.createMeasurement(projectId, measureInput(d))
              if (!res.ok) return res.error || "The measurement was not added."
              onChange((xs) => [...xs, res.data])
              setAdding(false)
              return null
            }}
          />
        ) : (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus /> Add a measurement
          </Button>
        )}
      </div>
    </div>
  )
}

function MeasureLine({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <span className="block text-[13px] [overflow-wrap:anywhere]">
      <span className="text-muted-foreground">{label}: </span>
      {value}
    </span>
  )
}

const TEXT_FIELDS: { key: keyof typeof MEASURE_FIELD_MAX; label: string }[] = [
  { key: "target", label: "Target" },
  { key: "baseline", label: "Baseline, where available" },
  { key: "actual", label: "Actual result" },
  { key: "environment", label: "Environment" },
  { key: "method", label: "Method and caveats" },
  { key: "evidence_location", label: "Evidence location (a non-sensitive link or file name)" },
]

function MeasureForm({
  idPrefix,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  idPrefix: string
  initial: MeasureDraft
  submitLabel: string
  onSubmit: (d: MeasureDraft) => Promise<string | null>
  onCancel: () => void
}) {
  const [d, setD] = useState<MeasureDraft>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const problem = measureProblem(d)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (problem || inFlight.current) return
    inFlight.current = true
    setSaving(true)
    setError(null)
    const err = await onSubmit(d)
    inFlight.current = false
    setSaving(false)
    if (err) setError(err)
  }

  return (
    <form onSubmit={submit} className="grid gap-2.5 rounded-xl border p-3.5">
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-label`}>What is measured</Label>
        <Input id={`${idPrefix}-label`} value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} maxLength={MEASURE_LABEL_MAX} disabled={saving} placeholder="Enquiry form reaches the inbox" />
      </div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-kind`}>Kind</Label>
          <Select value={d.kind} onValueChange={(v) => setD({ ...d, kind: v as MeasurementKind })} disabled={saving}>
            <SelectTrigger id={`${idPrefix}-kind`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="technical">Technical check</SelectItem>
              <SelectItem value="business">Business observation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-result`}>Result</Label>
          <Select value={d.result} onValueChange={(v) => setD({ ...d, result: v as MeasurementResult })} disabled={saving}>
            <SelectTrigger id={`${idPrefix}-result`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEASUREMENT_RESULTS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-date`}>Date checked</Label>
          <Input id={`${idPrefix}-date`} type="date" value={d.measured_on} onChange={(e) => setD({ ...d, measured_on: e.target.value })} disabled={saving} />
        </div>
      </div>
      {d.kind === "business" && (
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-observation_window`}>Observation window</Label>
          <Input
            id={`${idPrefix}-observation_window`}
            value={d.observation_window}
            onChange={(e) => setD({ ...d, observation_window: e.target.value })}
            maxLength={MEASURE_FIELD_MAX.observation_window}
            disabled={saving}
            placeholder="1 to 30 November"
          />
        </div>
      )}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {TEXT_FIELDS.map((f) => (
          <div key={f.key} className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-${f.key}`}>{f.label}</Label>
            <Input id={`${idPrefix}-${f.key}`} value={d[f.key]} onChange={(e) => setD({ ...d, [f.key]: e.target.value })} maxLength={MEASURE_FIELD_MAX[f.key]} disabled={saving} />
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      {!error && problem && (
        <p id={`${idPrefix}-why`} className="text-[13px] text-muted-foreground">
          {problem}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!!problem || saving} aria-describedby={!error && problem ? `${idPrefix}-why` : undefined}>
          {saving ? <Loader2 className="animate-spin" /> : <Plus />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
