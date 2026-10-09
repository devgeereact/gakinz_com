import { useEffect, useState } from "react"
import { testimonials as testimonialsApi, type Testimonial } from "@/lib/api"
import { Label, Section } from "./primitives"

/**
 * CMS-curated client testimonials.
 *
 * RECORDED FINDING, now fixed: the star rating was a plain <div> carrying
 * `aria-label={`${t.rating} out of 5`}`, with five decorative <svg> stars
 * inside it. ARIA does not permit naming a generic element, so that label was
 * discarded by assistive technology and the rating reached sighted users only.
 * That is WCAG 1.1.1 Non-text Content and 4.1.2 Name, Role, Value.
 *
 * The fix is not a better label. The rating is now plain text that everybody
 * reads the same way, set in the record face beside the attribution, which
 * needs no ARIA at all and cannot regress. Five yellow glyphs were carrying
 * information that one short line of type carries better on a page built out
 * of type.
 *
 * Restyled from a two-column card grid to a ruled quote list, in keeping with
 * the ledger the rest of the site is built from.
 *
 * BEHAVIOUR KEPT: the component renders nothing at all until the API returns
 * at least one approved testimonial. An absent section is correct here. An
 * invented quote, or a placeholder one, is not.
 */
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
    <Section tone={muted ? "sunk" : "paper"}>
      <div className="pb-10">
        <Label>{eyebrow}</Label>
        <h2 className="mt-5 max-w-2xl font-display text-t2 text-gk-ink">{title}</h2>
      </div>

      <ul className="border-t border-gk-edge">
        {shown.map((t) => {
          const rating = Math.max(1, Math.min(5, t.rating))
          const attribution = [t.role, t.company].filter(Boolean).join(", ")
          return (
            <li key={t.id} className="border-b border-gk-edge">
              <figure className="grid gap-4 py-8 lg:grid-cols-[1fr_16rem] lg:gap-12">
                <blockquote className="max-w-3xl font-display text-t4 text-gk-ink">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="lg:pt-2">
                  <span className="block text-body text-gk-ink">{t.author}</span>
                  {attribution && (
                    <span className="mt-1 block text-body text-gk-ink-soft">{attribution}</span>
                  )}
                  <span className="mt-3 block font-data text-label uppercase text-gk-ink-mute">
                    Rated {rating} out of 5
                  </span>
                </figcaption>
              </figure>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
