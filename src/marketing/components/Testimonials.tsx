import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import { testimonials as testimonialsApi, type Testimonial } from "@/lib/api"
import { Section, RuleEyebrow } from "./primitives"
import FadeIn from "./FadeIn"

// CMS-curated client testimonials. Renders nothing until at least one approved
// testimonial exists — we never show placeholder or fabricated quotes.
export default function Testimonials({
  eyebrow = "In their words",
  title = "What clients say",
  muted = false,
}: {
  eyebrow?: string
  title?: string
  muted?: boolean
}) {
  const [items, setItems] = useState<Testimonial[]>([])

  useEffect(() => {
    let alive = true
    testimonialsApi.list().then((r) => {
      if (alive && r.ok) setItems(r.data)
    })
    return () => {
      alive = false
    }
  }, [])

  if (items.length === 0) return null
  const shown = items.slice(0, 6)

  return (
    <Section muted={muted}>
      <RuleEyebrow>{eyebrow}</RuleEyebrow>
      <h2 className="mt-4 max-w-2xl font-serif text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
        {title}
      </h2>
      {/* A lone last item spans both columns so an odd count never orphans. */}
      <div className="mt-10 grid border-t border-[hsl(var(--gk-indigo)/0.14)] sm:grid-cols-2 sm:gap-x-12 [&>*:last-child:nth-child(odd)]:sm:col-span-2">
        {shown.map((t, i) => (
          <FadeIn key={t.id} delay={i * 0.05}>
            <figure className="flex h-full flex-col border-b border-[hsl(var(--gk-indigo)/0.14)] py-7">
              <div className="flex gap-0.5 text-amber-400" aria-label={`${t.rating} out of 5`}>
                {Array.from({ length: Math.max(1, Math.min(5, t.rating)) }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 font-serif text-lg font-medium leading-snug tracking-tight sm:text-xl">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 text-sm">
                <span className="font-semibold text-foreground">{t.author}</span>
                {(t.role || t.company) && (
                  <span className="text-muted-foreground">
                    {" — "}
                    {[t.role, t.company].filter(Boolean).join(", ")}
                  </span>
                )}
              </figcaption>
            </figure>
          </FadeIn>
        ))}
      </div>
    </Section>
  )
}
