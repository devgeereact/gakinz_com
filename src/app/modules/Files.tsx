import { useEffect, useRef, useState } from "react"
import { Loader2, RefreshCw, Upload, Download, Share2, Trash2, FileIcon } from "lucide-react"
import { saveAs } from "file-saver"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { files, projects as projectsApi, API_BASE, type FileRow, type Project } from "@/lib/api"
import { getStoredToken } from "@/store/auth.store"
import { cn } from "@/lib/utils"

function humanSize(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
function fmt(d: string) {
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export default function Files() {
  const [items, setItems] = useState<FileRow[]>([])
  const [projectList, setProjectList] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectFilter, setProjectFilter] = useState("all")
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    const res = await files.list(projectFilter !== "all" ? { project_id: Number(projectFilter) } : undefined)
    if (res.ok) {
      setItems(res.data)
      setError(null)
    } else setError(res.error)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter])

  useEffect(() => {
    projectsApi.list().then((r) => r.ok && setProjectList(r.data))
  }, [])

  const doUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    for (const f of Array.from(fileList)) {
      const res = await files.upload(f, projectFilter !== "all" ? { project_id: Number(projectFilter) } : undefined)
      if (!res.ok) toast.error(`${f.name}: ${res.error}`)
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ""
    toast.success("Upload complete.")
    load()
  }

  const download = async (f: FileRow) => {
    setBusyId(f.id)
    try {
      const token = getStoredToken()
      const res = await fetch(`${API_BASE}/files.php?download=${f.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`Download failed (${res.status})`)
      saveAs(await res.blob(), f.name)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed.")
    }
    setBusyId(null)
  }

  const share = async (f: FileRow) => {
    setBusyId(f.id)
    const res = await files.share(f.id, 7)
    setBusyId(null)
    if (res.ok) {
      const url = files.shareUrl(res.data.token)
      try {
        await navigator.clipboard.writeText(url)
        toast.success("Share link copied (valid 7 days).")
      } catch {
        toast.success("Share link created (valid 7 days).")
      }
      load()
    } else toast.error(res.error || "Could not create a link.")
  }

  const remove = async (f: FileRow) => {
    const res = await files.remove(f.id)
    if (res.ok) setItems((xs) => xs.filter((x) => x.id !== f.id))
    else toast.error(res.error || "Could not delete.")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Files</h1>
          <p className="text-sm text-muted-foreground">Project &amp; client documents, with expiring share links.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-44">
            <Label className="sr-only">Project filter</Label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projectList.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the files endpoint and DB must be live on the server.
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); doUpload(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
        )}
      >
        {uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
        <p className="text-sm text-muted-foreground">
          {projectFilter !== "all" ? "Drop files here, or click to upload to this project" : "Drop files here, or click to upload"} (20 MB max)
        </p>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => doUpload(e.target.files)} />
      </div>

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading files…
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No files yet. Upload one above.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <FileIcon className="h-4 w-4 text-muted-foreground" /> {f.name}
                      {f.share_token && <Share2 className="h-3 w-3 text-primary" aria-label="Shared" />}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{f.project_name || f.client_company || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{humanSize(f.size)}</TableCell>
                  <TableCell className="text-muted-foreground">{fmt(f.created_at)}{f.uploaded_by_name ? ` · ${f.uploaded_by_name}` : ""}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busyId === f.id} onClick={() => download(f)} aria-label="Download" title="Download">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busyId === f.id} onClick={() => share(f)} aria-label="Share link" title="Copy share link">
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(f)} aria-label="Delete" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
