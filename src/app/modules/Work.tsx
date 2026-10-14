import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Images,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  files as filesApi,
  work,
  type FileRow,
  type WorkAdminRow,
  type WorkImage,
  type WorkInput,
  type WorkKind,
  type WorkStatus,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  HERO_MAX,
  blankHero,
  heroChanges,
  heroFormFromRow,
  heroIdsInHeroOrder,
  heroIdsInListOrder,
  validateHero,
  type HeroForm,
} from "./siteContentModel"

// The Work module: one record type (server/work.php) for the studio's own
// portfolio, feeding the public /work pages. Not a page builder — a plain admin
// form, the same shape as Blog and Testimonials.

const KIND_LABEL: Record<WorkKind, string> = {
  case_study: "Case study",
  product: "Product",
  experiment: "Experiment",
  writing: "Writing",
}
const KINDS = Object.keys(KIND_LABEL) as WorkKind[]

// The kind changes what the three narrative columns MEAN, so it changes their
// labels. A case study has a Problem; an experiment has a Question. Writing
// argues one line and uses the first column only.
type NarrativeKey = "problem" | "built" | "outcome"
type NarrativeField = { key: NarrativeKey; label: string; help: string }

const NARRATIVE: Record<WorkKind, NarrativeField[]> = {
  case_study: [
    { key: "problem", label: "Problem", help: "What they came to you with." },
    { key: "built", label: "Built", help: "What you actually made." },
    { key: "outcome", label: "Outcome", help: "What changed for them afterwards." },
  ],
  product: [
    { key: "problem", label: "Problem", help: "The gap the product fills." },
    { key: "built", label: "Built", help: "What ships, and what it is made of." },
    { key: "outcome", label: "Outcome", help: "Who uses it and what it does for them." },
  ],
  experiment: [
    { key: "problem", label: "Question", help: "What you were trying to find out." },
    { key: "built", label: "Made", help: "The thing you built to find out." },
    { key: "outcome", label: "Learned", help: "The answer, including a dull one." },
  ],
  writing: [{ key: "problem", label: "Argument", help: "The line this piece argues. Writing uses this field only." }],
}

type FormState = WorkInput & { id: number; slug: string }

const blank: FormState = {
  id: 0,
  title: "",
  slug: "",
  kind: "case_study",
  status: "draft",
  client_name: "",
  client_consent: false,
  sector: "",
  summary: "",
  problem: "",
  built: "",
  outcome: "",
  live_url: "",
  repo_url: "",
  started_on: "",
  completed_on: "",
  cover_file_id: null,
  featured: false,
  sort_order: 0,
}

// Shared styling for the native <select>s. Native, not the Radix trigger, so a
// real <label htmlFor> binds to a real form control.
const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-destructive">
      {message}
    </p>
  )
}

