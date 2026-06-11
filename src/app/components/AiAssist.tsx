import { useState } from "react"
import { Sparkles, Loader2, Copy, RotateCw, Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ai } from "@/lib/api"

type Props = {
  task: string // short label, e.g. "lead_reply"
  title: string // dialog heading
  input: string // the content to act on
  system?: string // optional voice/instruction override
  label?: string // button text
  size?: "sm" | "default"
  variant?: "outline" | "ghost" | "default"
  onUse?: (text: string) => void // if set, shows a "Use" button that inserts the text
}

// Wraps ai.php for any module. Generates on open, lets the user copy, regenerate,
// or insert the result into the calling field.
export default function AiAssist({ task, title, input, system, label = "AI draft", size = "sm", variant = "outline", onUse }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    setLoading(true)
    setText("")
    const res = await ai.run(task, input, system)
    setLoading(false)
    if (res.ok) setText(res.data.text)
    else toast.error(res.error || "AI is not available. Add an OpenRouter key on the server.")
  }

  const openAndRun = () => {
    setOpen(true)
    setText("")
    generate()
  }

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={openAndRun}>
        <Sparkles className="mr-1.5 h-3.5 w-3.5" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> {title}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Drafting…
            </div>
          ) : (
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="text-sm" />
          )}

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={generate} disabled={loading}>
                <RotateCw className="mr-1.5 h-3.5 w-3.5" /> Regenerate
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={copy} disabled={!text}>
                {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            {onUse && (
              <Button
                type="button"
                size="sm"
                disabled={!text}
                onClick={() => {
                  onUse(text)
                  setOpen(false)
                }}
              >
                Use this
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
