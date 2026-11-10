import { useState } from "react"
import { AlertCircle, BadgeCheck, Copy, ExternalLink, Loader2, Plus, RefreshCw, Ban } from "lucide-react"
import { toast } from "sonner"
import { useLoad } from "@/hooks/use-load"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { certificates, type Certificate } from "@/lib/api"
import { PageHeader, StatusBadge } from "@/app/components/page-kit"
import { EmptyState } from "@/app/components/EmptyState"
import { certificateState, issueError, verifyUrl } from "./certificatesModel"

// Certificates (Phase 6, D-058). Super admin and admin issue, copy the public link and revoke. A revoked
// certificate stays in this register but no longer verifies on /verify. The server decides every rule
// (certificates.php); the form only saves a round trip.

const todayIso = () => new Date().toISOString().slice(0, 10)
const blank = { recipient: "", programme: "", issued_at: "" }

export default function Certificates() {
  const { data: items, error, loading, reload: load } = useLoad<Certificate[]>(() => certificates.list(), [])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [revoking, setRevoking] = useState<Certificate | null>(null)

  const issue = async () => {
    const problem = issueError(form, todayIso())
    if (problem) return toast.error(problem)
    setSaving(true)
    const res = await certificates.issue({
      recipient: form.recipient,
      programme: form.programme,
      ...(form.issued_at ? { issued_at: form.issued_at } : {}),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(`Issued ${res.data.public_id}. Copy its link to send it.`)
      setForm(blank)
      setOpen(false)
      load()
    } else toast.error(res.error || "Could not issue the certificate.")
  }

  const revoke = async () => {
    if (!revoking) return
    setSaving(true)
    const res = await certificates.revoke(revoking.id)
    setSaving(false)
    if (res.ok) {
      toast.success(`${revoking.public_id} revoked. It no longer verifies.`)
      setRevoking(null)
      load()
    } else toast.error(res.error || "Could not revoke the certificate.")
  }

  const copy = async (c: Certificate) => {
    try {
      await navigator.clipboard.writeText(verifyUrl(c.public_id))
      toast.success("Link copied.")
    } catch {
      toast.error("Could not copy. Select the reference and copy it by hand.")
    }
  }

  return (
    <div>
      <PageHeader
        title="Certificates"
        subtitle="Issue a certificate, send its link, and revoke it if it was a mistake. Anyone can check a reference on the public verify page."
        actions={
          <>
            <Button onClick={() => setOpen(true)}>
              <Plus /> Issue certificate
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
              <p className="font-semibold">Certificates could not be loaded</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Try again
            </Button>
          </div>
        )}

        {loading ? (
          <div aria-busy="true" aria-label="Loading certificates">
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        ) : error ? null : items.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title="No certificates yet"
            description="Issue the first when someone finishes a programme. It gets a reference nobody can guess, and a link anyone can check."
            className="rounded-2xl border border-dashed border-line-strong bg-card py-14"
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Programme</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => {
                  const revoked = certificateState(c) === "revoked"
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="whitespace-nowrap font-mono text-[13px]">{c.public_id}</TableCell>
                      <TableCell className="wrap-anywhere">{c.recipient}</TableCell>
                      <TableCell className="wrap-anywhere">{c.programme}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.issued_at}</TableCell>
                      <TableCell>{revoked ? <StatusBadge status="void">Revoked</StatusBadge> : <StatusBadge status="active">Valid</StatusBadge>}</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex flex-wrap justify-end gap-1.5">
                          <Button variant="ghost" size="sm" onClick={() => copy(c)} disabled={revoked} aria-label={`Copy the link for ${c.public_id}`} title="Copy link">
                            <Copy />
                          </Button>
                          <Button variant="ghost" size="sm" asChild aria-label={`Open the public check for ${c.public_id}`} title="Open the public check">
                            <a href={verifyUrl(c.public_id)} target="_blank" rel="noreferrer">
                              <ExternalLink />
                            </a>
                          </Button>
                          <Button variant="ghost" size="sm" className="text-bad hover:text-bad" onClick={() => setRevoking(c)} disabled={revoked} aria-label={`Revoke ${c.public_id}`} title="Revoke">
                            <Ban />
                          </Button>
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Issue certificate</DialogTitle>
            <DialogDescription>The public page shows the recipient, the programme and the date, and nothing else.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cert-recipient">Recipient</Label>
              <Input id="cert-recipient" value={form.recipient} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, recipient: e.target.value }))} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="cert-programme">Programme</Label>
              <Input id="cert-programme" value={form.programme} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, programme: e.target.value }))} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="cert-date">Date issued</Label>
              <Input id="cert-date" type="date" max={todayIso()} value={form.issued_at} onChange={(e) => setForm((f) => ({ ...f, issued_at: e.target.value }))} className="mt-1.5" />
              <p className="mt-1.5 text-[13px] text-muted-foreground">Leave empty for today.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={issue} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Issue certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revoking} onOpenChange={(o) => !o && setRevoking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke {revoking?.public_id}?</DialogTitle>
            <DialogDescription>
              It stops verifying straight away: anyone who checks the reference sees “No matching certificate”. It stays in this list, and this cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevoking(null)}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={revoke} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
