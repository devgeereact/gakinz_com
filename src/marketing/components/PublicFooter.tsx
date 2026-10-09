import { Link } from "react-router-dom"
import { site, services } from "@/marketing/data/site"

/**
 * The footer.
 *
 * What was removed here, and why it matters more than it looks:
 *
 *   - `© 2026` was hard-coded, not computed. Correct on the day it was
 *     written, wrong from 1 January 2027 onwards.
 *   - "Company registration number 00000000 (England & Wales)" shipped live.
 *     An all-zero registration number is not a real one, and it is exactly
 *     the detail a cautious buyer checks.
 *   - Four social icons linking to https://linkedin.com/, https://x.com/,
 *     https://github.com/ and https://dribbble.com/ — four links to four home
 *     pages. They now render only when `site.social` holds a real profile URL,
 *     and the array is empty until one is supplied.
 *
 * The column headings were `<h2>` at the smallest size on the page, which
 * inverted the document hierarchy against page `<h3>`s rendered much larger.
 * They are now `<h2>` styled as labels, which is what they are.
 */
export default function PublicFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-gk-edge bg-gk-paper">
      <div className="mx-auto w-full max-w-[76rem] px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-lede text-gk-ink">{site.name}</p>
            <p className="mt-3 max-w-xs text-body text-gk-ink-soft">{site.line}</p>
            <p className="mt-3 max-w-xs text-body text-gk-ink-mute">{site.studio.note}</p>
          </div>

          <div>
            <h2 className="font-data text-label uppercase text-gk-ink-mute">What I do</h2>
            <ul className="mt-4 space-y-1">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link
                    to={`/services/${s.slug}`}
                    className="inline-flex min-h-[2rem] items-center text-body text-gk-ink-soft hover:text-gk-ink"
                  >
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-data text-label uppercase text-gk-ink-mute">More</h2>
            <ul className="mt-4 space-y-1">
              {[
                { to: "/work", label: "Selected work" },
                { to: "/resources", label: "Writing" },
                { to: "/pricing", label: "Pricing" },
                { to: "/sectors", label: "Who I work with" },
                { to: "/contact", label: "Contact" },
              ].map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="inline-flex min-h-[2rem] items-center text-body text-gk-ink-soft hover:text-gk-ink"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-data text-label uppercase text-gk-ink-mute">Contact</h2>
            <ul className="mt-4 space-y-1 text-body text-gk-ink-soft">
              <li>
                <a
                  className="inline-flex min-h-[2rem] items-center hover:text-gk-ink"
                  href={`mailto:${site.contact.email}`}
                >
                  {site.contact.email}
                </a>
              </li>
              {site.contact.phone && (
                <li>
                  <a
                    className="inline-flex min-h-[2rem] items-center hover:text-gk-ink"
                    href={`tel:${site.contact.phone.replace(/\s/g, "")}`}
                  >
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
                    <a
                      className="inline-flex min-h-[2.75rem] items-center text-body text-gk-ink-soft hover:text-gk-ink"
                      href={s.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-gk-edge pt-6 font-data text-label text-gk-ink-mute sm:flex-row sm:items-center sm:justify-between">
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
                <Link to={l.to} className="inline-flex min-h-[2rem] items-center hover:text-gk-ink">
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
