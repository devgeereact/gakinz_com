import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { contact, booking, type EnquiryPayload } from "@/lib/api"
import Seo from "@/marketing/components/Seo"
import { IArrow, PageHead } from "@/marketing/components/site-ui"
import { enquiryServiceOptions, useSiteCopy } from "@/marketing/data/content"
import { whatHappensNext } from "@/marketing/data/site"

/**
 * Contact (D-046). The request shape sent to contact.send() is unchanged; the
 * enquiry lands in the CMS Enquiries board as before. Errors show under each
 * field and focus moves to the first one (WCAG 3.3.1, 2.4.3).
 *
 * The optional service choice offers the website's own service names plus
 * "Something else" (spec 7), and fills the enquiry's existing projectType
 * field, as a package carried from Pricing does. The budget bands are the
 * owner's to change and are left as they are.
 */

const BUDGETS = ["Under £1,500", "£1,500 to £3,500", "£3,500 to £6,000", "Over £6,000"]
const ORDER = ["name", "email", "message"] as const
type Field = (typeof ORDER)[number]
const EMPTY: EnquiryPayload = { name: "", email: "", company: "", budget: "", projectType: "", message: "" }
const RULES: Record<Field, (v: string) => boolean> = {
  name: (v) => v.trim().length > 1,
  email: (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()),
  message: (v) => v.trim().length >= 10,
}
const MSG: Record<Field, string> = {
  name: "Add your name so I know who to reply to.",
  email: "Add an email address I can reply to, like name@business.co.uk.",
  message: "Write a sentence or two about the business and what you need.",
}

