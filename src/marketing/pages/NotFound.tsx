import { Link, useLocation } from "react-router-dom"
import Seo from "@/marketing/components/Seo"
import { Action, Label, Measure } from "../components/primitives"

/**
 * The public 404.
 *
 * The outlined "404" that filled the top of this page was a decorative ghost
 * numeral eight times the size of the heading under it, in a violet that no
 * longer exists. It is gone with the rest of that idiom.
 *
 * It is now marked noindex. It was previously fully crawlable, so every
 * mistyped URL was a thin, duplicate, indexable page.
 *
 * The canonical reflects the URL that was actually requested rather than a
 * fixed /404, because this component also renders in place of a missing work
 * record or article, where the requested path is the useful one to report.
 *
 * It renders no landmark of its own: on the "*" route it sits inside
 * PublicLayout's <main>, and on a missing record it is returned from inside
 * the page that would have rendered there.
 */
export default function NotFound() {
  const { pathname } = useLocation()

  const elsewhere = [
    { to: "/work", title: "Selected work", note: "What I have built, and what it was for" },
    { to: "/services", title: "What I do", note: "Design, build, ecommerce and care" },
    { to: "/resources", title: "Writing", note: "Notes on designing and building the web" },
  ]

  return (
    <>
      <Seo
        title="Page not found"
        description="That address does not match a page on this site. Here is where the useful parts of it are."
        path={pathname}
        noIndex
      />

      <Measure className="py-16 sm:py-24">
        <div className="max-w-2xl">
          <Label>Error 404</Label>
          <h1 className="mt-5 font-display text-t2 font-normal text-gk-ink lg:text-t1">
            That page is not here.
          </h1>
          <p className="mt-6 text-lede text-gk-ink-soft">
            The address <span className="font-data text-body text-gk-ink">{pathname}</span> does not
            match anything on this site. It has either moved or it never existed.
          </p>
          <div className="mt-8">
            <Action to="/" variant="strong">
              Back to the home page
            </Action>
          </div>
        </div>

        <h2 className="mt-16 font-display text-t3 text-gk-ink">Or try one of these</h2>
        <ul className="mt-8 max-w-3xl border-t border-gk-edge">
          {elsewhere.map((item) => (
            <li key={item.to} className="border-b border-gk-edge">
              <Link
                to={item.to}
                className="group grid grid-cols-[2.5rem_1fr] items-baseline gap-4 py-5 hover:bg-gk-sunk sm:grid-cols-[3.5rem_1fr_auto] sm:gap-6"
              >
                <span className="font-data text-label text-gk-ink-mute" aria-hidden>
                  &rarr;
                </span>
                <span className="font-display text-t4 text-gk-ink group-hover:underline">
                  {item.title}
                </span>
                <span className="col-start-2 text-body text-gk-ink-soft sm:col-start-3 sm:text-right">
                  {item.note}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 max-w-2xl text-body text-gk-ink-soft">
          If you followed a link here from somewhere on this site, I would like to know.{" "}
          <Link to="/contact" className="text-gk-set underline hover:text-gk-ink">
            Tell me where it was
          </Link>
          .
        </p>
      </Measure>
    </>
  )
}
