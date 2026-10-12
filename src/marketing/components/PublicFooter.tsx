import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, ArrowUp, Mail, MapPin } from "lucide-react"
import { site } from "@/marketing/data/site"
import BrandMark from "./BrandMark"
import { actionClass } from "./action-class"

/**
 * The footer (D-047).
 *
 * Pattern taken from the 21st.dev "Newsletter Signup Footer" (Oliver, MIT),
 * as the owner chose: a light surface, the brand and one email field on the
 * left, three short link columns on the right, and a quiet bottom line with
 * square icon buttons. Rebuilt in the D-037 tokens.
 *
 * There is no newsletter, so the field is not a subscription: it starts an
 * enquiry. Submitting carries the address to /contact in router state (not
 * the URL, so it never lands in a server log) and the form there opens with
 * it filled in. Nothing is sent from the footer itself.
 *
 * Kept short on purpose: no column holds more than five links, and the
 * footer does not repeat every service. Must stay removed: a hard-coded
 * year, an invented registration number, and social links to bare home
 * pages (`site.social` renders only real profiles).
 */
const LINK =
  "inline-flex min-h-[2.75rem] items-center text-body text-gk-ink-soft transition-colors duration-150 hover:text-gk-ink sm:min-h-[2rem]"
const HEAD = "text-body font-bold text-gk-ink"

const COLUMNS = [
  {
    title: "Work",
    links: [
      { to: "/work", label: "Selected work" },
      { to: "/services", label: "Services" },
      { to: "/pricing", label: "Pricing" },
      { to: "/sectors", label: "Who I work with" },
    ],
  },
  {
    title: "Studio",
    links: [
      { to: "/about", label: "About" },
      { to: "/resources", label: "Writing" },
      { to: "/contact", label: "Contact" },
      { to: "/login", label: "Client login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/privacy", label: "Privacy" },
      { to: "/terms", label: "Terms" },
      { to: "/cookies", label: "Cookies" },
    ],
  },
]

export default function PublicFooter() {
  const year = new Date().getFullYear()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")

  const start = (e: FormEvent) => {
    e.preventDefault()
    navigate("/contact", { state: { email: email.trim() } })
  }

  return (
    <footer className="border-t border-gk-rule bg-gk-sunk">
      <div className="mx-auto w-full max-w-[76rem] px-4 pb-10 pt-16 sm:px-8 md:pt-20 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_2fr] lg:gap-16">
          <div className="max-w-md">
            <Link to="/" className="inline-flex min-h-[2.75rem] items-center gap-3">
              <BrandMark className="h-8 w-8 shrink-0 text-gk-ink" />
              <span className="text-lede font-bold tracking-[-0.01em] text-gk-ink">{site.studio.name}</span>
            </Link>
            <h2 className="mt-6 font-display text-t4 font-medium text-gk-ink">Have a project in mind?</h2>
            <p className="mt-2 text-body text-gk-ink-soft">
              Leave your email and the enquiry form opens with it filled in. A paragraph about the job is
              enough.
            </p>
            <form onSubmit={start} className="mt-5 flex flex-col gap-2 sm:flex-row">
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.co.uk"
                className="min-h-[2.75rem] w-full min-w-0 flex-1 rounded-action border border-gk-edge bg-gk-white px-4 text-body text-gk-ink"
              />
              <button type="submit" className={actionClass({ variant: "strong", className: "gk-arrow-link shrink-0" })}>
                Continue
                <ArrowRight aria-hidden className="gk-arrow h-4 w-4" />
              </button>
            </form>
            <p className="mt-3 text-[0.875rem] text-gk-ink-mute">
              {site.contact.replyIntent} See the{" "}
              <Link to="/privacy" className="underline underline-offset-2 hover:text-gk-ink">
                privacy notice
              </Link>
              .
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {COLUMNS.map((c) => (
              <div key={c.title}>
                <h2 className={HEAD}>{c.title}</h2>
                <ul className="mt-4 space-y-1">
                  {c.links.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className={LINK}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-gk-rule pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1 text-[0.875rem] text-gk-ink-mute sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
            <span>
              © {year} {site.name}
              {site.studio.registration ? ` · ${site.studio.registration}` : ""}
            </span>
            <a href={`mailto:${site.contact.email}`} className="inline-flex min-h-[2.75rem] items-center gap-2 hover:text-gk-ink sm:min-h-0">
              <Mail aria-hidden className="h-3.5 w-3.5" />
              {site.contact.email}
            </a>
            <span className="inline-flex items-center gap-2">
              <MapPin aria-hidden className="h-3.5 w-3.5" />
              {site.contact.place}
            </span>
          </div>
          <ul className="flex items-center gap-2">
            {site.social.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-action border border-gk-rule bg-gk-white px-3 text-[0.875rem] text-gk-ink-soft hover:text-gk-ink"
                >
                  {s.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#main"
                aria-label="Back to top"
                className="inline-flex h-11 w-11 items-center justify-center rounded-action border border-gk-rule bg-gk-white text-gk-ink-soft hover:text-gk-ink"
              >
                <ArrowUp aria-hidden className="h-4 w-4" />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
