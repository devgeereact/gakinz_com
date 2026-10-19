import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { UnsavedPrompt } from "@/hooks/use-unsaved-guard"

/** "Leave without saving?" prompt driven by `useUnsavedGuard().prompt`. */
export function UnsavedGuardDialog({ prompt }: { prompt: UnsavedPrompt }) {
  return (
    <Dialog open={prompt.open} onOpenChange={(o) => !o && prompt.onStay()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Leave without saving?</DialogTitle>
          <DialogDescription>You have changes that are not saved. If you leave now they are lost.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={prompt.onStay}>
            Stay
          </Button>
          <Button variant="destructive" onClick={prompt.onLeave}>
            Leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
