import { useState } from "react"
import { Loader2, Plus, RefreshCw, Pencil, Trash2, Eye, EyeOff, ExternalLink, AlertCircle, BookOpen } from "lucide-react"
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
import { isDirty } from "@/lib/dirty-model"
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard"
import { useLoad } from "@/hooks/use-load"
import { UnsavedGuardDialog } from "@/components/unsaved-guard-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader, StatusBadge } from "@/app/components/page-kit"
import { EmptyState } from "@/app/components/EmptyState"
import { TableSkeleton } from "@/app/components/TableSkeleton"

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
  const { data: items, error, loading, reload: load, setData: setItems } = useLoad<BlogAdminRow[]>(() => blog.listAll(), [])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  // The values last loaded or saved; the form is dirty when it differs from them.
  const [baseline, setBaseline] = useState(blank)
  const [saving, setSaving] = useState(false)
  // Editing loads the full post first. Until it arrives (or if it fails) the
  // form cannot be saved, so a half-loaded form never overwrites the body.
  const [loadingPost, setLoadingPost] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

  const guard = useUnsavedGuard(open && !loadingPost && isDirty(form, baseline))

  const startNew = () => {
    setForm(blank)
    setBaseline(blank)
    setPostError(null)
    setOpen(true)
  }
  const startEdit = async (a: BlogAdminRow) => {
    const partial = { ...blank, id: a.id, title: a.title, slug: a.slug, category: a.category, cover: a.cover, read_mins: a.read_mins, status: a.status }
    setForm(partial)
    setBaseline(partial)
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
    const loaded = {
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? "",
      category: p.category,
      cover: p.cover,
      read_mins: p.read_mins,
      status: p.status,
      body: p.body ?? "",
    }
    setForm(loaded)
    setBaseline(loaded)
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
      setBaseline(form)
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
    <div>
      <PageHeader
        title="Blog"
        subtitle="Write posts here; published ones appear on the public site."
        actions={
          <>
            <Button onClick={startNew}>
              <Plus /> New post
            </Button>
            <Button asChild variant="outline">
              <a href="/resources" target="_blank" rel="noopener noreferrer">
                <ExternalLink /> View live
              </a>
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
              <p className="font-semibold">Posts could not be loaded</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}. The blog endpoint and database must be live on the server.</p>
            </div>
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Try again
            </Button>
          </div>
        )}

        {loading ? (
          <div className="overflow-hidden rounded-[14px] border bg-card">
            <TableSkeleton rows={4} cols={3} />
          </div>
        ) : error ? null : items.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No posts yet"
            description="Write the first one."
            className="rounded-2xl border border-dashed border-line-strong bg-card py-14"
          />
        ) : (
          <div className="overflow-hidden rounded-[14px] border bg-card">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="min-w-[14rem]">
                      <span className="font-semibold [overflow-wrap:anywhere]">{a.title}</span>
                      <span className="block font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">/{a.slug}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{a.category}</TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {a.status === "published" && (
                          <Button asChild variant="ghost" size="sm" title="View live">
                            <a href={`/resources/${a.slug}`} target="_blank" rel="noreferrer" aria-label={`View ${a.title} live`}>
                              <ExternalLink />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => togglePublish(a)}>
                          {a.status === "published" ? <EyeOff /> : <Eye />}
                          {a.status === "published" ? "Unpublish" : "Publish"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => startEdit(a)} aria-label={`Edit ${a.title}`} title="Edit">
                          <Pencil />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-bad hover:text-bad" onClick={() => remove(a)} aria-label={`Delete ${a.title}`} title="Delete">
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : guard.requestLeave(() => setOpen(false)))}>
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
            <div role="alert" className="rounded-xl border border-bad/30 bg-bad-soft p-3 text-sm text-foreground">
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
                <Label htmlFor="blog-sel1">Cover</Label>
                <Select value={form.cover} onValueChange={(v) => set("cover", v)}>
                  <SelectTrigger id="blog-sel1" className="mt-1.5"><SelectValue /></SelectTrigger>
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
              <Textarea id="bbody" rows={10} value={form.body} onChange={(e) => set("body", e.target.value)} className="mt-1.5" placeholder={"Write the post. Separate paragraphs with a blank line.\n## Heading, - bullet, 1. numbered, **bold**, [text](https://…), and [text](https://…){sponsored} for a paid link."} />
              <p className="mt-2 text-xs text-muted-foreground">
                For a recommendation card, write these lines on their own. Only title and an http(s) url are required. A block
                missing either shows as plain text. With affiliate: yes, the public post shows an affiliate label and a
                disclosure placeholder until the disclosure wording is supplied.
              </p>
              <pre className="mt-1 overflow-x-auto rounded-md bg-muted p-2 text-xs">{":::recommend\ntitle: Product or service name\nurl: https://example.com/item\nnote: One or two sentences on why.\naffiliate: yes\n:::"}</pre>
            </div>
            <div>
              <Label htmlFor="blog-sel2">Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger id="blog-sel2" className="mt-1.5 w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => guard.requestLeave(() => setOpen(false))}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || loadingPost || postError !== null}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.id ? "Save changes" : "Create post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UnsavedGuardDialog prompt={guard.prompt} />
    </div>
  )
}
