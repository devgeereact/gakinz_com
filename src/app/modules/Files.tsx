import { useEffect, useRef, useState } from "react"
import { AlertCircle, Loader2, RefreshCw, Search, Upload, Download, Share2, Trash2, FileIcon } from "lucide-react"
import { saveAs } from "file-saver"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/app/components/page-kit"
import { TableSkeleton } from "@/app/components/TableSkeleton"
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
  const [query, setQuery] = useState("")
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

  const q = query.trim().toLowerCase()
  const shown = q ? items.filter((f) => `${f.name} ${f.project_name ?? ""} ${f.client_company ?? ""}`.toLowerCase().includes(q)) : items
  const pick = () => inputRef.current?.click()

  return (
    <div>
      <PageHeader
        title="Files"
        subtitle="Project and client documents, with expiring share links."
        actions={
          <>
            <Button onClick={pick} disabled={uploading}>
              {uploading ? <Loader2 className="animate-spin" /> : <Upload />} Upload
            </Button>
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Refresh
            </Button>
          </>
        }
      />

      {/* Drop zone, the prototype's dashed `.empty` box */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); doUpload(e.dataTransfer.files) }}
        onClick={pick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick() } }}
        className={cn(
          "mb-4 grid cursor-pointer place-items-center gap-2.5 rounded-2xl border border-dashed bg-card p-7 text-center transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
          dragOver ? "border-acc bg-acc-soft" : "border-line-strong hover:border-muted-foreground",
        )}
      >
        <span aria-hidden className="grid h-12 w-12 place-items-center rounded-[14px] bg-acc-soft text-acc">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
        </span>
        <b className="font-semibold">
          {projectFilter !== "all" ? "Drop files here, or click to upload to this project" : "Drop files here, or click to upload"}
        </b>
        <span className="text-[13px] text-muted-foreground">Up to 20 MB each. Files stay private until you share a link.</span>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => doUpload(e.target.files)} />
      </div>

      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <div className="flex min-h-10 w-full min-w-0 max-w-[280px] items-center gap-2 rounded-[10px] border bg-card pl-3 focus-within:border-acc focus-within:shadow-[0_0_0_3px_hsl(var(--os-acc-soft))]">
          <span className="shrink-0 text-muted-foreground" aria-hidden>Project</span>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger aria-label="Project filter" className="h-[38px] min-w-0 flex-1 border-0 bg-transparent focus:shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projectList.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex min-h-10 min-w-0 max-w-[340px] flex-1 basis-[200px] items-center gap-2 rounded-[10px] border bg-card px-3 focus-within:border-acc focus-within:shadow-[0_0_0_3px_hsl(var(--os-acc-soft))]">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">Search files</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files…"
            className="min-h-[38px] w-full min-w-0 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-start gap-3.5 rounded-2xl border border-bad/30 bg-bad-soft p-[18px] text-foreground">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-bad" />
          <div className="min-w-[min(100%,200px)] flex-1">
            <p className="font-semibold">Could not load files.</p>
            <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {error}. The files endpoint and database must be live on the server.
            </p>
          </div>
          <Button variant="outline" onClick={load}>
            <RefreshCw /> Try again
          </Button>
        </div>
      )}

      {loading ? (
        <div className="overflow-hidden rounded-[14px] border bg-card">
          <TableSkeleton rows={4} cols={4} />
        </div>
      ) : items.length === 0 ? (
        !error && <p className="rounded-[14px] border bg-card px-5 py-10 text-center text-muted-foreground">No files yet. Upload one above.</p>
      ) : shown.length === 0 ? (
        <p className="rounded-[14px] border bg-card px-5 py-10 text-center text-muted-foreground">No files match “{query}”.</p>
      ) : (
        <div className="overflow-hidden rounded-[14px] border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="min-w-[220px]">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <b className="min-w-0 font-semibold [overflow-wrap:anywhere]">{f.name}</b>
                      {f.share_token && <Badge variant="acc">Shared</Badge>}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-[140px]">{f.project_name || f.client_company || <span className="text-muted-foreground">None</span>}</TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono">{humanSize(f.size)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {fmt(f.created_at)}
                    {f.uploaded_by_name && <span className="text-muted-foreground"> · {f.uploaded_by_name}</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" disabled={busyId === f.id} onClick={() => share(f)}>
                        <Share2 /> Copy share link
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9" disabled={busyId === f.id} onClick={() => download(f)} aria-label="Download" title="Download">
                        <Download />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-bad" onClick={() => remove(f)} aria-label="Delete" title="Delete">
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
  )
}
