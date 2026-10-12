import { Link } from "react-router-dom"
import { ArrowUp } from "lucide-react"
import { site } from "@/marketing/data/site"
import BrandMark from "./BrandMark"
import { StartProject } from "./PublicNavbar"

/**
 * The footer: the reference's warm-black surface, kept short.
 *
 * Pattern taken from the 21st.dev "Large Name Footer" (Spectrum UI, MIT): a
 * brand column with the one action, three short link columns, and the studio
 * name set very large at the foot, cut by the page edge. Rebuilt in the D-037
 * tokens with no new dependency; see DESIGN-SYSTEM 4.
 *
 * Deliberately short. The previous footer listed every service as well as
 * every page; a footer is a way out, not a second sitemap. No column holds
 * more than five links.
 *
 * What was removed earlier, and must stay removed:
 *   - a hard-coded `© 2026` (the year is computed);
 *   - "Company registration number 00000000", which is not a real number
 *     (`site.studio.registration` prints only when one exists);
 *   - social icons linking to bare home pages (`site.social` renders only
 *     real profile URLs).
 *
 * Column headings are `<h2>` styled as labels. Links are 44px tall on touch
 * widths and 32px where a pointer is likely. The wordmark is decorative and
 * hidden from assistive technology; it carries no information.
 */
const LINK =
  "inline-flex min-h-[2.75rem] items-center text-body text-gk-on-dark-soft transition-colors duration-150 hover:text-gk-on-dark sm:min-h-[2rem]"
const HEAD = "text-label font-bold uppercase text-gk-on-dark-soft"

const EXPLORE = [
  { to: "/work", label: "Work" },
  { to: "/services", label: "Services" },
  { to: "/pricing", label: "Pricing" },
  { to: "/resources", label: "Writing" },
  { to: "/about", label: "About" },
]

const LEGAL = [
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/cookies", label: "Cookies" },
]

export default function PublicFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="overflow-hidden bg-gk-ink text-gk-on-dark">
      <div className="mx-auto w-full max-w-[76rem] px-4 pt-16 sm:px-8 md:pt-24 lg:px-12">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-8">
          <div className="max-w-sm">
            <p className="flex items-center gap-3 text-lede font-medium text-gk-on-dark">
              <BrandMark className="h-8 w-8 shrink-0" />
              {site.studio.name}
            </p>
            <p className="mt-5 text-body text-gk-on-dark-soft">{site.line}</p>
            <StartProject onDark className="mt-8" />
          </div>

          <div>
            <h2 className={HEAD}>Explore</h2>
            <ul className="mt-4 space-y-1">
              {EXPLORE.map((l) => (
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
            <ul className="mt-4 space-y-1">
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
              <li className="py-2 text-body text-gk-on-dark-soft">{site.contact.place}</li>
              {site.social.map((s) => (
                <li key={s.url}>
                  <a className={LINK} href={s.url} target="_blank" rel="noreferrer noopener">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={HEAD}>Legal</h2>
            <ul className="mt-4 space-y-1">
              {LEGAL.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className={LINK}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-2 border-t border-gk-on-dark/20 pt-6 text-body text-gk-on-dark-soft sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name}
            {site.studio.registration ? ` · ${site.studio.registration}` : ""}
          </p>
          <a href="#main" className={`${LINK} gap-2`}>
            Back to top
            <ArrowUp aria-hidden className="h-4 w-4" />
          </a>
        </div>
      </div>

      <p
        aria-hidden
        className="gk-wordmark pointer-events-none mx-auto -mb-[0.18em] mt-6 max-w-[76rem] select-none px-4 text-center font-display font-medium leading-[0.8] tracking-[-0.05em] sm:px-8 lg:px-12"
      >
        {site.studio.name}
      </p>
    </footer>
  )
}
