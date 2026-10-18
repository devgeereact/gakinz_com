import { cva } from "class-variance-authority"

export const badgeVariants = cva(
  // The prototype's `.b` (D-046): a 24px pill with a status dot in the
  // text colour. ok, warn, bad and acc are the semantic soft fills.
  "inline-flex min-h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-[9px] text-xs font-semibold before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-current before:content-['']",
  {
    variants: {
      variant: {
        default: "border-transparent bg-acc-soft text-acc",
        secondary: "border-border bg-secondary text-muted-foreground",
        destructive: "border-transparent bg-bad-soft text-bad",
        outline: "border-border bg-transparent text-foreground",
        ghost: "border-border bg-secondary text-muted-foreground",
        ok: "border-transparent bg-ok-soft text-ok",
        warn: "border-transparent bg-warn-soft text-warn",
        bad: "border-transparent bg-bad-soft text-bad",
        acc: "border-transparent bg-acc-soft text-acc",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
