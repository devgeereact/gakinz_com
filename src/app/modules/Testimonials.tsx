import { useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, Pencil, Trash2, Check, X, Star } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { testimonials, type TestimonialAdmin, type TestimonialInput } from "@/lib/api"
import { cn } from "@/lib/utils"

const blank: TestimonialInput & { id: number } = {
  id: 0,
  author: "",
  role: "",
  company: "",
  quote: "",
  rating: 5,
  approved: false,
  sort_order: 0,
}

export default function Testimonials() {
  const [items, setItems] = useState<TestimonialAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await testimonials.listAll()
    if (res.ok) {
      setItems(res.data)
      setError(null)
    } else setError(res.error)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const startNew = () => {
    setForm(blank)
    setOpen(true)
  }
  const startEdit = (t: TestimonialAdmin) => {
    setForm({
      id: t.id,
      author: t.author,
      role: t.role ?? "",
      company: t.company ?? "",
      quote: t.quote,
      rating: t.rating,
      approved: t.approved === 1,
      sort_order: t.sort_order,
    })
    setOpen(true)
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.author.trim()) return toast.error("An author name is required.")
    if (!form.quote.trim()) return toast.error("A quote is required.")
    setSaving(true)
    const { id, ...payload } = form
    const res = id ? await testimonials.update(id, payload) : await testimonials.create(payload)
    setSaving(false)
    if (res.ok) {
      toast.success(id ? "Testimonial saved." : "Testimonial added.")
      setOpen(false)
      load()
    } else toast.error(res.error || "Could not save.")
  }

  const toggleApprove = async (t: TestimonialAdmin) => {
    const res = await testimonials.approve(t.id, t.approved !== 1)
    if (res.ok) {
      toast.success(t.approved === 1 ? "Hidden from site." : "Approved — now live.")
      load()
    } else toast.error(res.error || "Could not update.")
  }

  const remove = async (t: TestimonialAdmin) => {
    const res = await testimonials.remove(t.id)
    if (res.ok) {
      setItems((xs) => xs.filter((x) => x.id !== t.id))
      toast.success("Testimonial deleted.")
    } else toast.error(res.error || "Could not delete.")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Testimonials</h1>
          <p className="text-sm text-muted-foreground">Curated client quotes. Approved ones show on the public site.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={startNew}>
            <Plus className="mr-2 h-4 w-4" /> New testimonial
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the testimonials endpoint and DB must be live on the server.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No testimonials yet. Add the first.</div>
        ) : (
          <ul className="divide-y">
            {items.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.author}</span>
                    {(t.role || t.company) && (
                      <span className="truncate text-xs text-muted-foreground">{[t.role, t.company].filter(Boolean).join(", ")}</span>
                    )}
                    <span className="flex text-amber-400">
                      {Array.from({ length: Math.max(1, Math.min(5, t.rating)) }).map((_, j) => (
                        <Star key={j} className="h-3 w-3 fill-current" />
                      ))}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        t.approved === 1 ? "bg-emerald-500/12 text-emerald-600" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {t.approved === 1 ? "live" : "hidden"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleApprove(t)} title={t.approved === 1 ? "Hide" : "Approve"}>
                    {t.approved === 1 ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(t)} title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(t)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit testimonial" : "New testimonial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="tauthor">Author</Label>
                <Input id="tauthor" value={form.author} onChange={(e) => set("author", e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="trole">Role</Label>
                <Input id="trole" value={form.role} onChange={(e) => set("role", e.target.value)} className="mt-1.5" placeholder="e.g. Founder" />
              </div>
            </div>
            <div>
              <Label htmlFor="tcompany">Company</Label>
              <Input id="tcompany" value={form.company} onChange={(e) => set("company", e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="tquote">Quote</Label>
              <Textarea id="tquote" rows={4} value={form.quote} onChange={(e) => set("quote", e.target.value)} className="mt-1.5" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Rating</Label>
                <Select value={String(form.rating)} onValueChange={(v) => set("rating", Number(v))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} star{n > 1 ? "s" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tsort">Sort order</Label>
                <Input id="tsort" type="number" value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value) || 0)} className="mt-1.5" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.approved} onChange={(e) => set("approved", e.target.checked)} className="h-4 w-4 rounded border-border" />
              Approved (show on public site)
            </label>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.id ? "Save changes" : "Add testimonial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
