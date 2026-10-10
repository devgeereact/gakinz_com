import { cn } from "@/lib/utils"

/**
 * Shared action styling for the public surface, so a native <button> (the
 * enquiry form) or a navigation link looks identical to `Action`. Kept out of
 * primitives.tsx so that file exports components only (fast refresh).
 *
 * Primary: the reference's Ink Pill, warm black with cream text, a 1.5px
 * edge of the same colour and a 20px radius. Secondary: the outlined pill,
 * white on cream. Both are at least 44px tall, well above the reference's
 * 6px vertical padding, for WCAG 2.5.8 and the 44px touch target. Only
 * colour changes on hover, in 150ms; nothing moves the target while it is
 * being activated (DESIGN-SYSTEM 10.5).
 */
export function actionClass({
  variant = "plain",
  onDark = false,
  className,
}: {
  variant?: "strong" | "plain"
  onDark?: boolean
  className?: string
}) {
  const base =
    "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-action border-[1.5px] px-6 py-2.5 text-body font-medium tracking-[-0.02em] transition-colors duration-150"
  const look =
    variant === "strong"
      ? onDark
        ? "border-gk-on-dark bg-gk-on-dark text-gk-ink hover:border-gk-white hover:bg-gk-white"
        : "border-gk-ink bg-gk-ink text-gk-on-dark hover:border-gk-ink-soft hover:bg-gk-ink-soft"
      : onDark
        ? "border-gk-on-dark text-gk-on-dark hover:bg-gk-on-dark hover:text-gk-ink"
        : "border-gk-ink bg-gk-white text-gk-ink hover:bg-gk-paper"
  return cn(base, look, className)
}