export default function Work() {
  const [items, setItems] = useState<WorkAdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Record form.
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(blank)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  // The attached images of the record being edited, and whether the long
  // narrative text could be read back. See loadDetail().
  const [detailImages, setDetailImages] = useState<WorkImage[]>([])
  const [narrativeLoaded, setNarrativeLoaded] = useState(true)
  // Homepage hero fields, kept apart from the record so only changed keys are sent.
  const [hero, setHero] = useState<HeroForm>(blankHero)
  const [heroInitial, setHeroInitial] = useState<HeroForm>(blankHero)
  // Ids whose hero switch is mid-request, so a double click cannot race itself.
  const [heroBusy, setHeroBusy] = useState<number[]>([])

  // Image manager.
  const [imgFor, setImgFor] = useState<WorkAdminRow | null>(null)
  const [imgRows, setImgRows] = useState<WorkImage[]>([])
  const [imgListable, setImgListable] = useState(true)
  const [library, setLibrary] = useState<FileRow[]>([])
  const [imgForm, setImgForm] = useState({ file_id: 0, alt: "", caption: "", sort_order: 0 })
  const [imgErrs, setImgErrs] = useState<Record<string, string>>({})
  const [attaching, setAttaching] = useState(false)

  // Nothing is set synchronously here, so the mount effect below does not
  // cascade a render; `refresh` adds the spinner for a deliberate reload.
  const load = async () => {
    const res = await work.listAll()
    if (res.ok) {
      setItems(res.data)
      setError(null)
    } else setError(res.error)
    setLoading(false)
  }

  const refresh = () => {
    setLoading(true)
    load()
  }

  // The first fetch settles state from the promise callback rather than the
  // effect body, so it neither cascades a render nor sets state after unmount.
  useEffect(() => {
    let alive = true
    work.listAll().then((res) => {
      if (!alive) return
      if (res.ok) {
        setItems(res.data)
        setError(null)
      } else setError(res.error)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  // The staff list does not carry problem/built/outcome or the image set — only
  // the public `get` returns those, and only for a published record. So a draft
  // opens with its long text blank and we say so rather than silently wiping it.
  const loadDetail = async (row: WorkAdminRow) => {
    if (row.status !== "published") {
      setDetailImages(row.cover ? [{ ...row.cover, id: 0, sort_order: 0 }] : [])
      setNarrativeLoaded(false)
      setImgListable(false)
      return { problem: "", built: "", outcome: "" }
    }
    const res = await work.get(row.slug)
    if (!res.ok) {
      setDetailImages([])
      setNarrativeLoaded(false)
      setImgListable(false)
      return { problem: "", built: "", outcome: "" }
    }
    setDetailImages(res.data.images)
    setNarrativeLoaded(true)
    setImgListable(true)
    return {
      problem: res.data.problem ?? "",
      built: res.data.built ?? "",
      outcome: res.data.outcome ?? "",
    }
  }

  // The hero screenshot pickers choose from the same image library the Images
  // dialog uses.
  const loadLibrary = async () => {
    const lib = await filesApi.list()
    if (lib.ok) setLibrary(lib.data.filter((f) => (f.mime ?? "").startsWith("image/")))
  }

  const startNew = () => {
    setForm(blank)
    setErrs({})
    setDetailImages([])
    setNarrativeLoaded(true)
    setHero(blankHero)
    setHeroInitial(blankHero)
    setOpen(true)
    loadLibrary()
  }

  const startEdit = async (row: WorkAdminRow) => {
    setErrs({})
    const narrative = await loadDetail(row)
    setForm({
      id: row.id,
      title: row.title,
      slug: row.slug,
      kind: row.kind,
      status: row.status,
      client_name: row.client_name ?? "",
      client_consent: row.client_consent === 1,
      sector: row.sector ?? "",
      summary: row.summary ?? "",
      live_url: row.live_url ?? "",
      repo_url: row.repo_url ?? "",
      started_on: row.started_on ?? "",
      completed_on: row.completed_on ?? "",
      cover_file_id: row.cover_file_id,
      featured: row.featured === 1,
      sort_order: row.sort_order,
      ...narrative,
    })
    const h = heroFormFromRow(row)
    setHero(h)
    setHeroInitial(h)
    setOpen(true)
    loadLibrary()
  }

  const setH = <K extends keyof HeroForm>(k: K, v: HeroForm[K]) => setHero((h) => ({ ...h, [k]: v }))

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  const kind: WorkKind = form.kind ?? "case_study"
  const narrativeFields = NARRATIVE[kind]
  // The consent checkbox is the thing standing between a named client and the
  // public site, so it is only shown (and only enforced) once a name is typed.
  const namesClient = (form.client_name ?? "").trim() !== ""
  const consentBlocks = namesClient && !form.client_consent

  const validate = () => {
    const next: Record<string, string> = {}
    if (!(form.title ?? "").trim()) next.title = "A title is required."
    for (const k of ["live_url", "repo_url"] as const) {
      const v = (form[k] ?? "").trim()
      if (v && !/^https?:\/\//i.test(v)) next[k] = "Must start with http:// or https://."
    }
    if (form.status === "published" && consentBlocks) {
      next.client_consent =
        "This record names a client, so it cannot be published until client consent is recorded. Tick consent, clear the client name, or save it as a draft."
    }
    Object.assign(next, validateHero(hero))
    setErrs(next)
    return Object.keys(next).length === 0
  }

  const save = async () => {
    if (!validate()) return
    setSaving(true)
    const { id, ...rest } = form
    const payload: WorkInput = {
      ...rest,
      // Empty strings are not valid dates or urls server-side; send null.
      started_on: rest.started_on || null,
      completed_on: rest.completed_on || null,
      live_url: (rest.live_url ?? "").trim() || undefined,
      repo_url: (rest.repo_url ?? "").trim() || undefined,
      // Hero keys only when they changed, so an unrelated edit leaves them alone.
      ...heroChanges(heroInitial, hero),
    }
    const res = id ? await work.update(id, payload) : await work.create(payload)
    setSaving(false)
    if (res.ok) {
      const heroRemoved = "hero_removed" in res.data && res.data.hero_removed
      toast.success(
        id ? (heroRemoved ? "Work saved. As a draft it has left the homepage hero." : "Work saved.") : "Work created.",
      )
      setOpen(false)
      load()
      return
    }
    // A 409 on save is either the consent gate or a duplicate slug. Say which.
    if (res.status === 409 && /consent/i.test(res.error)) {
      setErrs((e) => ({ ...e, client_consent: res.error }))
      toast.error(res.error)
    } else if (res.status === 409) {
      setErrs((e) => ({ ...e, slug: res.error }))
      toast.error(res.error)
    } else toast.error(res.error || "Could not save.")
  }

  const togglePublish = async (row: WorkAdminRow) => {
    const next: WorkStatus = row.status === "published" ? "draft" : "published"
    setBusy(true)
    const res = await work.publish(row.id, next)
    setBusy(false)
    if (res.ok) {
      toast.success(
        next === "published"
          ? "Published."
          : res.data.hero_removed
            ? "Moved back to draft and out of the homepage hero."
            : "Moved back to draft.",
      )
      load()
      return
    }
    if (res.status === 409) {
      // The server re-read the stored row and refused. Name the reason and the
      // fix instead of a generic failure.
      toast.error(`${res.error} Open the record and tick “Client consent recorded”.`)
      return
    }
    toast.error(res.error || "Could not change the status.")
  }

  const remove = async (row: WorkAdminRow) => {
    setBusy(true)
    const res = await work.remove(row.id)
    setBusy(false)
    if (res.ok) {
      setItems((xs) => xs.filter((x) => x.id !== row.id))
      toast.success("Work record removed.")
    } else toast.error(res.error || "Could not remove.")
  }

  // Reorder writes sort_order = position for the whole visible list, which is
  // exactly what the endpoint does with the ids array.
  const move = async (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= items.length) return
    const next = [...items]
    const [row] = next.splice(index, 1)
    next.splice(target, 0, row)
    setItems(next)
    setBusy(true)
    const res = await work.reorder(next.map((x) => x.id))
    if (!res.ok) {
      setBusy(false)
      toast.error(res.error || "Could not save the new order.")
      load()
      return
    }
    // The hero follows the order of this list, so a move that changes the
    // relative order of hero records also reorders the hero.
    const heroIds = heroIdsInListOrder(next)
    if (heroIds.length > 1 && heroIds.join() !== heroIdsInHeroOrder(next).join()) {
      const ho = await work.heroOrder(heroIds)
      if (!ho.ok) toast.error(ho.error || "The list order saved, but the hero order did not.")
    }
    setBusy(false)
    load()
  }

  // ── Homepage hero ──────────────────────────────────────────────────────────
  // Optimistic: the switch flips at once and rolls back if the server refuses,
  // showing the server's own reason (five already in, or not published).
  const heroCount = items.filter((x) => x.hero_order != null).length

  const toggleHero = async (row: WorkAdminRow, on: boolean) => {
    if (heroBusy.includes(row.id)) return
    const before = items
    const optimistic = items.map((x) => (x.id === row.id ? { ...x, hero_order: on ? heroCount + 1 : null } : x))
    setItems(optimistic)
    setHeroBusy((b) => [...b, row.id])
    const res = await work.setHero(row.id, on)
    if (!res.ok) {
      setItems(before)
      setHeroBusy((b) => b.filter((x) => x !== row.id))
      toast.error(res.error || "Could not change the hero.")
      return
    }
    // The server appends a new hero record at the end; bring it into line
    // with this list's order.
    if (on) {
      const withServerOrder = optimistic.map((x) => (x.id === row.id ? { ...x, hero_order: res.data.hero_order } : x))
      const want = heroIdsInListOrder(withServerOrder)
      if (want.length > 1 && want.join() !== heroIdsInHeroOrder(withServerOrder).join()) {
        const ho = await work.heroOrder(want)
        if (!ho.ok) toast.error(ho.error || "Added to the hero, but its position could not be saved.")
      }
    }
    setHeroBusy((b) => b.filter((x) => x !== row.id))
    toast.success(on ? `${row.title} added to the hero.` : `${row.title} removed from the hero.`)
    load()
  }

  // ── Images ────────────────────────────────────────────────────────────────
  const openImages = async (row: WorkAdminRow) => {
    setImgFor(row)
    setImgForm({ file_id: 0, alt: "", caption: "", sort_order: 0 })
    setImgErrs({})
    setImgRows([])
    if (row.status === "published") {
      const res = await work.get(row.slug)
      setImgListable(res.ok)
      if (res.ok) setImgRows(res.data.images)
    } else setImgListable(false)
    const lib = await filesApi.list()
    if (lib.ok) setLibrary(lib.data.filter((f) => (f.mime ?? "").startsWith("image/")))
  }

  const attach = async () => {
    if (!imgFor) return
    const next: Record<string, string> = {}
    if (!imgForm.file_id) next.file_id = "Choose an image from the file library."
    if (!imgForm.alt.trim()) next.alt = "Alt text is required — it is what a screen reader announces."
    setImgErrs(next)
    if (Object.keys(next).length) return
    setAttaching(true)
    const res = await work.addImage({
      work_id: imgFor.id,
      file_id: imgForm.file_id,
      alt: imgForm.alt.trim(),
      caption: imgForm.caption.trim() || undefined,
      sort_order: imgForm.sort_order,
    })
    setAttaching(false)
    if (!res.ok) {
      toast.error(res.error || "Could not attach the image.")
      return
    }
    toast.success(res.data.expiry_cleared ? "Image attached. Its share link no longer expires." : "Image attached.")
    setImgForm({ file_id: 0, alt: "", caption: "", sort_order: 0 })
    if (imgFor.status === "published") {
      const again = await work.get(imgFor.slug)
      if (again.ok) setImgRows(again.data.images)
    }
    load()
  }

  const detach = async (image: WorkImage) => {
    const res = await work.removeImage(image.id)
    if (res.ok) {
      setImgRows((xs) => xs.filter((x) => x.id !== image.id))
      toast.success("Image detached from this record.")
      load()
    } else toast.error(res.error || "Could not detach the image.")
  }

  // The cover must be one of the record's attached images: attaching is what
  // gives the file its permanent public link, so an arbitrary file id would
  // look fine here and silently fail to load on the public page.
  const coverChoices = useMemo(() => {
    const byFile = new Map<number, { file_id: number; alt: string }>()
    for (const i of detailImages) byFile.set(i.file_id, { file_id: i.file_id, alt: i.alt })
    if (form.cover_file_id && !byFile.has(form.cover_file_id)) {
      byFile.set(form.cover_file_id, { file_id: form.cover_file_id, alt: "current cover" })
    }
    return Array.from(byFile.values())
  }, [detailImages, form.cover_file_id])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Work</h1>
          <p className="text-sm text-muted-foreground">
            Case studies, products, experiments and writing. Published records appear on the public site; up to five
            can lead the homepage hero.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={startNew}>
            <Plus className="mr-2 h-4 w-4" /> New work
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the work endpoint and its tables must be live on the server.
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-xl border border-border bg-card p-4">
          <span className="flex gap-1" aria-hidden="true">
            {Array.from({ length: HERO_MAX }, (_, i) => (
              <i key={i} className={cn("h-1.5 w-[22px] rounded-full", i < heroCount ? "bg-primary" : "bg-muted")} />
            ))}
          </span>
          <p className="min-w-[200px] flex-1 text-sm">
            <b className="tabular-nums">
              {heroCount} of {HERO_MAX}
            </b>{" "}
            homepage hero slots used.{" "}
            <span className="text-muted-foreground">Hero order follows the order of this list.</span>
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/site">
              <Eye className="mr-2 h-4 w-4" /> Preview hero
            </Link>
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No work yet. Add the first record.</div>
        ) : (
          <ul className="divide-y">
            {items.map((row, i) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-4">
                <span
                  className={cn("h-7 w-7 flex-shrink-0 rounded-lg border border-border", !row.brand_colour && "border-dashed")}
                  style={row.brand_colour ? { background: row.brand_colour } : undefined}
                  title={row.brand_colour ? `Brand colour ${row.brand_colour}` : "No brand colour set"}
                  aria-hidden="true"
                />
                <div className="min-w-[200px] flex-1 basis-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{row.title}</span>
                    {row.featured === 1 && <Star className="h-3.5 w-3.5 fill-current text-amber-400" aria-label="Featured" />}
                    <span className="gk-app-chip rounded-full px-2 py-0.5 text-xs">{KIND_LABEL[row.kind]}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        row.status === "published"
                          ? "bg-emerald-500/12 text-emerald-600"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {row.status}
                    </span>
                    {row.client_name && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          row.client_consent === 1 ? "bg-emerald-500/12 text-emerald-600" : "bg-amber-500/15 text-amber-700",
                        )}
                      >
                        {row.client_name}
                        {row.client_consent === 1 ? " · consent recorded" : " · no consent"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {row.summary || <span className="italic">No summary yet.</span>}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-wrap items-center gap-1">
                  <label className="mr-2 flex items-center gap-2 whitespace-nowrap text-sm">
                    <Switch
                      checked={row.hero_order != null}
                      disabled={heroBusy.includes(row.id)}
                      onCheckedChange={(v) => toggleHero(row, v)}
                      aria-label={`Show ${row.title} in the homepage hero`}
                    />
                    <span aria-hidden="true">Hero</span>
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={busy || i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={`Move ${row.title} up`}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={busy || i === items.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={`Move ${row.title} down`}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openImages(row)}
                    aria-label={`Images for ${row.title}`}
                  >
                    <Images className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={busy}
                    onClick={() => togglePublish(row)}
                    aria-label={row.status === "published" ? `Unpublish ${row.title}` : `Publish ${row.title}`}
                  >
                    {row.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => startEdit(row)}
                    aria-label={`Edit ${row.title}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={busy}
                    onClick={() => remove(row)}
                    aria-label={`Remove ${row.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Record form ───────────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit work" : "New work"}</DialogTitle>
            <DialogDescription>
              The kind sets what the three long fields below mean, so pick it first.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            {!narrativeLoaded && form.id > 0 && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700">
                The long fields could not be read back for this draft — the endpoint returns them only for a published
                record. They are blank here, and saving will overwrite whatever is stored.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="w-title">Title</Label>
                <Input
                  id="w-title"
                  required
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  aria-invalid={!!errs.title}
                  aria-describedby={errs.title ? "w-title-error" : undefined}
                  className="mt-1.5"
                />
                <FieldError id="w-title-error" message={errs.title} />
              </div>
              <div>
                <Label htmlFor="w-kind">Kind</Label>
                <select
                  id="w-kind"
                  className={cn(selectClass, "mt-1.5")}
                  value={kind}
                  onChange={(e) => set("kind", e.target.value as WorkKind)}
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="w-slug">Slug</Label>
                <Input
                  id="w-slug"
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  placeholder="Left blank, it is built from the title"
                  aria-describedby={errs.slug ? "w-slug-error" : undefined}
                  aria-invalid={!!errs.slug}
                  className="mt-1.5"
                />
                <FieldError id="w-slug-error" message={errs.slug} />
              </div>
              <div>
                <Label htmlFor="w-sector">Sector</Label>
                <Input
                  id="w-sector"
                  value={form.sector}
                  onChange={(e) => set("sector", e.target.value)}
                  placeholder="e.g. Retail"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="w-summary">Summary</Label>
              <Textarea
                id="w-summary"
                rows={2}
                maxLength={400}
                value={form.summary}
                onChange={(e) => set("summary", e.target.value)}
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-muted-foreground">One or two lines, shown in the public list.</p>
            </div>

            {narrativeFields.map((f) => (
              <div key={f.key}>
                <Label htmlFor={`w-${f.key}`}>{f.label}</Label>
                <Textarea
                  id={`w-${f.key}`}
                  rows={4}
                  value={form[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  aria-describedby={`w-${f.key}-help`}
                  className="mt-1.5"
                />
                <p id={`w-${f.key}-help`} className="mt-1 text-xs text-muted-foreground">
                  {f.help}
                </p>
              </div>
            ))}

            {/* Client and consent. The gate, not a footnote. */}
            <fieldset className="rounded-lg border border-border p-4">
              <legend className="px-1 text-sm font-medium">Client</legend>
              <div>
                <Label htmlFor="w-client">Client name</Label>
                <Input
                  id="w-client"
                  value={form.client_name}
                  onChange={(e) => set("client_name", e.target.value)}
                  placeholder="Leave blank for unattributed work"
                  aria-describedby="w-client-help"
                  className="mt-1.5"
                />
                <p id="w-client-help" className="mt-1 text-xs text-muted-foreground">
                  Naming a client makes consent mandatory before this can be published.
                </p>
              </div>

              {namesClient && (
                <div
                  className={cn(
                    "mt-3 rounded-lg border p-3",
                    consentBlocks ? "border-amber-500/40 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <input
                      id="w-consent"
                      type="checkbox"
                      checked={!!form.client_consent}
                      onChange={(e) => set("client_consent", e.target.checked)}
                      aria-describedby={errs.client_consent ? "w-consent-error w-consent-help" : "w-consent-help"}
                      aria-invalid={!!errs.client_consent}
                      className="mt-0.5 h-4 w-4 rounded border-border"
                    />
                    <div>
                      <Label htmlFor="w-consent" className="font-medium">
                        {form.client_name} has agreed to be named publicly
                      </Label>
                      <p id="w-consent-help" className="mt-1 text-xs text-muted-foreground">
                        Unticked, the server refuses to publish this record and the public page never shows the name.
                      </p>
                      <FieldError id="w-consent-error" message={errs.client_consent} />
                    </div>
                  </div>
                </div>
              )}
            </fieldset>

            {/* Homepage hero presentation. Sent only when changed. */}
            <fieldset className="grid gap-3 rounded-lg border border-border p-4">
              <legend className="px-1 text-sm font-medium">Homepage hero</legend>
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                <div>
                  <Label htmlFor="w-colour">Brand colour</Label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      id="w-colour"
                      type="color"
                      value={/^#[0-9A-Fa-f]{6}$/.test(hero.brand_colour) ? hero.brand_colour : "#000000"}
                      onChange={(e) => setH("brand_colour", e.target.value.toUpperCase())}
                      className="h-9 w-14 cursor-pointer rounded-md border border-input bg-transparent p-1"
                    />
                    <Input
                      aria-label="Brand colour as a hex value"
                      value={hero.brand_colour}
                      onChange={(e) => setH("brand_colour", e.target.value)}
                      placeholder="#3B6FE0"
                      maxLength={7}
                      aria-invalid={!!errs.brand_colour}
                      aria-describedby={errs.brand_colour ? "w-colour-error" : undefined}
                      className="w-28 font-mono"
                    />
                  </div>
                  <FieldError id="w-colour-error" message={errs.brand_colour} />
                </div>
                <div className="min-w-0">
                  <Label htmlFor="w-heroword">Hero word</Label>
                  <Input
                    id="w-heroword"
                    value={hero.hero_word}
                    onChange={(e) => setH("hero_word", e.target.value)}
                    placeholder="e.g. care agencies"
                    maxLength={40}
                    aria-invalid={!!errs.hero_word}
                    aria-describedby={errs.hero_word ? "w-heroword-error w-heroword-help" : "w-heroword-help"}
                    className="mt-1.5"
                  />
                  <FieldError id="w-heroword-error" message={errs.hero_word} />
                </div>
              </div>
              <p id="w-heroword-help" className="text-xs text-muted-foreground">
                Finishes the headline &ldquo;I design and build websites for &hellip;&rdquo;. Keep it to one or two words.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["desktop", "Desktop screenshot"],
                    ["mobile", "Phone screenshot"],
                  ] as const
                ).map(([k, label]) => {
                  const fileKey = `${k}_file_id` as const
                  const altKey = `${k}_alt` as const
                  const current = hero[fileKey]
                  return (
                    <div key={k} className="grid content-start gap-2">
                      <div>
                        <Label htmlFor={`w-hero-${k}`}>{label}</Label>
                        <select
                          id={`w-hero-${k}`}
                          className={cn(selectClass, "mt-1.5")}
                          value={current ?? ""}
                          onChange={(e) => setH(fileKey, e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">None</option>
                          {current && !library.some((f) => f.id === current) ? (
                            <option value={current}>Current screenshot (file #{current})</option>
                          ) : null}
                          {library.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {current ? (
                        <div>
                          <Label htmlFor={`w-hero-${k}-alt`}>Alt text (required)</Label>
                          <Input
                            id={`w-hero-${k}-alt`}
                            required
                            maxLength={200}
                            value={hero[altKey]}
                            onChange={(e) => setH(altKey, e.target.value)}
                            aria-invalid={!!errs[altKey]}
                            aria-describedby={errs[altKey] ? `w-hero-${k}-alt-error` : undefined}
                            className="mt-1.5"
                          />
                          <FieldError id={`w-hero-${k}-alt-error`} message={errs[altKey]} />
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Screenshots come from the file library. Choosing one gives it a permanent public link, as attaching an
                image does.
              </p>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="w-live">Live URL</Label>
                <Input
                  id="w-live"
                  type="url"
                  value={form.live_url}
                  onChange={(e) => set("live_url", e.target.value)}
                  placeholder="https://"
                  aria-invalid={!!errs.live_url}
                  aria-describedby={errs.live_url ? "w-live-error" : undefined}
                  className="mt-1.5"
                />
                <FieldError id="w-live-error" message={errs.live_url} />
              </div>
              <div>
                <Label htmlFor="w-repo">Repository URL</Label>
                <Input
                  id="w-repo"
                  type="url"
                  value={form.repo_url}
                  onChange={(e) => set("repo_url", e.target.value)}
                  placeholder="https://"
                  aria-invalid={!!errs.repo_url}
                  aria-describedby={errs.repo_url ? "w-repo-error" : undefined}
                  className="mt-1.5"
                />
                <FieldError id="w-repo-error" message={errs.repo_url} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="w-started">Started</Label>
                <Input
                  id="w-started"
                  type="date"
                  value={form.started_on ?? ""}
                  onChange={(e) => set("started_on", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="w-completed">Completed</Label>
                <Input
                  id="w-completed"
                  type="date"
                  value={form.completed_on ?? ""}
                  onChange={(e) => set("completed_on", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="w-cover">Cover image</Label>
                <select
                  id="w-cover"
                  className={cn(selectClass, "mt-1.5")}
                  value={form.cover_file_id ?? ""}
                  disabled={coverChoices.length === 0}
                  aria-describedby="w-cover-help"
                  onChange={(e) => set("cover_file_id", e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">No cover</option>
                  {coverChoices.map((c) => (
                    <option key={c.file_id} value={c.file_id}>
                      {c.alt} (file #{c.file_id})
                    </option>
                  ))}
                </select>
                <p id="w-cover-help" className="mt-1 text-xs text-muted-foreground">
                  {coverChoices.length === 0
                    ? "Attach an image to this record first — only an attached image has the public link a cover needs."
                    : "Chosen from the images attached to this record."}
                </p>
              </div>
              <div>
                <Label htmlFor="w-sort">Sort order</Label>
                <Input
                  id="w-sort"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => set("sort_order", Number(e.target.value) || 0)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <input
                  id="w-featured"
                  type="checkbox"
                  checked={!!form.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="w-featured">Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="w-status">Status</Label>
                <select
                  id="w-status"
                  className={cn(selectClass, "w-36")}
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as WorkStatus)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {form.id ? "Save changes" : "Create work"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Images ────────────────────────────────────────────────────────── */}
      <Dialog open={!!imgFor} onOpenChange={(v) => !v && setImgFor(null)}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Images — {imgFor?.title}</DialogTitle>
            <DialogDescription>
              Attaching gives the file a permanent public link that anyone holding it can open, and removes any expiry a
              Files share had set. Detaching does not take that link away; revoke it in Files.
            </DialogDescription>
          </DialogHeader>

          {!imgListable ? (
            <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              A draft&rsquo;s attached images cannot be listed — the endpoint returns the image set only for a published
              record. You can still attach more below.
            </p>
          ) : imgRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No images attached yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border border-border">
              {imgRows.map((im) => (
                <li key={im.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{im.alt}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      file #{im.file_id}
                      {im.caption ? ` · ${im.caption}` : ""} · position {im.sort_order}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => detach(im)}
                    aria-label={`Detach ${im.alt}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <form
            className="space-y-3 border-t pt-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              attach()
            }}
          >
            <div>
              <Label htmlFor="wi-file">Image from the file library</Label>
              <select
                id="wi-file"
                className={cn(selectClass, "mt-1.5")}
                value={imgForm.file_id || ""}
                aria-invalid={!!imgErrs.file_id}
                aria-describedby={imgErrs.file_id ? "wi-file-error" : undefined}
                onChange={(e) => setImgForm((f) => ({ ...f, file_id: Number(e.target.value) || 0 }))}
              >
                <option value="">Choose a file…</option>
                {library.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <FieldError id="wi-file-error" message={imgErrs.file_id} />
            </div>
            <div>
              <Label htmlFor="wi-alt">Alt text (required — screen readers read this instead of the image)</Label>
              <Input
                id="wi-alt"
                required
                maxLength={300}
                value={imgForm.alt}
                onChange={(e) => setImgForm((f) => ({ ...f, alt: e.target.value }))}
                aria-invalid={!!imgErrs.alt}
                aria-describedby={imgErrs.alt ? "wi-alt-error" : undefined}
                className="mt-1.5"
              />
              <FieldError id="wi-alt-error" message={imgErrs.alt} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="wi-caption">Caption</Label>
                <Input
                  id="wi-caption"
                  maxLength={300}
                  value={imgForm.caption}
                  onChange={(e) => setImgForm((f) => ({ ...f, caption: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="wi-sort">Position</Label>
                <Input
                  id="wi-sort"
                  type="number"
                  value={imgForm.sort_order}
                  onChange={(e) => setImgForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))}
                  className="mt-1.5"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={attaching}>
                {attaching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Attach image
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
