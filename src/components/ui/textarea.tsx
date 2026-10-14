import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[110px] w-full min-w-0 rounded-[10px] border border-input bg-card px-3 py-[9px] text-base transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-acc focus-visible:shadow-[0_0_0_3px_hsl(var(--os-acc-soft))] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
