import { useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, Pencil, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react"
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
import { blog, type BlogAdminRow, type BlogInput } from "@/lib/api"
import { cn } from "@/lib/utils"

const COVERS = ["article", "studio", "retail", "pro", "health"]
const blank: BlogInput & { id: number } = {
  id: 0,
  title: "",
  slug: "",
  excerpt: "",
  category: "Insight",
  cover: "article",
  read_mins: 4,
  status: "draft",
  body: "",
}

export default function Blog() {
  const [items, setItems] = useState<BlogAdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  // Editing loads the full post first. Until it arrives (or if it fails) the
  // form cannot be saved, so a half-loaded form never overwrites the body.
  const [loadingPost, setLoadingPost] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await blog.listAll()
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
    setPostError(null)
    setOpen(true)
  }
  const startEdit = async (a: BlogAdminRow) => {
    setForm({ ...blank, id: a.id, title: a.title, slug: a.slug, category: a.category, cover: a.cover, read_mins: a.read_mins, status: a.status })
    setPostError(null)
    setLoadingPost(true)
    setOpen(true)
    const res = await blog.getForEdit(a.id)
    setLoadingPost(false)
    if (!res.ok) {
      setPostError(res.error || "This post could not be loaded.")
      return
    }
    const p = res.data
    setForm({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? "",
      category: p.category,
      cover: p.cover,
      read_mins: p.read_mins,
      status: p.status,
      body: p.body ?? "",
    })
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.title.trim()) return toast.error("A title is required.")
    if (loadingPost || postError) return
    setSaving(true)
    const { id, ...payload } = form
    const res = id ? await blog.update(id, payload) : await blog.create(payload)
    setSaving(false)
    if (res.ok) {
      toast.success(id ? "Post saved." : "Post created.")
      setOpen(false)
      load()
    } else toast.error(res.error || "Could not save.")
  }

  const togglePublish = async (a: BlogAdminRow) => {
    const next = a.status === "published" ? "draft" : "published"
    const res = await blog.publish(a.id, next)
    if (res.ok) {
      toast.success(next === "published" ? "Published." : "Moved to draft.")
      load()
    } else toast.error(res.error || "Could not update.")
  }

  const remove = async (a: BlogAdminRow) => {
    const res = await blog.remove(a.id)
    if (res.ok) {
      setItems((xs) => xs.filter((x) => x.id !== a.id))
      toast.success("Post deleted.")
    } else toast.error(res.error || "Could not delete.")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Blog</h1>
          <p className="text-sm text-muted-foreground">Write posts here; published ones appear on the public site.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={startNew}>
            <Plus className="mr-2 h-4 w-4" /> New post
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the blog endpoint and DB must be live on the server.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No posts yet. Write the first one.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">Category</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">
                    {a.title}
                    <span className="block text-xs text-muted-foreground">/{a.slug}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{a.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        a.status === "published"
                          ? "bg-emerald-500/12 text-emerald-600"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {a.status === "published" && (
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="View live">
                          <a href={`/resources/${a.slug}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePublish(a)} title={a.status === "published" ? "Unpublish" : "Publish"}>
                        {a.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(a)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(a)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit post" : "New post"}</DialogTitle>
          </DialogHeader>
          {loadingPost && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading the full post…
            </p>
          )}
          {postError && (
            <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {postError} Close this window and try again. Nothing has been changed.
            </div>
          )}
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="btitle">Title</Label>
                <Input id="btitle" value={form.title} onChange={(e) => set("title", e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="bslug">Slug (optional)</Label>
                <Input id="bslug" value={form.slug} onChange={(e) => set("slug", e.target.value)} className="mt-1.5" placeholder="auto from title" />
              </div>
            </div>
            <div>
              <Label htmlFor="bexcerpt">Excerpt</Label>
              <Textarea id="bexcerpt" rows={2} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} className="mt-1.5" placeholder="One or two lines shown in the list." />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="bcat">Category</Label>
                <Input id="bcat" value={form.category} onChange={(e) => set("category", e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Cover</Label>
                <Select value={form.cover} onValueChange={(v) => set("cover", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COVERS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bmins">Read (mins)</Label>
                <Input id="bmins" type="number" min={1} max={60} value={form.read_mins} onChange={(e) => set("read_mins", Number(e.target.value) || 1)} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label htmlFor="bbody">Body</Label>
              <Textarea id="bbody" rows={10} value={form.body} onChange={(e) => set("body", e.target.value)} className="mt-1.5" placeholder="Write the post. Separate paragraphs with a blank line." />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="mt-1.5 w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving || loadingPost || postError !== null}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.id ? "Save changes" : "Create post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
