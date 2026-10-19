import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { privacy, type Lead } from "@/lib/api"
import { ERASE_NOT_AVAILABLE, NOT_ERASED, confirmMatches, erasePreviewState, erasureOutcome, otherEnquiriesNote, type ErasePreviewState } from "@/app/modules/erasureModel"

/**
 * Erase one prospect's enquiry (privacy.php?action=erase_enquiry, super admin
 * only; the server checks the role whatever this screen shows). The button
 * stays disabled until the enquiry's email address is typed. The server
 * refuses, changing nothing, an enquiry that is linked to a client in any way,
 * and that reason is shown here.
 */
export function EraseEnquiryDialog({ lead, onClose, onErased }: { lead: Lead; onClose: () => void; onErased: (id: number) => void }) {
  const [typed, setTyped] = useState("")
  const [busy, setBusy] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)
  const [preview, setPreview] = useState<ErasePreviewState | null>(null)
  useEffect(() => {
    let live = true
    privacy.erasePreview(lead.id).then((res) => {
      if (live) setPreview(erasePreviewState(res))
    })
    return () => {
      live = false
    }
  }, [lead.id])
  const ready = confirmMatches(typed, lead.email)
  const others = preview?.kind === "ready" ? otherEnquiriesNote(preview.preview.other_enquiries) : null
  const blocked = preview?.kind === "ready" ? preview.preview.message : null

  const erase = async () => {
    if (!ready) return
    setBusy(true)
    setRefusal(null)
    const outcome = erasureOutcome(await privacy.eraseEnquiry(lead.id, typed))
    setBusy(false)
    if (outcome.kind === "erased") {
      toast.success("Enquiry erased.")
      onErased(lead.id)
      return
    }
    if (outcome.kind === "refused") return setRefusal(outcome.error)
    if (outcome.kind === "not_on_server") {
      toast.message(ERASE_NOT_AVAILABLE)
      return onClose()
    }
    toast.error(outcome.error || "Could not erase the enquiry.")
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Erase this enquiry for good?</DialogTitle>
          <DialogDescription>
            For an erasure request from someone who never became a client. This permanently deletes the enquiry from{" "}
            <span className="[overflow-wrap:anywhere]">{lead.name}</span>, its follow-up and any calls recorded on it, and replaces their
            email address and name with “[erased]” in the activity log. It cannot be undone. An enquiry linked to a client is refused.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-[13px] text-muted-foreground">
          {blocked && (
            <p role="alert" className="text-destructive">
              {blocked}
            </p>
          )}
          {others && <p>{others}</p>}
          <p className="mb-1 font-medium text-foreground">Not erased</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {NOT_ERASED.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void erase()
          }}
        >
          <Label htmlFor="erase-confirm">
            Type <span className="font-mono [overflow-wrap:anywhere]">{lead.email}</span> to confirm
          </Label>
          <Input
            id="erase-confirm"
            className="mt-1.5"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value)
              setRefusal(null)
            }}
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            aria-describedby={refusal ? "erase-refusal" : undefined}
          />
          {refusal && (
            <p id="erase-refusal" role="alert" className="mt-2 text-[13px] text-destructive">
              {refusal}
            </p>
          )}
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={!ready || busy || !!blocked}>
              {busy && <Loader2 className="animate-spin" />}
              Erase enquiry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
