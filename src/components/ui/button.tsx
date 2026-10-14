import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // The prototype's `.btn` (D-046): a fixed height that never grows, one line
  // that never wraps, and a box that never shrinks below its label. A row of
  // buttons wraps instead (give the container flex-wrap).
  "inline-flex max-w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border text-sm font-semibold leading-[1.2] transition-[background-color,border-color,color,transform] active:scale-[.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // `.btn--p`: ink on canvas, blue on hover.
        default:
          "border-primary bg-primary text-primary-foreground hover:border-acc hover:bg-acc hover:text-acc-foreground",
        // `.btn--d`: a quiet button whose label carries the danger.
        destructive:
          "border-line-strong bg-card text-bad hover:border-bad",
        // `.btn`: surface with the stronger hairline.
        outline:
          "border-line-strong bg-card text-foreground hover:border-muted-foreground",
        secondary:
          "border-line-strong bg-secondary text-secondary-foreground hover:border-muted-foreground",
        // `.btn--g`: no box until hovered.
        ghost: "border-transparent bg-transparent hover:bg-secondary",
        link: "h-auto border-transparent px-0 text-acc underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-3.5",
        sm: "h-9 px-3 text-[13px]",
        lg: "h-12 px-5 text-[15px]",
        icon: "h-10 w-10 p-0 [&_svg]:size-[18px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
