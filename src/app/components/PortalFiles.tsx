import { useCallback, useEffect, useState } from "react"
import { Download, FileIcon, Loader2 } from "lucide-react"
import { saveAs } from "file-saver"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadError } from "@/app/components/EmptyState"
import { downloadName, portalFiles, type PortalFile } from "@/lib/api"
import { notAvailableYet } from "@/lib/notAvailable"

function humanSize(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function fmt(d: string) {
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

/**
 * The files the studio shared with the signed-in client (files.php client
 * routes, SQL 18). The server scopes both the list and each download to the
 * client in the token, so nothing here passes a client id. Hidden before SQL
 * 18 runs or the new files.php is uploaded, and when nothing is shared yet.
 */
export function PortalFiles() {
  const [items, setItems] = useState<PortalFile[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const apply = useCallback((res: Awaited<ReturnType<typeof portalFiles.list>>) => {
    if (res.ok) {
      setItems(res.data)
      setLoadError(null)
    } else if (notAvailableYet(res)) {
      setUnavailable(true)
    } else {
      setLoadError(res.error)
    }
  }, [])
  const load = useCallback(() => portalFiles.list().then(apply), [apply])

  useEffect(() => {
    let live = true
    portalFiles.list().then((r) => {
      if (live) apply(r)
    })
    return () => {
      live = false
    }
  }, [apply])

  const download = async (f: PortalFile) => {
    setBusyId(f.id)
    const res = await portalFiles.download(f.id)
    setBusyId(null)
    if (res.ok) saveAs(res.data, downloadName(res.data, f.name))
    else toast.error(res.error || "Could not download the file.")
  }

  if (unavailable || (items !== null && items.length === 0 && !loadError)) return null

  return (
    <Card aria-labelledby="portal-files-heading">
      <CardHeader className="flex-row items-center gap-2.5 space-y-0">
        <CardTitle id="portal-files-heading">Shared files</CardTitle>
      </CardHeader>
      <CardContent>
        {loadError ? (
          <LoadError what="your shared files" detail={loadError} onRetry={load} />
        ) : items === null ? (
          <div role="status" className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading your files…
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((f) => (
              <li key={f.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                <span className="flex min-w-0 items-start gap-2.5">
                  <FileIcon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <b className="block font-semibold [overflow-wrap:anywhere]">{f.name}</b>
                    <span className="block text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                      {[f.project_name, humanSize(f.size), f.shared_at ? `shared ${fmt(f.shared_at)}` : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </span>
                <Button size="sm" variant="outline" disabled={busyId === f.id} onClick={() => download(f)} aria-label={`Download ${f.name}`}>
                  {busyId === f.id ? <Loader2 className="animate-spin" /> : <Download />} Download
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
