import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { siteContent, work, type SiteContent, type SiteDrafts, type SiteSection } from "@/lib/api"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/app/components/page-kit"
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard"
import { UnsavedGuardDialog } from "@/components/unsaved-guard-dialog"
import {
  HERO_MAX,
  SECTION_TAB,
  SITE_MAX_ROWS,
  addRow,
  dirtySections,
  effectiveContent,
  focusAfterMove,
  formatPublishedDate,
  isLegacyServices,
  missingBuiltIns,
  lastPublished,
  moveRow,
  normaliseSecs,
  prepareSection,
  removeRow,
  storedServices,
  textOn,
  unpublishedSections,
  validateSection,
  SERVICE_LIST_MAX,
  type SiteTab,
} from "./siteContentModel"

// Site content (D-046): the words and lists the public website reads from
// server/site.php. Each section is edited here, saved as a draft, and reaches
// the public site only when published. A section never saved shows the site's
// built-in copy (src/marketing/data/content.ts), so the editor is never empty.

const TABS: [SiteTab, string][] = [
  ["hero", "Homepage hero"],
  ["services", "Services"],
  ["process", "Process"],
  ["pricing", "Pricing"],
  ["faqs", "FAQs"],
  ["contact", "Contact and footer"],
]

type HeroSlot = { id: number; title: string; colour: string | null; word: string | null }
type LoadError = { message: string; status?: number }
type SectionErrors = Partial<Record<SiteSection, string>>

function SectionError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      {message}
    </p>
  )
}

