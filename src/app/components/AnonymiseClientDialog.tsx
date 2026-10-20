import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { privacy, type ClientAnonymisePreview } from "@/lib/api"
import { anonymiseOutcome, changesList, companyMatches } from "@/app/modules/anonymiseModel"

/**
 * Anonymise one former client (privacy.php?action=anonymise_client, super
 * admin only and switched off by default; the server checks both whatever this
 * screen shows). Opened only when the preview answered. The button stays
 * disabled until the company name is typed, and while the server lists a
 * reason to refuse.
 */
export function AnonymiseClientDialog({ preview, onClose, onDone }: { preview: ClientAnonymisePreview; onClose: () => void; onDone: () => void }) {
  const [typed, setTyped] = useState("")
  const [keepCompany, setKeepCompany] = useState(false)
  const [busy, setBusy] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)
  const blocked = preview.problems.length > 0
  const ready = companyMatches(typed, preview.company) && !blocked

  const run = async () => {
    if (!ready) return
    setBusy(true)
    setRefusal(null)
    const outcome = anonymiseOutcome(await privacy.anonymiseClient(preview.id, typed, keepCompany))
    setBusy(false)
    if (outcome.kind === "anonymised") {
      toast.success("Client anonymised.")
      return onDone()
    }
    if (outcome.kind === "refused") return setRefusal(outcome.error)
    toast.error(outcome.error)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anonymise this former client?</DialogTitle>
          <DialogDescription>
            For an erasure request from a client whose work is finished. Nothing is deleted except their sign-in sessions and links,
            but the personal details below are replaced for good. It cannot be undone. Any open portal message blocks it, the
            client&apos;s own data deletion request included, so resolve that request first.
          </DialogDescription>
        </DialogHeader>
        <div
          role="region"
          aria-label="What changes and what is kept"
          tabIndex={0}
          className="max-h-[45vh] space-y-3 overflow-y-auto rounded-md text-[13px] text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          {blocked && (
            <div role="alert" className="text-destructive">
              <p className="mb-1 font-medium">This client cannot be anonymised yet</p>
              <ul className="list-disc space-y-0.5 pl-5">
                {preview.problems.map((p) => (
                  <li key={p.reason}>{p.message}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="mb-1 font-medium text-foreground">What changes</p>
            <ul className="list-disc space-y-0.5 pl-5">
              {changesList(preview, keepCompany).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 font-medium text-foreground">What is kept, and why</p>
            <ul className="list-disc space-y-0.5 pl-5">
              {preview.kept.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void run()
          }}
        >
          <label className="mb-3 flex items-start gap-2 text-[13px]">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border"
              checked={keepCompany}
              onChange={(e) => setKeepCompany(e.target.checked)}
              disabled={busy}
            />
            <span>Keep the company name (only if it does not name a person, a sole trader for example)</span>
          </label>
          <Label htmlFor="anonymise-confirm">
            Type <span className="font-mono [overflow-wrap:anywhere]">{preview.company}</span> to confirm
          </Label>
          <Input
            id="anonymise-confirm"
            className="mt-1.5"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value)
              setRefusal(null)
            }}
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            aria-describedby={refusal ? "anonymise-refusal" : undefined}
          />
          {refusal && (
            <p id="anonymise-refusal" role="alert" className="mt-2 text-[13px] text-destructive">
              {refusal}
            </p>
          )}
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={!ready || busy}>
              {busy && <Loader2 className="animate-spin" />}
              Anonymise client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
