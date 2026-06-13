import { useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, Search, Pencil, Trash2, BookOpen } from "lucide-react"
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

const blank = { id: 0, title: "", category: "General", audience: "internal", body: "" }

export default function Knowledge() {
  const [items, setItems] = useState<KbSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [category, setCategory] = useState("all")

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
      setError(null)
    } else setError(res.error)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  const categories = Array.from(new Set(items.map((i) => i.category))).sort()

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Knowledge</h1>
          <p className="text-sm text-muted-foreground">SOPs, runbooks and help articles — the studio made repeatable.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={startNew}>
            <Plus className="mr-2 h-4 w-4" /> New article
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the knowledge endpoint and DB must be live on the server.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* List */}
        <div className="space-y-3 lg:col-span-1">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search titles…" className="pl-8" />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border bg-card">
            {loading ? (
              <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No articles. Write the first one.</div>
            ) : (
              <ul className="divide-y">
                {items.map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => openArticle(a.id)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-muted/50",
                        selected?.id === a.id && "bg-muted/60",
                      )}
                    >
                      <span className="text-sm font-medium">{a.title}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5">{a.category}</span>
                        <span className={a.audience === "client" ? "text-primary" : ""}>{a.audience}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Viewer */}
        <div className="lg:col-span-2">
          <div className="min-h-[20rem] rounded-xl border border-border bg-card p-6">
            {viewLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading article…
              </div>
            ) : !selected ? (
              <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <BookOpen className="mb-2 h-8 w-8 opacity-40" />
                Pick an article to read, or write a new one.
              </div>
            ) : (
              <article>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{selected.title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selected.category} · {selected.audience} · {selected.author || "—"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(selected)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(selected)} aria-label="Delete article">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{selected.body || "—"}</div>
              </article>
            )}
          </div>
        </div>
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
              <Label>Audience</Label>
              <Select value={form.audience} onValueChange={(v) => setForm((f) => ({ ...f, audience: v }))}>
                <SelectTrigger className="mt-1.5 w-48"><SelectValue /></SelectTrigger>
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
