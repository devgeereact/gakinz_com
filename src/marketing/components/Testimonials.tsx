import { useEffect, useState } from "react"
import { testimonials as testimonialsApi, type Testimonial } from "@/lib/api"

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
 * D-046: a band of quote cards built from src/marketing/site.css (`.quotes`),
 * in step with the post cards on the same page.
 *
 * BEHAVIOUR KEPT: the component renders nothing at all until the API returns
 * at least one approved testimonial. An absent section is correct here. An
 * invented quote, or a placeholder one, is not.
 */
export default function Testimonials({
  eyebrow = "In their words",
  title = "What clients say",
}: {
  eyebrow?: string
  title?: string
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
    <section className="sec wrap">
      <div className="sec__head">
        <div>
          <p className="eyebrow mono">{eyebrow}</p>
          <h2 className="h-l">{title}</h2>
        </div>
      </div>
      <ul className="quotes">
        {shown.map((t) => {
          const rating = Math.max(1, Math.min(5, t.rating))
          const attribution = [t.role, t.company].filter(Boolean).join(", ")
          return (
            <li key={t.id}>
              <figure className="quote">
                <blockquote>&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption>
                  <b>{t.author}</b>
                  {attribution && <span className="mute">{attribution}</span>}
                  <span className="mono mute" style={{ marginTop: 8 }}>
                    Rated {rating} out of 5
                  </span>
                </figcaption>
              </figure>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
