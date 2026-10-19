import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { LINKED_RECORD, recordElementId } from "@/lib/deepLink"
import { useReveal } from "@/hooks/use-reveal"
import { Check, ClipboardList, Loader2, Pencil, Plus, RotateCcw, Send, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ASSET_LABEL_MAX, ASSET_NOTE_MAX, projectAssets, type PortalAsset, type ProjectAsset } from "@/lib/api"
import { LoadError } from "@/app/components/EmptyState"
import { StatusBadge } from "@/app/components/page-kit"
import {
  ASSET_BADGE,
  assetSummary,
  assetsLoadState,
  groupByProject,
  labelProblem,
  noteProblem,
  noteValue,
  portalAssetsUnavailable,
  staffActions,
} from "@/app/modules/assetChecklistModel"

const NO_SECRETS = "Never put a password here. Describe the login (which service, whose account) and the studio will arrange access safely."

/**
 * Staff panel on a project board: what the client must send for this project
 * (docs/PRODUCT-SPEC.md 6.2 and 7). Add, edit, accept, reopen and remove items.
 * Until SQL 15 runs, assets.php answers 503 and this panel says so.
 */
export function ProjectAssetsPanel({
  projectId,
  projectName,
  linkedAsset = null,
}: {
  projectId: number
  projectName: string
  /** An item a deep link points at (src/lib/deepLink.ts): scrolled to and outlined. */
  linkedAsset?: number | null
}) {
  const [items, setItems] = useState<ProjectAsset[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [busy, setBusy] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [removing, setRemoving] = useState<number | null>(null)
  const [addKey, setAddKey] = useState(0) // bumped only after a successful add, to clear the form

  const apply = useCallback((res: Awaited<ReturnType<typeof projectAssets.list>>) => {
    if (res.ok) {
      setItems(res.data)
      setLoadError(null)
      setUnavailable(false)
    } else if (res.status === 503) {
      setUnavailable(true)
    } else {
      setLoadError(res.error)
    }
  }, [])
  const load = useCallback(() => projectAssets.list(projectId).then(apply), [projectId, apply])

  useEffect(() => {
    // The parent keys this panel on the project, so a new project starts from fresh state.
    let live = true
    projectAssets.list(projectId).then((r) => {
      if (live) apply(r)
    })
    return () => {
      live = false
    }
  }, [projectId, apply])

  const replace = (next: ProjectAsset) => setItems((xs) => (xs ? xs.map((x) => (x.id === next.id ? next : x)) : xs))

  const act = async (item: ProjectAsset, kind: "accept" | "reopen" | "remove") => {
    setBusy(item.id)
    const res = kind === "accept" ? await projectAssets.accept(item.id) : kind === "reopen" ? await projectAssets.reopen(item.id) : await projectAssets.remove(item.id)
    setBusy(null)
    setRemoving(null)
    if (!res.ok) {
      toast.error(res.error || "That did not work.")
      if (res.status === 409 || res.status === 404) load() // someone else changed it; show the current list
      return
    }
    if (kind === "remove") setItems((xs) => (xs ? xs.filter((x) => x.id !== item.id) : xs))
    else replace(res.data as ProjectAsset)
  }

  const view = assetsLoadState(items, loadError, unavailable)
  useReveal(linkedAsset !== null && items?.some((x) => x.id === linkedAsset) ? recordElementId("asset", linkedAsset) : null, items !== null)

  return (
    <section className="mt-4 min-w-0 rounded-2xl border bg-card p-[18px]" aria-labelledby={`assets-${projectId}-heading`}>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 id={`assets-${projectId}-heading`} className="flex items-center gap-2 font-display text-lg font-semibold tracking-[-0.01em]">
          <ClipboardList className="size-4 text-muted-foreground" aria-hidden /> What the client sends
        </h3>
        {view === "ready" && items && <span className="text-[13px] text-muted-foreground">{assetSummary(items)}</span>}
      </div>

      {view === "unavailable" ? (
        <p className="text-sm text-muted-foreground">
          The asset checklist needs a database update first (SQL 15 in docs/DEPLOYMENT.md). Until then the client sees no checklist.
        </p>
      ) : view === "error" ? (
        <LoadError what="the checklist" detail={loadError ?? ""} onRetry={load} />
      ) : view === "loading" ? (
        <div role="status" className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading the checklist…
        </div>
      ) : (
        <>
          {items && items.length > 0 ? (
            <ul className="divide-y" aria-label={`Items the client sends for ${projectName}`}>
              {items.map((item) =>
                editing === item.id ? (
                  <li key={item.id} className="py-3">
                    <AssetForm
                      idPrefix={`asset-edit-${item.id}`}
                      initial={{ label: item.label, note: item.note ?? "" }}
                      submitLabel="Save"
                      onCancel={() => setEditing(null)}
                      onSubmit={async (label, note) => {
                        const res = await projectAssets.update(item.id, { label, note })
                        if (!res.ok) return res.error || "The item was not saved."
                        replace(res.data)
                        setEditing(null)
                        return null
                      }}
                    />
                  </li>
                ) : (
                  <li
                    key={item.id}
                    id={recordElementId("asset", item.id)}
                    className={cn(
                      "grid scroll-m-4 gap-2 rounded-lg py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start",
                      item.id === linkedAsset && `${LINKED_RECORD} px-2`,
                    )}
                  >
                    <span className="min-w-0">
                      <b className="block font-semibold [overflow-wrap:anywhere]">{item.label}</b>
                      {item.note && <span className="block whitespace-pre-wrap text-[13px] text-muted-foreground [overflow-wrap:anywhere]">{item.note}</span>}
                      {item.client_note && (
                        <span className="mt-1 block whitespace-pre-wrap text-[13px] [overflow-wrap:anywhere]">
                          <span className="text-muted-foreground">Client said: </span>
                          {item.client_note}
                        </span>
                      )}
                      {item.file_name && <span className="mt-1 block text-[13px] text-muted-foreground">File: {item.file_name}</span>}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                      <StatusBadge status={ASSET_BADGE[item.status].tone}>{ASSET_BADGE[item.status].staff}</StatusBadge>
                      {staffActions(item.status).accept && (
                        <Button size="sm" variant="outline" onClick={() => act(item, "accept")} disabled={busy === item.id} aria-label={`Accept ${item.label}`}>
                          {busy === item.id ? <Loader2 className="animate-spin" /> : <Check />} Accept
                        </Button>
                      )}
                      {staffActions(item.status).reopen && (
                        <Button size="sm" variant="ghost" onClick={() => act(item, "reopen")} disabled={busy === item.id} aria-label={`Reopen ${item.label}`}>
                          <RotateCcw /> Reopen
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditing(item.id)} disabled={busy === item.id} aria-label={`Edit ${item.label}`}>
                        <Pencil />
                      </Button>
                      {removing === item.id ? (
                        <Button size="sm" variant="destructive" onClick={() => act(item, "remove")} disabled={busy === item.id}>
                          Remove it
                        </Button>
                      ) : (
                        <Button size="icon" variant="ghost" className="size-8" onClick={() => setRemoving(item.id)} disabled={busy === item.id} aria-label={`Remove ${item.label}`}>
                          <Trash2 />
                        </Button>
                      )}
                    </span>
                  </li>
                ),
              )}
            </ul>
          ) : (
            <p className="py-1 text-sm text-muted-foreground">
              Nothing requested yet. List what the client must send, such as a logo, page copy, photos or a description of a login.
            </p>
          )}
          <div className="mt-3 border-t pt-3">
            <AssetForm
              key={addKey}
              idPrefix={`asset-new-${projectId}`}
              initial={{ label: "", note: "" }}
              submitLabel="Add item"
              onSubmit={async (label, note) => {
                const res = await projectAssets.create(projectId, label, note)
                if (!res.ok) {
                  if (res.status === 503) setUnavailable(true)
                  return res.error || "The item was not added."
                }
                setItems((xs) => [...(xs ?? []), res.data])
                setAddKey((k) => k + 1)
                return null
              }}
            />
          </div>
        </>
      )}
    </section>
  )
}

function AssetForm({
  idPrefix,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  idPrefix: string
  initial: { label: string; note: string }
  submitLabel: string
  onSubmit: (label: string, note: string | null) => Promise<string | null>
  onCancel?: () => void
}) {
  const [label, setLabel] = useState(initial.label)
  const [note, setNote] = useState(initial.note)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const problem = labelProblem(label) ?? noteProblem(note)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (problem || inFlight.current) return
    inFlight.current = true
    setSaving(true)
    setError(null)
    const err = await onSubmit(label.trim(), noteValue(note))
    inFlight.current = false
    setSaving(false)
    if (err) setError(err)
  }

  return (
    <form onSubmit={submit} className="grid gap-2.5">
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-label`}>What to send</Label>
        <Input id={`${idPrefix}-label`} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={ASSET_LABEL_MAX} disabled={saving} placeholder="Logo, as SVG or a large PNG" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-note`}>Guidance for the client (optional)</Label>
        <Textarea id={`${idPrefix}-note`} className="min-h-16" value={note} onChange={(e) => setNote(e.target.value)} maxLength={ASSET_NOTE_MAX} disabled={saving} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={!!problem || saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Plus />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

/**
 * The portal card: what the studio needs from the client, per project, and a
 * way to say each item has been sent. The server takes the client from the
 * token, so nothing here sends a client id. Uploads are not taken here; the
 * client says how they sent it. Hidden until assets.php is uploaded and SQL 15
 * runs: portalAssetsUnavailable() (assetChecklistModel.ts) says which refusals
 * mean that, and every other failure shows as an error with a retry.
 */
export function PortalAssets() {
  const [items, setItems] = useState<PortalAsset[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [supplying, setSupplying] = useState<number | null>(null)
  const [sent, setSent] = useState<string | null>(null)

  const apply = useCallback((res: Awaited<ReturnType<typeof projectAssets.mine>>) => {
    if (res.ok) {
      setItems(res.data)
      setLoadError(null)
    } else if (portalAssetsUnavailable(res)) {
      setUnavailable(true)
    } else {
      setLoadError(res.error)
    }
  }, [])
  const load = useCallback(() => projectAssets.mine().then(apply), [apply])

  useEffect(() => {
    let live = true
    projectAssets.mine().then((r) => {
      if (live) apply(r)
    })
    return () => {
      live = false
    }
  }, [apply])

  const view = assetsLoadState(items, loadError, unavailable)
  // Nothing to show: before SQL 15, or when the studio has asked for nothing.
  if (view === "unavailable" || (view === "ready" && items?.length === 0)) return null

  return (
    <Card aria-labelledby="portal-assets-heading">
      <CardHeader className="flex-row flex-wrap items-center gap-2.5 space-y-0">
        <CardTitle id="portal-assets-heading">What we need from you</CardTitle>
        {view === "ready" && items && <span className="ml-auto text-[13px] text-muted-foreground">{assetSummary(items)}</span>}
      </CardHeader>
      <CardContent>
        {sent && (
          <p role="status" className="mb-3 text-sm">
            {sent}
          </p>
        )}
        {view === "error" ? (
          <LoadError what="your checklist" detail={loadError ?? ""} onRetry={load} />
        ) : view === "loading" ? (
          <div role="status" className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading your checklist…
          </div>
        ) : (
          <div className="grid gap-4">
            {groupByProject(items ?? []).map((g) => (
              <div key={g.projectId}>
                <h3 className="mb-1 font-mono text-xs uppercase tracking-[.08em] text-muted-foreground [overflow-wrap:anywhere]">{g.projectName}</h3>
                <ul className="divide-y" aria-label={`What we need for ${g.projectName}`}>
                  {g.items.map((item) => (
                    <li key={item.id} className="py-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                        <span className="min-w-0">
                          <b className="block font-semibold [overflow-wrap:anywhere]">{item.label}</b>
                          {item.note && <span className="block whitespace-pre-wrap text-[13px] text-muted-foreground [overflow-wrap:anywhere]">{item.note}</span>}
                          {item.client_note && item.status !== "requested" && (
                            <span className="mt-1 block whitespace-pre-wrap text-[13px] [overflow-wrap:anywhere]">
                              <span className="text-muted-foreground">You said: </span>
                              {item.client_note}
                            </span>
                          )}
                        </span>
                        <StatusBadge status={ASSET_BADGE[item.status].tone}>{ASSET_BADGE[item.status].client}</StatusBadge>
                      </div>
                      {item.status === "requested" &&
                        (supplying === item.id ? (
                          <SupplyForm
                            item={item}
                            onCancel={() => setSupplying(null)}
                            onDone={async (message) => {
                              setSupplying(null)
                              setSent(message)
                              await load()
                            }}
                          />
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => {
                              setSent(null)
                              setSupplying(item.id)
                            }}
                            aria-label={`Mark ${item.label} as sent`}
                          >
                            <Send /> I have sent this
                          </Button>
                        ))}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SupplyForm({ item, onCancel, onDone }: { item: PortalAsset; onCancel: () => void; onDone: (message: string) => Promise<void> }) {
  const [note, setNote] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [off, setOff] = useState(false) // the supply route is not on the server yet
  const inFlight = useRef(false) // blocks a second submit before React re-renders

  const problem = noteProblem(note)

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (problem || inFlight.current) return
    inFlight.current = true
    setSending(true)
    setError(null)
    const res = await projectAssets.supply(item.id, noteValue(note))
    if (res.ok || res.status === 409) {
      // A 409 means it was already marked, so the list is refreshed either way.
      await onDone(`Thank you. The studio can see that you sent "${item.label}".`)
      return
    }
    inFlight.current = false
    setSending(false)
    if (portalAssetsUnavailable(res)) {
      setOff(true)
      return
    }
    setError(res.error || "That did not go through.")
  }

  const id = `asset-supply-${item.id}`
  return (
    <form onSubmit={send} className="mt-2 grid gap-2.5">
      <div className="grid gap-1.5">
        <Label htmlFor={id}>How did you send it? (optional)</Label>
        <Textarea id={id} className="min-h-16" value={note} onChange={(e) => setNote(e.target.value)} maxLength={ASSET_NOTE_MAX} disabled={sending} aria-describedby={`${id}-hint`} />
        <p id={`${id}-hint`} className="text-[13px] text-muted-foreground">
          For example, by email or in a shared folder. {NO_SECRETS}
        </p>
      </div>
      {off && (
        <p role="status" className="text-[13px] text-muted-foreground">
          Marking an item as sent opens once the studio finishes a server update. Please tell the studio in a message for now.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error} Your note is still here, so you can try again.
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={sending}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!!problem || sending || off}>
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
          {sending ? "Sending…" : "Mark as sent"}
        </Button>
      </div>
    </form>
  )
}
