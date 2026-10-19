import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { privacy } from "@/lib/api"
import { DELETION_NOT_AVAILABLE, deletionRequestOutcome } from "@/app/modules/erasureModel"

type State = { kind: "idle" } | { kind: "sent" } | { kind: "already_open"; message: string } | { kind: "not_on_server" }

/**
 * "Ask to delete my data" for a `client`-role user (docs/PRIVACY-READINESS.md
 * section 7). It sends one support ticket with fixed text; nothing is deleted
 * by it. The server takes the client from the token, so nothing here sends an
 * id, and it allows one open request per client.
 */
export function DeletionRequestCard({ email }: { email: string | null | undefined }) {
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [state, setState] = useState<State>({ kind: "idle" })

  const send = async () => {
    setSending(true)
    const outcome = deletionRequestOutcome(await privacy.requestDeletion())
    setSending(false)
    setConfirming(false)
    if (outcome.kind === "error") {
      toast.error(outcome.error || "Could not send your request.")
      return
    }
    setState(outcome)
    if (outcome.kind === "sent") toast.success("Request sent. GAkinz will reply by email.")
  }

  return (
    <Card aria-labelledby="account-data">
      <CardHeader className="flex-row items-center gap-2.5 space-y-0">
        <CardTitle id="account-data">Your data</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-[13.5px] text-muted-foreground">
          You can ask GAkinz to delete the personal data held about you and your account. Nothing is deleted straight away: GAkinz
          replies by email to confirm the request and explain what will be deleted and what may need to be kept.
        </p>
        <div className="mt-3.5" aria-live="polite">
          {state.kind === "sent" && (
            <p className="text-[13.5px]">Request sent. You can follow it in Messages, and GAkinz will reply by email.</p>
          )}
          {state.kind === "already_open" && <p className="text-[13.5px]">{state.message}</p>}
          {state.kind === "not_on_server" && <p className="text-[13.5px] text-muted-foreground">{DELETION_NOT_AVAILABLE}</p>}
          {state.kind === "idle" && (
            <Button variant="outline" onClick={() => setConfirming(true)}>
              <Trash2 /> Ask to delete my data
            </Button>
          )}
        </div>
      </CardContent>

      <Dialog open={confirming} onOpenChange={(o) => !o && !sending && setConfirming(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask GAkinz to delete your data?</DialogTitle>
            <DialogDescription>
              This sends GAkinz a request through Messages. Nothing is deleted yet. GAkinz will reply
              {email ? (
                <>
                  {" "}to <span className="font-mono [overflow-wrap:anywhere]">{email}</span>
                </>
              ) : null}{" "}
              to confirm who is asking, what will be deleted, and what may need to be kept, and why.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={send} disabled={sending}>
              {sending && <Loader2 className="animate-spin" />}
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
