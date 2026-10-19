import { useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, Pencil, Trash2, AlertCircle, Quote } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader, StatusBadge } from "@/app/components/page-kit"
import { EmptyState } from "@/app/components/EmptyState"

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

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
      toast.success(t.approved === 1 ? "Hidden from the public site." : "Approved. Now shows on the public site.")
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
    <div>
      <PageHeader
        title="Testimonials"
        subtitle="Curated client quotes. Approved ones show on the public site."
        actions={
          <>
            <Button onClick={startNew}>
              <Plus /> New testimonial
            </Button>
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Refresh
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        {error && (
          <div role="alert" className="flex flex-wrap items-start gap-3.5 rounded-2xl border border-bad/30 bg-bad-soft p-[18px] text-foreground">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-bad" aria-hidden="true" />
            <div className="min-w-[min(100%,200px)] flex-1">
              <p className="font-semibold">Testimonials could not be loaded</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}. The testimonials endpoint and database must be live on the server.</p>
            </div>
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Try again
            </Button>
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2" aria-busy="true" aria-label="Loading testimonials">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        ) : error ? null : items.length === 0 ? (
          <EmptyState
            icon={Quote}
            title="No testimonials yet"
            description="Add the first, once a client has agreed to be quoted."
            className="rounded-2xl border border-dashed border-line-strong bg-card py-14"
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((t) => {
              const sub = [t.role, t.company].filter(Boolean).join(", ")
              const stars = Math.max(1, Math.min(5, t.rating))
              return (
                <figure key={t.id} className="m-0 grid min-w-0 content-between gap-3.5 rounded-2xl border bg-card p-[18px]">
                  <blockquote className="m-0 font-display text-[1.25rem] leading-[1.3] tracking-[-0.01em] [overflow-wrap:anywhere]">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="flex flex-wrap items-center justify-between gap-2.5">
                    <span className="flex min-w-0 flex-1 basis-[12rem] items-center gap-2.5">
                      <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-acc-soft text-xs font-bold text-acc">
                        {initials(t.author)}
                      </span>
                      <span className="min-w-0">
                        <b className="block font-semibold [overflow-wrap:anywhere]">{t.author}</b>
                        <small className="block text-[12.5px] leading-[1.35] text-muted-foreground [overflow-wrap:anywhere]">
                          {sub && `${sub} · `}
                          <span className="whitespace-nowrap" aria-label={`Rated ${stars} out of 5`}>
                            {"★".repeat(stars)}
                          </span>
                        </small>
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={t.approved === 1 ? "approved" : "pending"} />
                      <Button variant="outline" size="sm" onClick={() => toggleApprove(t)}>
                        {t.approved === 1 ? "Hide" : "Approve"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => startEdit(t)} aria-label={`Edit the quote from ${t.author}`} title="Edit">
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-bad hover:text-bad" onClick={() => remove(t)} aria-label={`Delete the quote from ${t.author}`} title="Delete">
                        <Trash2 />
                      </Button>
                    </span>
                  </figcaption>
                </figure>
              )
            })}
          </div>
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
                <Label htmlFor="testimonials-sel1">Rating</Label>
                <Select value={String(form.rating)} onValueChange={(v) => set("rating", Number(v))}>
                  <SelectTrigger id="testimonials-sel1" className="mt-1.5"><SelectValue /></SelectTrigger>
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
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
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
