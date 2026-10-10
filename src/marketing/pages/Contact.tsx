import { useEffect, useRef, useState } from "react"
import Seo from "@/marketing/components/Seo"
import { Action, PageHero, Section } from "@/marketing/components/primitives"
import { actionClass } from "@/marketing/components/action-class"
import { site, whatHappensNext } from "@/marketing/data/site"
import { contact, booking, type EnquiryPayload } from "@/lib/api"
import { cn } from "@/lib/utils"

/**
 * /contact: the enquiry form.
 *
 * This was the worst page in the static accessibility audit, and the fixes are
 * the point of the rebuild rather than a tidy-up after it:
 *
 *   - every error is now owned by an id, pointed at by the field's
 *     `aria-describedby`, and repeated in a `role="alert"` summary, so a
 *     screen-reader user hears what is wrong rather than only that something
 *     is (WCAG 3.3.1, 3.3.3).
 *   - the three fields validate() actually requires now carry `required` and a
 *     visible "Required" marker, and the ten-character minimum on the message
 *     is stated in a hint before submission rather than only after it
 *     (WCAG 3.3.2).
 *   - "Project type" and "Budget" are native selects, so their labels have a
 *     real `htmlFor` target. A Radix SelectTrigger is a button and cannot be
 *     one (WCAG 1.3.1, 4.1.2).
 *   - name, email and company carry autocomplete tokens (WCAG 1.3.5).
 *   - headings run h1 → h2 → h3 with no skip (WCAG 1.3.1).
 *   - a failed submission moves focus to the first invalid field (WCAG 2.4.3).
 *
 * The request shape sent to contact.send() is unchanged.
 *
 * Gone with the relaunch: the shadow-xl card, the gk-shine sweep on the submit
 * button, the violet icon set, the generated SiteMockup wireframe, and the
 * ghost numerals in "What happens next".
 */

const PROJECT_TYPES = ["New website", "Redesign", "Ecommerce", "Care and support", "Something else"]
const BUDGETS = ["Under £5k", "£5k to £10k", "£10k to £25k", "£25k and above", "Not sure yet"]

/** The fields validate() enforces, in the order they appear in the form. */
const REQUIRED_ORDER = ["name", "email", "message"] as const
type RequiredField = (typeof REQUIRED_ORDER)[number]

const LABELS: Record<RequiredField, string> = {
  name: "Name",
  email: "Email",
  message: "About the project",
}

const EMPTY: EnquiryPayload = {
  name: "",
  email: "",
  company: "",
  budget: "",
  projectType: "",
  message: "",
}

/** One control style for every input, select and textarea on the page. */
const CONTROL =
  "mt-2 block w-full min-h-[2.75rem] rounded-action border-[1.5px] bg-gk-white px-4 py-2.5 text-body text-gk-ink placeholder:text-gk-ink-mute"

function edge(invalid: boolean) {
  return invalid ? "border-gk-come" : "border-gk-edge"
}

/** Marks a field's status in the label. Metadata, so it takes the mute, not the oxide. */
function Marker({ children }: { children: string }) {
  return <span className="font-data text-label uppercase text-gk-ink-mute">{children}</span>
}