/** "A", "A and B", "A, B and C". */
const joinNames = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`)

function Help({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="mt-1 text-xs text-muted-foreground">
      {children}
    </p>
  )
}

// ── List editor ─────────────────────────────────────────────────────────────
// `lines`: a list edited one item per line. `options`: a fixed choice.
type FieldDef = { key: string; label: string; long?: boolean; lines?: boolean; options?: [string, string][]; hint?: string }

// Native, not the Radix trigger, so the visible <label htmlFor> names a real control (as in Work).
const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
type Row = Record<string, unknown>

function ListEditor<T extends Row>({
  id,
  rows,
  fields,
  blank,
  addLabel,
  two,
  labelled,
  flag,
  onChange,
}: {
  id: string
  rows: T[]
  fields: FieldDef[]
  blank: T
  addLabel: string
  two?: boolean
  /** Show each field's label above it, for rows with more fields than a placeholder can carry. */
  labelled?: boolean
  flag?: { key: string; label: string }
  onChange: (rows: T[]) => void
}) {
  const root = useRef<HTMLDivElement>(null)
  // Where focus should land once the rows have re-rendered.
  const pending = useRef<string | null>(null)

  useEffect(() => {
    if (!pending.current || !root.current) return
    const el = root.current.querySelector<HTMLElement>(pending.current)
    pending.current = null
    el?.focus()
  })

  const move = (i: number, d: number) => {
    const next = moveRow(rows, i, d)
    if (next === rows) return
    const f = focusAfterMove(next.length, i, d)
    pending.current = `[data-mv="${f.index}:${f.delta}"]`
    onChange(next)
  }
  const remove = (i: number) => {
    if (rows.length <= 1) {
      toast.error("Keep at least one row.")
      return
    }
    pending.current = "[data-add]"
    onChange(removeRow(rows, i))
    toast.success("Row removed. Publish to update the website.")
  }
  const add = () => {
    if (rows.length >= SITE_MAX_ROWS) return
    pending.current = `#${id}-${rows.length}-0`
    onChange(addRow(rows, blank))
  }
  const setField = (i: number, key: string, v: unknown) =>
    onChange(rows.map((r, j) => (j === i ? ({ ...r, [key]: v } as T) : r)))

  return (
    <div ref={root} className="grid gap-2">
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5 rounded-xl border border-border bg-card p-3"
        >
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              data-mv={`${i}:-1`}
              disabled={i === 0}
              onClick={() => move(i, -1)}
              aria-label={`Move row ${i + 1} up`}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              data-mv={`${i}:1`}
              disabled={i === rows.length - 1}
              onClick={() => move(i, 1)}
              aria-label={`Move row ${i + 1} down`}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
          <div className={cn("grid min-w-0 gap-2", two && "md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]")}>
            {fields.map((f, j) => {
              const fid = `${id}-${i}-${j}`
              const raw = r[f.key]
              const v = f.lines ? (Array.isArray(raw) ? raw.join("\n") : "") : typeof raw === "string" ? raw : ""
              const hid = f.hint ? `${fid}-hint` : undefined
              return (
                <div key={f.key} className="min-w-0">
                  <label htmlFor={fid} className={labelled ? "mb-1 block text-xs font-medium" : "sr-only"}>
                    {f.label}
                    <span className="sr-only"> {i + 1}</span>
                  </label>
                  {f.options ? (
                    <select id={fid} className={selectClass} value={v} onChange={(e) => setField(i, f.key, e.target.value || undefined)}>
                      <option value="">Choose…</option>
                      {f.options.map(([value, text]) => (
                        <option key={value} value={value}>
                          {text}
                        </option>
                      ))}
                    </select>
                  ) : f.lines ? (
                    <Textarea
                      id={fid}
                      rows={3}
                      value={v}
                      aria-describedby={hid}
                      onChange={(e) => setField(i, f.key, e.target.value.split("\n"))}
                      className="min-h-20 resize-y"
                    />
                  ) : f.long ? (
                    <Textarea
                      id={fid}
                      rows={2}
                      value={v}
                      placeholder={labelled ? undefined : f.label}
                      aria-describedby={hid}
                      onChange={(e) => setField(i, f.key, e.target.value)}
                      className="min-h-16 resize-y"
                    />
                  ) : (
                    <Input id={fid} value={v} placeholder={labelled ? undefined : f.label} aria-describedby={hid} onChange={(e) => setField(i, f.key, e.target.value)} />
                  )}
                  {f.hint && <Help id={hid}>{f.hint}</Help>}
                </div>
              )
            })}
            {flag && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={r[flag.key] === true}
                  onChange={(e) => setField(i, flag.key, e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                {flag.label}
              </label>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => remove(i)}
            aria-label={`Remove row ${i + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" data-add onClick={add} disabled={rows.length >= SITE_MAX_ROWS}>
          <Plus className="mr-1 h-4 w-4" />
          {addLabel}
        </Button>
        {rows.length >= SITE_MAX_ROWS && (
          <span className="text-xs text-muted-foreground">Up to {SITE_MAX_ROWS} rows.</span>
        )}
      </div>
    </div>
  )
}

// ── Live hero preview ───────────────────────────────────────────────────────
function MiniHero({ hero, slots }: { hero: SiteContent["hero"]; slots: HeroSlot[] }) {
  // Under reduced motion the preview holds on the first project instead of cycling.
  const [still] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (still || slots.length < 2) return
    const t = window.setInterval(() => setN((x) => x + 1), 2400)
    return () => window.clearInterval(t)
  }, [still, slots.length])

  const w = slots.length ? slots[n % slots.length] : null
  const bg = w?.colour ?? null
  const on = bg ? textOn(bg) : undefined
  return (
    <div
      className={cn(
        "grid gap-2 rounded-xl p-[18px] motion-safe:transition-colors motion-safe:duration-500",
        !bg && "bg-muted text-foreground",
      )}
      style={bg ? { background: bg, color: on } : undefined}
    >
      <span className="font-mono text-xs opacity-80">{hero.status}</span>
      <b className="break-words text-[1.35rem] font-bold leading-[1.05] tracking-tight">
        {hero.lead} <u className="decoration-2 underline-offset-[3px]">{w?.word || "…"}.</u>
      </b>
      <span className="mt-1.5 flex flex-wrap gap-2 text-xs font-medium">
        <span
          className={cn("rounded-full px-2.5 py-1", !bg && "bg-foreground text-background")}
          style={bg ? { background: on, color: bg } : undefined}
        >
          {hero.cta1}
        </span>
        <span className="rounded-full border border-current px-2.5 py-1">{hero.cta2}</span>
      </span>
    </div>
  )
}

// ── The module ──────────────────────────────────────────────────────────────
export default function Site() {
  const [drafts, setDrafts] = useState<SiteDrafts | null>(null)
  const [values, setValues] = useState<SiteContent>(() => effectiveContent(null))
  const [baseline, setBaseline] = useState<SiteContent>(() => effectiveContent(null))
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<LoadError | null>(null)
  const [tab, setTab] = useState<SiteTab>("hero")
  const [errors, setErrors] = useState<SectionErrors>({})
  const [working, setWorking] = useState<"save" | "publish" | null>(null)
  const [slots, setSlots] = useState<HeroSlot[]>([])
  const [slotsLoaded, setSlotsLoaded] = useState(false)
  const [removing, setRemoving] = useState<number | null>(null)
  const [legacyServices, setLegacyServices] = useState(false)
  const [addedServices, setAddedServices] = useState<string[]>([])

  const applyDrafts = (d: SiteDrafts) => {
    const eff = effectiveContent(d)
    // An older title-and-summary services list is shown upgraded to whole pages.
    // The baseline keeps the stored rows, so the upgrade counts as an edit and
    // the next save writes it (with web addresses, so the order then holds).
    const stored = storedServices(d)
    const legacy = isLegacyServices(stored)
    setDrafts(d)
    setValues(eff)
    setBaseline(legacy && stored ? { ...eff, services: stored } : eff)
    setLegacyServices(legacy)
    setAddedServices(missingBuiltIns(stored).map((x) => x.title))
    setLoadError(null)
  }

  // The hero list: the public hero endpoint, or the staff list when that fails.
  const fetchSlots = async (): Promise<HeroSlot[] | null> => {
    const res = await work.hero()
    if (res.ok) return res.data.map((r) => ({ id: r.id, title: r.title, colour: r.brand_colour, word: r.hero_word }))
    const all = await work.listAll()
    if (!all.ok) return null
    return all.data
      .filter((r) => r.status === "published" && r.hero_order != null)
      .sort((a, b) => (a.hero_order as number) - (b.hero_order as number))
      .map((r) => ({ id: r.id, title: r.title, colour: r.brand_colour, word: r.hero_word }))
  }

  useEffect(() => {
    let alive = true
    siteContent.draft().then((res) => {
      if (!alive) return
      if (res.ok) applyDrafts(res.data)
      else setLoadError({ message: res.error, status: res.status })
      setLoading(false)
    })
    fetchSlots().then((s) => {
      if (!alive) return
      if (s) setSlots(s)
      setSlotsLoaded(true)
    })
    return () => {
      alive = false
    }
  }, [])

  const retry = async () => {
    setLoading(true)
    const res = await siteContent.draft()
    if (res.ok) applyDrafts(res.data)
    else setLoadError({ message: res.error, status: res.status })
    setLoading(false)
  }

  const dirty = useMemo(() => dirtySections(values, baseline), [values, baseline])
  const unpublished = useMemo(() => unpublishedSections(drafts), [drafts])
  const last = useMemo(() => lastPublished(drafts), [drafts])

  // Leaving with unsaved edits asks first: tab close, in-app links and back.
  const guard = useUnsavedGuard(dirty.length > 0)

  const setSection = <S extends SiteSection>(s: S, v: SiteContent[S]) => {
    setValues((prev) => ({ ...prev, [s]: v }))
    if (errors[s]) setErrors((e) => ({ ...e, [s]: undefined }))
  }
  const setHeroField = <K extends keyof SiteContent["hero"]>(k: K, v: SiteContent["hero"][K]) =>
    setSection("hero", { ...values.hero, [k]: v })
  const setContactField = (k: keyof SiteContent["contact"], v: string) => setSection("contact", { ...values.contact, [k]: v })

  /** Save every edited section as a draft. Returns the updated drafts, or null on any failure. */
  const saveDirty = async (): Promise<SiteDrafts | null> => {
    if (!drafts) return null
    const next: SectionErrors = {}
    for (const s of dirty) {
      const bad = validateSection(s, values[s])
      if (bad) next[s] = bad
    }
    const firstBad = dirty.find((s) => next[s])
    if (firstBad) {
      setErrors(next)
      setTab(SECTION_TAB[firstBad])
      toast.error(next[firstBad])
      return null
    }
    let d = drafts
    const saved: Partial<SiteContent> = {}
    for (const s of dirty) {
      const res = await siteContent.save(s, prepareSection(s, values[s]))
      if (res.ok) {
        d = { ...d, [s]: { ...d[s], draft: res.data.draft } }
        ;(saved as Record<string, unknown>)[s] = values[s]
      } else next[s] = res.error
    }
    setDrafts(d)
    setBaseline((b) => ({ ...b, ...saved }))
    if (saved.services) setLegacyServices(false)
    setErrors(next)
    const failed = dirty.find((s) => next[s])
    if (failed) {
      setTab(SECTION_TAB[failed])
      toast.error(next[failed])
      return null
    }
    return d
  }

  const saveDraft = async () => {
    if (!dirty.length) {
      toast("Nothing has changed since the last save.")
      return
    }
    setWorking("save")
    const d = await saveDirty()
    setWorking(null)
    if (d) toast.success("Draft saved. The website has not changed.")
  }

  const publish = async () => {
    setWorking("publish")
    const d = dirty.length ? await saveDirty() : drafts
    if (!d) {
      setWorking(null)
      return
    }
    const targets = unpublishedSections(d)
    if (!targets.length) {
      setWorking(null)
      toast("Nothing to publish. The website already shows this content.")
      return
    }
    const res = await siteContent.publish(targets)
    if (!res.ok) {
      setWorking(null)
      toast.error(res.error || "Could not publish.")
      return
    }
    const again = await siteContent.draft()
    if (again.ok) applyDrafts(again.data)
    setWorking(null)
    toast.success("Published. The website shows the new content.")
  }

  const unhero = async (slot: HeroSlot) => {
    setRemoving(slot.id)
    const res = await work.setHero(slot.id, false)
    if (!res.ok) {
      setRemoving(null)
      toast.error(res.error || "Could not change the hero.")
      return
    }
    const s = await fetchSlots()
    if (s) setSlots(s)
    else setSlots((xs) => xs.filter((x) => x.id !== slot.id))
    setRemoving(null)
    toast.success(`${slot.title} removed from the hero.`)
  }

  const tabHasError = (t: SiteTab) => (Object.keys(errors) as SiteSection[]).some((s) => errors[s] && SECTION_TAB[s] === t)
  const ready = !loading && !loadError && drafts
  const H = values.hero
  const C = values.contact

  return (
    <div className="space-y-6">
      <PageHeader
        className="pb-0"
        title="Site content"
        subtitle="The words and lists the public website shows. Edit, then publish when you are happy."
        actions={
          <>
            <Button onClick={publish} disabled={!ready || working !== null}>
              {working === "publish" && <Loader2 className="animate-spin" />}
              Publish to website
            </Button>
            <Button asChild variant="outline">
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink /> View site
              </a>
            </Button>
          </>
        }
      />

      {loading ? (
        <div aria-busy="true" aria-label="Loading site content" className="space-y-4">
          <Skeleton className="h-9 w-full max-w-xl" />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Skeleton className="h-72" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-40" />
        </div>
      ) : loadError ? (
        loadError.status === 503 ? (
          <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5">
            <h2 className="font-semibold">Site content is not set up on the server yet</h2>
            <p className="mt-1 text-sm">{loadError.message}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Until then the public website keeps its built-in copy.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={retry}>
              <RefreshCw className="mr-2 h-4 w-4" /> Try again
            </Button>
          </div>
        ) : (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
            <h2 className="font-semibold text-destructive">Could not load site content</h2>
            <p className="mt-1 text-destructive">{loadError.message}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={retry}>
              <RefreshCw className="mr-2 h-4 w-4" /> Try again
            </Button>
          </div>
        )
      ) : (
        <>
          <Tabs value={tab} onValueChange={(v) => setTab(v as SiteTab)}>
            <TabsList className="h-auto">
              {TABS.map(([k, label]) => (
                <TabsTrigger key={k} value={k}>
                  {label}
                  {tabHasError(k) && (
                    <>
                      <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden="true" />
                      <span className="sr-only"> (needs attention)</span>
                    </>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── Homepage hero ───────────────────────────────────────── */}
            <TabsContent value="hero" className="mt-4 space-y-4">
              <SectionError message={errors.hero} />
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
                <section className="grid gap-4 rounded-xl border border-border bg-card p-5">
                  <div>
                    <Label htmlFor="sh-status">Status line</Label>
                    <Input id="sh-status" className="mt-1.5" value={H.status} onChange={(e) => setHeroField("status", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="sh-lead">Headline lead-in</Label>
                    <Input
                      id="sh-lead"
                      className="mt-1.5"
                      value={H.lead}
                      onChange={(e) => setHeroField("lead", e.target.value)}
                      aria-describedby="sh-lead-help"
                    />
                    <Help id="sh-lead-help">
                      Each hero project&rsquo;s own word finishes this line, for example &ldquo;{H.lead}{" "}
                      {slots[0]?.word || "care agencies"}.&rdquo;
                    </Help>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="sh-cta1">Main button</Label>
                      <Input id="sh-cta1" className="mt-1.5" value={H.cta1} onChange={(e) => setHeroField("cta1", e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="sh-cta2">Second button</Label>
                      <Input id="sh-cta2" className="mt-1.5" value={H.cta2} onChange={(e) => setHeroField("cta2", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="sh-secs">Seconds per project</Label>
                    <Input
                      id="sh-secs"
                      type="number"
                      min={4}
                      max={10}
                      step={1}
                      inputMode="numeric"
                      className="mt-1.5 w-28"
                      value={Number.isNaN(H.secs) ? "" : H.secs}
                      onChange={(e) => setHeroField("secs", e.target.value === "" ? Number.NaN : Number(e.target.value))}
                      onBlur={() => setHeroField("secs", normaliseSecs(H.secs))}
                      aria-describedby="sh-secs-help"
                    />
                    <Help id="sh-secs-help">A whole number from 4 to 10.</Help>
                  </div>
                </section>
                <section className="rounded-xl border border-border bg-card p-5" aria-label="Live preview">
                  <p className="mb-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">Live preview</p>
                  <MiniHero hero={H} slots={slots} />
                </section>
              </div>

              <section className="rounded-xl border border-border bg-card p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h2 className="flex-1 text-lg font-semibold">
                    Hero projects{" "}
                    <span className="text-sm font-normal tabular-nums text-muted-foreground">
                      {slots.length} of {HERO_MAX}
                    </span>
                  </h2>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/app/work">Choose in Work</Link>
                  </Button>
                </div>
                {!slotsLoaded ? (
                  <Skeleton className="h-14" />
                ) : slots.length ? (
                  <ol className="grid gap-2">
                    {slots.map((w, i) => (
                      <li
                        key={w.id}
                        className="grid grid-cols-[auto_28px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                      >
                        <span className="text-sm tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                        <span
                          className={cn("h-7 w-7 rounded-lg border border-border", !w.colour && "border-dashed")}
                          style={w.colour ? { background: w.colour } : undefined}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 break-words">
                          <b className="font-semibold">{w.title}</b>
                          <br />
                          <span className="text-sm text-muted-foreground">
                            &ldquo;&hellip;websites for {w.word || "(no hero word yet)"}.&rdquo;
                          </span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={removing === w.id}
                          onClick={() => unhero(w)}
                          aria-label={`Remove ${w.title} from the hero`}
                        >
                          {removing === w.id && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm">
                    <p className="font-medium">No hero projects</p>
                    <p className="mt-1 text-muted-foreground">
                      Switch on &ldquo;Hero&rdquo; for up to five published records in Work.
                    </p>
                  </div>
                )}
                <p className="mt-2.5 text-xs text-muted-foreground">
                  The hero only ever shows published records, in the order they sit in Work. Adding a sixth asks you to
                  remove one first.
                </p>
              </section>
            </TabsContent>

            {/* ── Services ────────────────────────────────────────────── */}
            <TabsContent value="services" className="mt-4">
              <p className="mb-3 text-sm text-muted-foreground">
                Shown in this order on the home page and the Services page, under Websites or IT support. Each service has its own page,
                so a service is published only when every field below is filled in.
              </p>
              {legacyServices && (
                <p role="status" className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                  These services were upgraded to full pages; save to keep this order.
                  {addedServices.length > 0 &&
                    ` The ${joinNames(addedServices)} ${addedServices.length === 1 ? "page was" : "pages were"} added at the end; remove any you do not want before saving.`}{" "}
                  Until then the website shows the built-in services in their usual order, with your titles and summaries.
                </p>
              )}
              <SectionError message={errors.services} />
              <ListEditor
                id="services"
                rows={values.services}
                labelled
                fields={[
                  { key: "title", label: "Service name" },
                  { key: "slug", label: "Web address", hint: "The end of the page address, such as web-design. Changing it moves the page." },
                  { key: "group", label: "Group", options: [["websites", "Websites"], ["it", "IT support"]] },
                  { key: "summary", label: "One-line summary", long: true },
                  { key: "hook", label: "Buyer hook", hint: "The first line on the service page." },
                  { key: "detail", label: "Longer description", long: true, hint: "Optional. The summary is used when this is empty." },
                  { key: "needs", label: "Typical needs", lines: true, hint: `One per line, up to ${SERVICE_LIST_MAX}.` },
                  { key: "deliverables", label: "What you get", lines: true, hint: `One per line, up to ${SERVICE_LIST_MAX}.` },
                  { key: "exclusions", label: "Not included", lines: true, hint: `One per line, up to ${SERVICE_LIST_MAX}.` },
                  { key: "price_basis", label: "Price basis", hint: "Say \"Priced per job, ask for a quote.\" until a price is approved." },
                ]}
                blank={{ title: "", summary: "", slug: "", hook: "", detail: "", needs: [], deliverables: [], exclusions: [], price_basis: "" }}
                two
                addLabel="Add a service"
                onChange={(r) => setSection("services", r)}
              />
            </TabsContent>

            {/* ── Process ─────────────────────────────────────────────── */}
            <TabsContent value="process" className="mt-4">
              <p className="mb-3 text-sm text-muted-foreground">The stages of a project, in order. The site numbers them for you.</p>
              <SectionError message={errors.process} />
              <ListEditor
                id="process"
                rows={values.process}
                fields={[
                  { key: "title", label: "Stage" },
                  { key: "detail", label: "What happens" },
                ]}
                blank={{ title: "", detail: "" }}
                two
                addLabel="Add a stage"
                onChange={(r) => setSection("process", r)}
              />
            </TabsContent>

            {/* ── Pricing ─────────────────────────────────────────────── */}
            <TabsContent value="pricing" className="mt-4">
              <h2 className="mb-2.5 text-lg font-semibold">Packages</h2>
              <SectionError message={errors.packages} />
              <ListEditor
                id="packages"
                rows={values.packages}
                fields={[
                  { key: "name", label: "Name" },
                  { key: "price", label: "Price from" },
                  { key: "best", label: "Best for" },
                ]}
                blank={{ name: "", price: "", best: "", featured: false }}
                flag={{ key: "featured", label: "Featured" }}
                addLabel="Add a package"
                onChange={(r) => setSection("packages", r)}
              />
              <h2 className="mb-2.5 mt-6 text-lg font-semibold">Add-ons</h2>
              <SectionError message={errors.addons} />
              <ListEditor
                id="addons"
                rows={values.addons}
                fields={[
                  { key: "name", label: "Add-on" },
                  { key: "price", label: "Price" },
                ]}
                blank={{ name: "", price: "" }}
                two
                addLabel="Add an add-on"
                onChange={(r) => setSection("addons", r)}
              />
              <h2 className="mb-2.5 mt-6 text-lg font-semibold">Payment stages</h2>
              <SectionError message={errors.terms} />
              <ListEditor
                id="terms"
                rows={values.terms}
                fields={[
                  { key: "stage", label: "When" },
                  { key: "share", label: "Share" },
                ]}
                blank={{ stage: "", share: "" }}
                two
                addLabel="Add a stage"
                onChange={(r) => setSection("terms", r)}
              />
            </TabsContent>

            {/* ── FAQs ────────────────────────────────────────────────── */}
            <TabsContent value="faqs" className="mt-4">
              <SectionError message={errors.faqs} />
              <ListEditor
                id="faqs"
                rows={values.faqs}
                fields={[
                  { key: "q", label: "Question" },
                  { key: "a", label: "Answer", long: true },
                ]}
                blank={{ q: "", a: "" }}
                addLabel="Add a question"
                onChange={(r) => setSection("faqs", r)}
              />
            </TabsContent>

            {/* ── Contact and footer ──────────────────────────────────── */}
            <TabsContent value="contact" className="mt-4">
              <SectionError message={errors.contact} />
              <section className="grid gap-4 rounded-xl border border-border bg-card p-5">
                <div>
                  <Label htmlFor="sc-email">Enquiry email</Label>
                  <Input id="sc-email" type="email" className="mt-1.5" value={C.email} onChange={(e) => setContactField("email", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="sc-reply">Reply promise</Label>
                  <Input
                    id="sc-reply"
                    className="mt-1.5"
                    value={C.reply}
                    onChange={(e) => setContactField("reply", e.target.value)}
                    aria-describedby="sc-reply-help"
                  />
                  <Help id="sc-reply-help">A commitment you control, worded as one. Not a measured figure.</Help>
                </div>
                <div>
                  <Label htmlFor="sc-footer">Footer line</Label>
                  <Textarea id="sc-footer" rows={2} className="mt-1.5" value={C.footer} onChange={(e) => setContactField("footer", e.target.value)} />
                </div>
              </section>
            </TabsContent>
          </Tabs>

          {/* ── Publish bar ─────────────────────────────────────────────── */}
          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-x-3 gap-y-2 rounded-2xl border border-border bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/90">
            <p className="mr-auto min-w-0 text-[13px] text-muted-foreground" aria-live="polite">
              {last
                ? `Last published ${formatPublishedDate(last.at)}${last.by ? ` by ${last.by}` : ""}.`
                : "Not yet published from here. The website shows its built-in copy."}{" "}
              {dirty.length ? (
                <span className="font-medium text-foreground">You have unsaved changes.</span>
              ) : unpublished.length ? (
                <span className="font-medium text-foreground">You have unpublished changes.</span>
              ) : null}
            </p>
            <Button variant="outline" size="sm" onClick={saveDraft} disabled={working !== null}>
              {working === "save" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save draft
            </Button>
            <Button size="sm" onClick={publish} disabled={working !== null}>
              {working === "publish" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish to website
            </Button>
          </div>
        </>
      )}
      <UnsavedGuardDialog prompt={guard.prompt} />
    </div>
  )
}
