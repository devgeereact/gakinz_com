import { Link } from "react-router-dom"
import { site, services } from "@/marketing/data/site"
import BrandMark from "./BrandMark"
import { Action } from "./primitives"

/**
 * The footer: the reference's warm-black surface, a large conversational
 * line with the enquiry action beside it, then the link columns.
 *
 * What was removed here earlier, and why it matters more than it looks:
 *
 *   - `© 2026` was hard-coded, not computed. Correct on the day it was
 *     written, wrong from 1 January 2027 onwards.
 *   - "Company registration number 00000000 (England & Wales)" shipped live.
 *     An all-zero registration number is not a real one, and it is exactly
 *     the detail a cautious buyer checks.
 *   - Four social icons linking to bare home pages. They now render only
 *     when `site.social` holds a real profile URL.
 *
 * The column headings are `<h2>` styled as labels, which is what they are.
 * Links are 44px tall on touch widths and relax to 32px where a pointer is
 * likely. Every focus ring in here flips to cream through the `bg-gk-ink`
 * descendant rule in index.css.
 */
const LINK =
  "inline-flex min-h-[2.75rem] items-center text-body text-gk-on-dark-soft transition-colors duration-150 hover:text-gk-on-dark sm:min-h-[2rem]"
const HEAD = "text-label font-bold uppercase text-gk-on-dark-soft"

export default function PublicFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-gk-ink text-gk-on-dark">
      <div className="mx-auto w-full max-w-[76rem] px-4 pb-24 pt-16 sm:px-8 md:pt-24 lg:px-12 lg:pb-32">
        <div className="grid gap-8 border-b border-gk-on-dark/20 pb-14 md:grid-cols-[1fr_auto] md:items-end md:gap-16">
          <p className="max-w-3xl font-display text-t2 font-medium text-gk-on-dark sm:text-t1">{site.line}</p>
          <div className="flex flex-wrap items-center gap-4">
            <Action to="/contact" variant="strong" onDark>
              Start a project
            </Action>
            <a className={LINK} href={`mailto:${site.contact.email}`}>
              {site.contact.email}
            </a>
          </div>
        </div>

        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="flex items-center gap-3 text-lede font-medium text-gk-on-dark">
              <BrandMark className="h-8 w-8 shrink-0" />
              {site.name}
            </p>
            <p className="mt-4 max-w-xs text-body text-gk-on-dark-soft">{site.studio.note}</p>
          </div>

          <div>
            <h2 className={HEAD}>What I do</h2>
            <ul className="mt-4 space-y-1">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link to={`/services/${s.slug}`} className={LINK}>
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={HEAD}>More</h2>
            <ul className="mt-4 space-y-1">
              {[
                { to: "/work", label: "Selected work" },
                { to: "/resources", label: "Writing" },
                { to: "/pricing", label: "Pricing" },
                { to: "/sectors", label: "Who I work with" },
                { to: "/contact", label: "Contact" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className={LINK}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={HEAD}>Contact</h2>
            <ul className="mt-4 space-y-1 text-body text-gk-on-dark-soft">
              <li>
                <a className={LINK} href={`mailto:${site.contact.email}`}>
                  {site.contact.email}
                </a>
              </li>
              {site.contact.phone && (
                <li>
                  <a className={LINK} href={`tel:${site.contact.phone.replace(/\s/g, "")}`}>
                    {site.contact.phone}
                  </a>
                </li>
              )}
              <li className="py-1">{site.contact.place}</li>
            </ul>

            {site.social.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
                {site.social.map((s) => (
                  <li key={s.url}>
                    <a className={LINK} href={s.url} target="_blank" rel="noreferrer noopener">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-gk-on-dark/20 pt-6 text-body text-gk-on-dark-soft sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name}
            {site.studio.registration ? ` · ${site.studio.registration}` : ""}
          </p>
          <ul className="flex flex-wrap gap-x-5">
            {[
              { to: "/privacy", label: "Privacy" },
              { to: "/terms", label: "Terms" },
              { to: "/cookies", label: "Cookies" },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className={LINK}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