export default function Contact() {
  const copy = useSiteCopy()
  const [form, setForm] = useState<EnquiryPayload>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<Field, boolean>>>({})
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState("")
  const [sentTo, setSentTo] = useState("")
  const [bookUrl, setBookUrl] = useState("")
  const [copied, setCopied] = useState("Copy")
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const code = useRef<HTMLElement>(null)

  // A pricing button links here with ?package=Name. Only a real package name is
  // accepted; it fills the enquiry's existing projectType field. Set after the
  // first render so the prerendered page and the hydrated one match.
  // A service page links here with ?service=slug the same way, and the choice
  // becomes that service's name.
  const [params] = useSearchParams()
  const pkg = params.get("package") ?? ""
  const svc = params.get("service") ?? ""
  // The package name carried from Pricing, if that is where the choice came
  // from. "Ecommerce" is both a package and a service, so the source decides
  // which note shows, not the value.
  const [fromPackage, setFromPackage] = useState("")
  useEffect(() => {
    // Deliberately after mount: reading the query during render would make the
    // prerendered HTML and the first client render differ (a hydration error).
    const service = copy.services.find((s) => s.slug === svc)?.title
    const chosen = service ?? (copy.packages.some((p) => p.name === pkg) ? pkg : "")
    if (!chosen) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((f) => (f.projectType ? f : { ...f, projectType: chosen }))
    setFromPackage((p) => p || (service ? "" : chosen))
  }, [pkg, svc, copy.packages, copy.services])
  const serviceOptions = enquiryServiceOptions(copy.services)
  const chosenType = form.projectType ?? ""
  const isPackage = chosenType !== "" && (chosenType === fromPackage || !serviceOptions.includes(chosenType))

  // Discovery-call link: shown only when the server has one configured.
  useEffect(() => {
    booking.url().then((r) => r.ok && r.data.url && setBookUrl(r.data.url))
  }, [])

  const set = (k: keyof EnquiryPayload, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const blur = (k: Field) => setErrors((e) => ({ ...e, [k]: form[k] !== "" && !RULES[k](String(form[k])) }))

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setSendError("")
    const found = Object.fromEntries(ORDER.map((k) => [k, !RULES[k](String(form[k]))])) as Record<Field, boolean>
    setErrors(found)
    const first = ORDER.find((k) => found[k])
    if (first) return ({ name: nameRef, email: emailRef, message: messageRef })[first].current?.focus()
    setSending(true)
    const res = await contact.send(form)
    setSending(false)
    if (res.ok) {
      setSentTo(form.name.trim().split(/\s+/)[0])
      setForm(EMPTY)
      setFromPackage("")
    } else {
      // A 4xx carries the server's own reason (a field it rejected, too many
      // tries). A 5xx or no reply at all gets the way round: email directly.
      const own = res.status !== undefined && res.status >= 400 && res.status < 500 ? res.error : ""
      setSendError(own || "I could not send that just now. Email me directly and it will reach me.")
    }
  }

  const copyEmail = () => {
    const pick = () => {
      if (code.current) window.getSelection()?.selectAllChildren(code.current)
      setCopied("Selected")
    }
    try {
      navigator.clipboard.writeText(copy.contact.email).then(() => setCopied("Copied"), pick)
    } catch {
      pick()
    }
  }

  const field = (k: Field, label: string, input: React.ReactNode) => (
    <div className="field" id={`f-${k}`} data-err={errors[k] ? "" : undefined}>
      <label htmlFor={k}>{label}</label>
      {input}
      <span className="err" id={`e-${k}`}>
        {MSG[k]}
      </span>
    </div>
  )

  return (
    <>
      <Seo title="Contact" description="Send a few lines about your project. I read every enquiry myself and aim to reply the next working day." path="/contact" />
      <PageHead
        crumbs={[[null, "Contact"]]}
        title={
          <>
            Tell me what the
            <br />
            site has to do.
          </>
        }
        lede="A paragraph is enough. If it is not something I should take on, I will say so and point you somewhere better."
      />
      <section className="sec wrap" style={{ paddingTop: 56 }}>
        <div className="contact">
          <div>
            {sentTo ? (
              <div className="done" role="status">
                <p className="mono" style={{ color: "var(--ok)", marginBottom: 10 }}>
                  Sent
                </p>
                <h2 className="h-m">Thanks, {sentTo}.</h2>
                <p className="mute" style={{ marginTop: 10 }}>
                  Your message is with me. {copy.contact.reply}
                </p>
              </div>
            ) : (
              <form className="form" onSubmit={submit} noValidate>
                <div className="row2">
                  {field("name", "Your name", <input id="name" ref={nameRef} autoComplete="name" required aria-invalid={errors.name || undefined} aria-describedby={errors.name ? "e-name" : undefined} value={form.name} onChange={(e) => set("name", e.target.value)} onBlur={() => blur("name")} />)}
                  {field("email", "Email", <input id="email" ref={emailRef} type="email" autoComplete="email" required aria-invalid={errors.email || undefined} aria-describedby={errors.email ? "e-email" : undefined} value={form.email} onChange={(e) => set("email", e.target.value)} onBlur={() => blur("email")} />)}
                </div>
                <div className="row2">
                  <div className="field">
                    <label htmlFor="biz">
                      Business <span>(optional)</span>
                    </label>
                    <input id="biz" autoComplete="organization" value={form.company} onChange={(e) => set("company", e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="budget">
                      Rough budget <span>(optional)</span>
                    </label>
                    <select id="budget" value={form.budget} onChange={(e) => set("budget", e.target.value)}>
                      <option value="">Not sure yet</option>
                      {BUDGETS.map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="service">
                    Service <span>(optional)</span>
                  </label>
                  <select id="service" value={isPackage ? "" : chosenType} onChange={(e) => {
                      setFromPackage("")
                      set("projectType", e.target.value)
                    }}>
                    <option value="">{isPackage ? "As the package below" : "Not sure yet"}</option>
                    {serviceOptions.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
                {field("message", "What do you need?", <textarea id="message" ref={messageRef} required maxLength={5000} aria-invalid={errors.message || undefined} aria-describedby={errors.message ? "e-message" : undefined} value={form.message} onChange={(e) => set("message", e.target.value)} onBlur={() => blur("message")} />)}
                {isPackage && (
                  <p className="mute">
                    About the {form.projectType} package.{" "}
                    <button type="button" className="link" style={{ background: "none", border: 0, padding: 0, font: "inherit", cursor: "pointer" }} onClick={() => {
                        setFromPackage("")
                        set("projectType", "")
                      }}>
                      Not that one
                    </button>
                  </p>
                )}
                {sendError && (
                  <p role="alert" style={{ color: "#FFA3A3" }}>
                    {sendError}
                  </p>
                )}
                <div>
                  <button className="btn btn--main" type="submit" disabled={sending}>
                    {sending ? "Sending…" : "Send enquiry"} {!sending && <IArrow />}
                  </button>
                </div>
                {/* Just-in-time notice at the point of collection (ICO, right to be informed). */}
                <p className="mute" style={{ fontSize: 14, maxWidth: "60ch" }}>
                  I use these details only to reply to you, and record the address the message came from to stop spam. More in the{" "}
                  <Link to="/privacy" style={{ textDecoration: "underline" }}>privacy policy</Link>.
                </p>
              </form>
            )}
          </div>
          <div>
            <p className="eyebrow mono">What happens next</p>
            <ol className="next-steps">
              {whatHappensNext.map((s) => (
                <li key={s.title}>
                  <b>{s.title}</b>
                  <span>{s.detail}</span>
                </li>
              ))}
            </ol>
            {bookUrl && (
              <p style={{ marginTop: 20 }}>
                <a className="link" href={bookUrl} target="_blank" rel="noreferrer noopener">
                  Or book a short call <IArrow />
                </a>
              </p>
            )}
            <p className="mute" style={{ marginTop: 28 }}>
              Prefer email? Copy the address:
            </p>
            <div className="copy">
              <code ref={code}>{copy.contact.email}</code>
              <button className="btn" type="button" onClick={copyEmail}>
                {copied}
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
