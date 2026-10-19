import { useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, Search, Pencil, Trash2, BookOpen, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { knowledge, type KbSummary, type KbArticle } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/app/components/page-kit"
import { EmptyState } from "@/app/components/EmptyState"

const AUDIENCE: Record<string, string> = { internal: "Internal", client: "Client-facing" }

const blank = { id: 0, title: "", category: "General", audience: "internal", body: "" }

export default function Knowledge() {
  const [items, setItems] = useState<KbSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [category, setCategory] = useState("all")
  const [seen, setSeen] = useState<string[]>([])

  const [selected, setSelected] = useState<KbArticle | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<{ id: number; title: string; category: string; audience: string; body: string }>(blank)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await knowledge.list(q, category === "all" ? "" : category)
    if (res.ok) {
      setItems(res.data)
      setSeen((xs) => Array.from(new Set([...xs, ...res.data.map((i) => i.category)])))
      setError(null)
    } else setError(res.error)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  const categories = Array.from(new Set([...seen, ...items.map((i) => i.category)])).sort()

  const openArticle = async (id: number) => {
    setViewLoading(true)
    const res = await knowledge.get(id)
    setViewLoading(false)
    if (res.ok) setSelected(res.data)
    else toast.error(res.error || "Could not load the article.")
  }

  const startNew = () => {
    setForm(blank)
    setOpen(true)
  }
  const startEdit = (a: KbArticle) => {
    setForm({ id: a.id, title: a.title, category: a.category, audience: a.audience, body: a.body ?? "" })
    setOpen(true)
  }

  const save = async () => {
    if (!form.title.trim()) return toast.error("A title is required.")
    setSaving(true)
    const payload = { title: form.title.trim(), category: form.category || "General", audience: form.audience, body: form.body }
    const res = form.id ? await knowledge.update(form.id, payload) : await knowledge.create(payload)
    setSaving(false)
    if (res.ok) {
      toast.success(form.id ? "Article updated." : "Article created.")
      setOpen(false)
      load()
      if (form.id && selected?.id === form.id) openArticle(form.id)
    } else toast.error(res.error || "Could not save.")
  }

  const remove = async (a: KbArticle) => {
    const res = await knowledge.remove(a.id)
    if (res.ok) {
      setSelected(null)
      setItems((xs) => xs.filter((x) => x.id !== a.id))
      toast.success("Article deleted.")
    } else toast.error(res.error || "Could not delete.")
  }

  return (
    <div>
      <PageHeader
        title="Knowledge"
        subtitle="SOPs, runbooks and help articles: the studio made repeatable."
        actions={
          <>
            <Button onClick={startNew}>
              <Plus /> New article
            </Button>
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Refresh
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-h-10 min-w-0 max-w-[340px] flex-1 basis-[200px] items-center gap-2 rounded-[10px] border bg-card px-3 text-muted-foreground focus-within:border-acc focus-within:shadow-[0_0_0_3px_hsl(var(--os-acc-soft))]">
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">Search titles</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Search titles…"
              className="w-full min-w-0 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          {["all", ...categories].map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className="inline-flex min-h-[34px] max-w-full items-center whitespace-nowrap rounded-full border bg-card px-3 text-[13px] font-medium transition-colors hover:border-line-strong aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
            >
              <span className="truncate">{c === "all" ? "All" : c}</span>
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className="flex flex-wrap items-start gap-3.5 rounded-2xl border border-bad/30 bg-bad-soft p-[18px] text-foreground">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-bad" aria-hidden="true" />
            <div className="min-w-[min(100%,200px)] flex-1">
              <p className="font-semibold">Articles could not be loaded</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}. The knowledge endpoint and database must be live on the server.</p>
            </div>
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Try again
            </Button>
          </div>
        )}

        {!error && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            {/* List */}
            <div className="min-w-0 self-start rounded-2xl border bg-card p-1.5">
              {loading ? (
                <div className="space-y-2 p-2" aria-busy="true" aria-label="Loading articles">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-11" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <EmptyState icon={BookOpen} title="No articles" description="Write the first one." className="py-10" />
              ) : (
                <ul>
                  {items.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => openArticle(a.id)}
                        aria-current={selected?.id === a.id ? "true" : undefined}
                        className={cn(
                          "flex min-h-10 w-full flex-col items-start gap-0.5 rounded-[10px] px-2.5 py-2 text-left hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none",
                          selected?.id === a.id && "bg-secondary",
                        )}
                      >
                        <b className="font-semibold [overflow-wrap:anywhere]">{a.title}</b>
                        <span className="text-[12.5px] text-muted-foreground">
                          {a.category} · {AUDIENCE[a.audience] ?? a.audience}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Reader */}
            <article className="min-h-[20rem] min-w-0 rounded-2xl border bg-card p-[18px]">
              {viewLoading ? (
                <div className="space-y-3" aria-busy="true" aria-label="Loading article">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-7 w-2/3" />
                  <Skeleton className="h-3" />
                  <Skeleton className="h-3" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              ) : !selected ? (
                <EmptyState icon={BookOpen} title="Nothing open" description="Pick an article to read, or write a new one." className="py-14" />
              ) : (
                <>
                  <p className="font-mono text-[11.5px] uppercase tracking-[.06em] text-muted-foreground [overflow-wrap:anywhere]">
                    {selected.category} · {AUDIENCE[selected.audience] ?? selected.audience} · {selected.author || "Unknown author"}
                  </p>
                  <h2 className="mb-3.5 mt-1.5 font-display text-[1.5rem] font-semibold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere]">{selected.title}</h2>
                  <div className="max-w-[62ch] whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">{selected.body || "This article has no body yet."}</div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => startEdit(selected)}>
                      <Pencil /> Edit
                    </Button>
                    <Button variant="destructive" onClick={() => remove(selected)}>
                      <Trash2 /> Delete
                    </Button>
                  </div>
                </>
              )}
            </article>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit article" : "New article"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="ktitle">Title</Label>
                <Input id="ktitle" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="kcat">Category</Label>
                <Input id="kcat" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="mt-1.5" placeholder="e.g. Onboarding" />
              </div>
            </div>
            <div>
              <Label htmlFor="knowledge-sel1">Audience</Label>
              <Select value={form.audience} onValueChange={(v) => setForm((f) => ({ ...f, audience: v }))}>
                <SelectTrigger id="knowledge-sel1" className="mt-1.5 w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="client">Client-facing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="kbody">Body</Label>
              <Textarea id="kbody" rows={12} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} className="mt-1.5" placeholder="Write the SOP / runbook / help article…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.id ? "Save changes" : "Create article"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
