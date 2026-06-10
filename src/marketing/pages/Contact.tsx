import { useState } from "react"
import { Mail, MapPin, Clock, Loader2 } from "lucide-react"
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
import { company } from "@/marketing/data/site"
import { contact, type EnquiryPayload } from "@/lib/api"
import { PageHero, Section } from "../components/primitives"

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
          <form onSubmit={onSubmit} noValidate className="rounded-xl border border-border bg-card p-6 sm:p-8">
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
                  <SelectTrigger className="mt-1.5">
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
                  <SelectTrigger className="mt-1.5">
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
            <Button type="submit" size="lg" className="mt-6 w-full sm:w-auto" disabled={sending}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {sending ? "Sending…" : "Send enquiry"}
            </Button>
          </form>
        </div>
      </Section>
    </>
  )
}
