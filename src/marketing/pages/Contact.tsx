import { useEffect, useState } from "react"
import { Mail, MapPin, Clock, Loader2, CalendarClock } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { company, contactSteps } from "@/marketing/data/site"
import { contact, booking, type EnquiryPayload } from "@/lib/api"
import { PageHero, Section, SectionHeading } from "../components/primitives"
import FadeIn from "../components/FadeIn"

const projectTypes = ["New website", "Redesign", "Ecommerce", "Care & support", "Something else"]
const budgets = ["Under £5k", "£5k – £10k", "£10k – £25k", "£25k+", "Not sure yet"]

const empty: EnquiryPayload = {
  name: "",
  email: "",
  company: "",
  budget: "",
  projectType: "",
  message: "",
}

export default function Contact() {
  const [form, setForm] = useState<EnquiryPayload>(empty)
  const [sending, setSending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [bookUrl, setBookUrl] = useState("")

  // Discovery-call booking link (Calendly) — shown only when configured.
  useEffect(() => {
    booking.url().then((r) => r.ok && r.data.url && setBookUrl(r.data.url))
  }, [])

  const set = (k: keyof EnquiryPayload, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Tell us your name."
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = "Enter a valid email address."
    if (form.message.trim().length < 10) e.message = "A sentence or two about the project helps."
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setSending(true)
    const res = await contact.send(form)
    setSending(false)
    if (res.ok) {
      toast.success("Thanks — your enquiry is in. We will be in touch shortly.")
      setForm(empty)
    } else {
      toast.error(res.error || "Could not send right now. Please email us directly.")
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Tell us what you are building"
        intro="Send a few lines about your project. We will come back with a clear next step, not a hard sell."
      />
      {bookUrl && (
        <Section>
          <div className="gk-card flex flex-col items-center gap-4 rounded-2xl p-8 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarClock className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold">Prefer to talk it through?</h3>
                <p className="text-sm text-muted-foreground">Book a free 30-minute discovery call.</p>
              </div>
            </div>
            <Button asChild size="lg" className="gk-shine">
              <a href={bookUrl} target="_blank" rel="noopener noreferrer">Book a discovery call</a>
            </Button>
          </div>
        </Section>
      )}
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          {/* Details */}
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <div className="text-sm font-semibold">Email</div>
                <a className="text-sm text-muted-foreground hover:text-foreground" href={`mailto:${company.email}`}>
                  {company.email}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <div className="text-sm font-semibold">Where we are</div>
                <p className="text-sm text-muted-foreground">{company.address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <div className="text-sm font-semibold">Hours</div>
                <p className="text-sm text-muted-foreground">{company.hours}</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} noValidate className="gk-ring p-6 shadow-xl shadow-primary/5 sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  aria-invalid={!!errors.name}
                  className="mt-1.5"
                />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="sm:col-span-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  aria-invalid={!!errors.email}
                  className="mt-1.5"
                />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="company">Company (optional)</Label>
                <Input
                  id="company"
                  value={form.company}
                  onChange={(e) => set("company", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Project type</Label>
                <Select value={form.projectType} onValueChange={(v) => set("projectType", v)}>
                  <SelectTrigger className="mt-1.5" aria-label="Project type">
                    <SelectValue placeholder="Select one" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Budget</Label>
                <Select value={form.budget} onValueChange={(v) => set("budget", v)}>
                  <SelectTrigger className="mt-1.5" aria-label="Budget">
                    <SelectValue placeholder="Select a range" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgets.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="message">About the project</Label>
                <Textarea
                  id="message"
                  rows={5}
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                  aria-invalid={!!errors.message}
                  className="mt-1.5"
                />
                {errors.message && <p className="mt-1 text-xs text-destructive">{errors.message}</p>}
              </div>
            </div>
            <Button type="submit" size="lg" className="gk-shine mt-6 w-full shadow-md shadow-primary/20 sm:w-auto" disabled={sending}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {sending ? "Sending…" : "Send enquiry"}
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              No pushy follow-ups. Just a real reply from the team who'd do the work.
            </p>
          </form>
        </div>
      </Section>

      {/* What happens next */}
      <Section muted>
        <SectionHeading
          eyebrow="What happens next"
          title="From message to fixed price"
          intro="No black box. Here's exactly what follows once you hit send."
          center
        />
        <div className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-3">
          {contactSteps.map((step, i) => (
            <FadeIn key={step.title} delay={i * 0.05}>
              <div className="gk-card h-full p-6">
                <span className="font-serif text-3xl font-bold text-primary/30">{`0${i + 1}`}</span>
                <h3 className="mt-2 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.detail}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>
    </>
  )
}