export default function Contact() {
  const [form, setForm] = useState<EnquiryPayload>(EMPTY)
  const [sending, setSending] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<RequiredField, string>>>({})
  const [sendError, setSendError] = useState("")
  const [sent, setSent] = useState(false)
  const [bookUrl, setBookUrl] = useState("")

  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const refs = { name: nameRef, email: emailRef, message: messageRef }

  // Discovery-call booking link. Shown only when the server has one configured;
  // an unconfigured integration answers 503 and the block simply never appears.
  useEffect(() => {
    booking.url().then((r) => r.ok && r.data.url && setBookUrl(r.data.url))
  }, [])

  const set = (k: keyof EnquiryPayload, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const validate = () => {
    const e: Partial<Record<RequiredField, string>> = {}
    if (!form.name.trim()) e.name = "Tell me your name."
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = "Enter an email address I can reply to."
    if (form.message.trim().length < 10) e.message = "Tell me a little about the project, in ten characters or more."
    setErrors(e)
    return e
  }

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setSendError("")
    setSent(false)

    const found = validate()
    const firstInvalid = REQUIRED_ORDER.find((k) => found[k])
    if (firstInvalid) {
      // WCAG 2.4.3. Without this the user is left at the submit button with no
      // idea which field the complaint belongs to.
      refs[firstInvalid].current?.focus()
      return
    }

    setSending(true)
    const res = await contact.send(form)
    setSending(false)
    if (res.ok) {
      setSent(true)
      setForm(EMPTY)
    } else {
      setSendError(res.error || "I could not send that just now. Email me directly and it will reach me.")
    }
  }

  const listed = REQUIRED_ORDER.filter((k) => errors[k])

  return (
    <>
      <Seo
        title="Contact"
        description="Send me a few lines about your project. I read every enquiry myself and aim to reply the next working day."
        path="/contact"
      />

      <PageHero
        eyebrow="Contact"
        breadcrumb="Contact"
        title="Tell me what the site has to do."
        intro="A paragraph about the business and what you need from it is enough to start. If it is not a job I should take on, I will say so and point you somewhere better."
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-[22rem_1fr] lg:gap-16">
          {/* ── Details ──────────────────────────────────────────────── */}
          <div className="min-w-0">
            <h2 className="font-display text-t3 text-gk-ink">How to reach me</h2>

            {/* Only real values appear. The previous site printed a telephone
                number of +44 20 0000 0000; site.contact.phone is null until a
                real one exists, and a null renders nothing at all. */}
            <dl className="mt-8 border-t border-gk-edge">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-gk-edge py-4">
                <dt className="font-data text-label uppercase text-gk-ink-mute">Email</dt>
                <dd className="text-body text-gk-ink">
                  <a className="hover:underline" href={`mailto:${site.contact.email}`}>
                    {site.contact.email}
                  </a>
                </dd>
              </div>
              {site.contact.phone && (
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-gk-edge py-4">
                  <dt className="font-data text-label uppercase text-gk-ink-mute">Telephone</dt>
                  <dd className="text-body text-gk-ink">
                    <a className="hover:underline" href={`tel:${site.contact.phone.replace(/\s+/g, "")}`}>
                      {site.contact.phone}
                    </a>
                  </dd>
                </div>
              )}
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-gk-edge py-4">
                <dt className="font-data text-label uppercase text-gk-ink-mute">Where</dt>
                <dd className="text-body text-gk-ink">{site.contact.place}</dd>
              </div>
            </dl>

            <p className="mt-6 max-w-prose text-body text-gk-ink-soft">{site.contact.replyIntent}</p>
            <p className="mt-4 max-w-prose text-body text-gk-ink-soft">
              {site.studio.note} Either way, the person who answers your first message is the person who
              does the work.
            </p>

            {bookUrl && (
              <div className="mt-10 border-t border-gk-edge pt-8">
                <h3 className="font-display text-t4 text-gk-ink">Rather talk it through?</h3>
                <p className="mt-3 text-body text-gk-ink-soft">
                  Twenty minutes on the business, what the site has to do, and who it is for. No charge,
                  and no obligation afterwards.
                </p>
                <div className="mt-5">
                  <Action href={bookUrl}>Book a call</Action>
                </div>
              </div>
            )}
          </div>

          {/* ── Form ─────────────────────────────────────────────────── */}
          <div className="min-w-0">
            <h2 className="font-display text-t3 text-gk-ink">Send an enquiry</h2>
            <p className="mt-4 max-w-prose text-body text-gk-ink-soft">
              Fields marked <Marker>Required</Marker> have to be filled in. The rest help me answer
              properly, and you can leave them alone.
            </p>

            <form onSubmit={onSubmit} noValidate aria-busy={sending} className="mt-8">
              {/* Assertive region. Rendered on every pass so the announcement
                  fires on the content change, not on the node insertion. */}
              <div role="alert">
                {listed.length > 0 && (
                  <div className="mb-8 rounded-action border-[1.5px] border-gk-come p-5">
                    <h3 className="font-display text-t4 text-gk-ink">There is a problem</h3>
                    <ul className="mt-3 space-y-2">
                      {listed.map((k) => (
                        <li key={k}>
                          <a className="text-body text-gk-come underline" href={`#${k}`}>
                            {LABELS[k]}: {errors[k]}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {sendError && (
                  <p className="mb-8 rounded-action border-[1.5px] border-gk-come p-5 text-body text-gk-come">{sendError}</p>
                )}
              </div>

              {/* Polite region for the outcome. A toast alone is transient and
                  easy to miss; this stays on the page. */}
              <div role="status">
                {sent && (
                  <p className="mb-8 rounded-action border-[1.5px] border-gk-set p-5 text-body text-gk-ink">
                    Thank you, your message is with me. {site.contact.replyIntent}
                  </p>
                )}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-body font-medium text-gk-ink">Name</span>
                    <Marker>Required</Marker>
                  </label>
                  <input
                    id="name"
                    ref={nameRef}
                    type="text"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "name-error" : undefined}
                    className={cn(CONTROL, edge(!!errors.name))}
                  />
                  {errors.name && (
                    <p id="name-error" className="mt-2 text-body text-gk-come">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-body font-medium text-gk-ink">Email</span>
                    <Marker>Required</Marker>
                  </label>
                  <input
                    id="email"
                    ref={emailRef}
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-hint email-error" : "email-hint"}
                    className={cn(CONTROL, edge(!!errors.email))}
                  />
                  <p id="email-hint" className="mt-2 text-body text-gk-ink-mute">
                    This is the only way I have to reply.
                  </p>
                  {errors.email && (
                    <p id="email-error" className="mt-2 text-body text-gk-come">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="company" className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-body font-medium text-gk-ink">Company</span>
                    <Marker>Optional</Marker>
                  </label>
                  <input
                    id="company"
                    type="text"
                    autoComplete="organization"
                    value={form.company}
                    onChange={(e) => set("company", e.target.value)}
                    className={cn(CONTROL, edge(false))}
                  />
                </div>

                <div>
                  <label htmlFor="projectType" className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-body font-medium text-gk-ink">Project type</span>
                    <Marker>Optional</Marker>
                  </label>
                  <select
                    id="projectType"
                    value={form.projectType}
                    onChange={(e) => set("projectType", e.target.value)}
                    className={cn(CONTROL, edge(false))}
                  >
                    <option value="">No preference yet</option>
                    {PROJECT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="budget" className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-body font-medium text-gk-ink">Budget</span>
                    <Marker>Optional</Marker>
                  </label>
                  <select
                    id="budget"
                    value={form.budget}
                    onChange={(e) => set("budget", e.target.value)}
                    className={cn(CONTROL, edge(false))}
                  >
                    <option value="">Not sure yet</option>
                    {BUDGETS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="message" className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-body font-medium text-gk-ink">About the project</span>
                    <Marker>Required</Marker>
                  </label>
                  <textarea
                    id="message"
                    ref={messageRef}
                    rows={6}
                    required
                    minLength={10}
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    aria-invalid={!!errors.message}
                    aria-describedby={errors.message ? "message-hint message-error" : "message-hint"}
                    className={cn(CONTROL, edge(!!errors.message))}
                  />
                  <p id="message-hint" className="mt-2 text-body text-gk-ink-mute">
                    Ten characters at the very least, though a sentence or two about what the site has to
                    do is far more use to me.
                  </p>
                  {errors.message && (
                    <p id="message-error" className="mt-2 text-body text-gk-come">
                      {errors.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-6">
                <button
                  type="submit"
                  disabled={sending}
                  className={actionClass({ variant: "strong", className: "disabled:cursor-not-allowed disabled:opacity-60" })}
                >
                  {sending ? "Sending" : "Send enquiry"}
                </button>
                <p className="text-body text-gk-ink-soft">No follow-up sequence. One reply, from me.</p>
              </div>
            </form>
          </div>
        </div>
      </Section>

      {/* ── What happens next ──────────────────────────────────────────── */}
      <Section tone="sunk">
        <div className="grid gap-6 pb-10 md:grid-cols-[1fr_24rem] md:items-end">
          <h2 className="font-display text-t2 text-gk-ink">What happens next</h2>
          <p className="text-body text-gk-ink-soft">
            Three steps, all of them mine to keep. No queue, no account manager, and no work begins
            before you have a number in writing.
          </p>
        </div>
        <ol className="grid gap-x-10 gap-y-10 border-t border-gk-edge pt-10 sm:grid-cols-3">
          {whatHappensNext.map((step, i) => (
            <li key={step.title}>
              <span className="font-data text-label text-gk-ink-mute">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-display text-t4 text-gk-ink">{step.title}</h3>
              <p className="mt-3 text-body text-gk-ink-soft">{step.detail}</p>
            </li>
          ))}
        </ol>
      </Section>
    </>
  )
}
