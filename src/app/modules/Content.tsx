import { useEffect, useMemo, useState } from "react"
import {
  Loader2,
  Sparkles,
  Copy,
  Save,
  Send,
  Trash2,
  RefreshCw,
  FileText,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Music2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ai, content, blog, type ContentDraft } from "@/lib/api"
import { cn } from "@/lib/utils"

type PlatformId = "blog" | "linkedin" | "x" | "instagram" | "facebook" | "tiktok"
const PLATFORMS: { id: PlatformId; label: string; icon: typeof FileText }[] = [
  { id: "blog", label: "Blog post", icon: FileText },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin },
  { id: "x", label: "X / Twitter", icon: Twitter },
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "tiktok", label: "TikTok", icon: Music2 },
]
const labelOf = (id: string) => PLATFORMS.find((p) => p.id === id)?.label ?? id

type GenPlatform = { title?: string; body: string; hashtags: string[] }
type GenResult = { keywords: string[]; hashtags: string[]; platforms: Record<string, GenPlatform> }

const SYSTEM =
  "You are a senior content and social strategist for GAkinz, a UK web design & development studio. UK English, plain, credible, no hype. " +
  'Return ONLY minified JSON (no markdown fences) matching: {"keywords":["..."],"hashtags":["#..."],"platforms":{"<id>":{"title":"","body":"","hashtags":["#..."]}}}. ' +
  "Include ONLY the requested platform ids. Apply the brief's tone. Lengths: x ≤ 280 chars; linkedin 1-3 short paragraphs; instagram punchy caption with tasteful emoji; facebook warm 2-4 sentences; tiktok a hook line + short caption; blog a title plus a 4-6 paragraph article (paragraphs separated by blank lines). " +
  "keywords: 6-10 SEO keywords. hashtags: 8-15 relevant, mixing niche and high-reach. Never invent statistics, client names or testimonials."

function parseAI(text: string): GenResult {
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()
  const a = t.indexOf("{")
  const b = t.lastIndexOf("}")
  if (a >= 0 && b > a) t = t.slice(a, b + 1)
  return JSON.parse(t)
}

export default function Content() {
  const [topic, setTopic] = useState("")
  const [audience, setAudience] = useState("")
  const [tone, setTone] = useState("Professional")
  const [goal, setGoal] = useState("Awareness")
  const [selected, setSelected] = useState<PlatformId[]>(["blog", "linkedin", "x"])

  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<GenResult | null>(null)
  const [tab, setTab] = useState<string>("blog")

  const [drafts, setDrafts] = useState<ContentDraft[]>([])
  const [draftsError, setDraftsError] = useState<string | null>(null)

  const loadDrafts = async () => {
    const res = await content.list()
    if (res.ok) {
      setDrafts(res.data)
      setDraftsError(null)
    } else setDraftsError(res.error)
  }
  useEffect(() => {
    loadDrafts()
  }, [])

  const toggle = (id: PlatformId) =>
    setSelected((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]))

  const resultPlatforms = useMemo(
    () => (result ? PLATFORMS.filter((p) => result.platforms[p.id]) : []),
    [result],
  )

  const generate = async () => {
    if (!topic.trim()) return toast.error("Give it a topic or idea to work from.")
    if (selected.length === 0) return toast.error("Pick at least one platform.")
    setGenerating(true)
    const input = JSON.stringify({ topic: topic.trim(), audience: audience.trim() || "small businesses", tone, goal, platforms: selected })
    const res = await ai.run("content_hub", input, SYSTEM)
    setGenerating(false)
    if (!res.ok) return toast.error(res.error || "AI is unavailable — check the OpenRouter key on the server.")
    try {
      const parsed = parseAI(res.data.text)
      if (!parsed.platforms || Object.keys(parsed.platforms).length === 0) throw new Error("empty")
      setResult(parsed)
      setTab(resultFirst(parsed, selected))
      toast.success("Content generated.")
    } catch {
      toast.error("The model returned an unexpected format. Try again.")
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied to clipboard.")
    } catch {
      toast.error("Couldn't copy.")
    }
  }

  const saveDraft = async (id: string) => {
    if (!result) return
    const p = result.platforms[id]
    const res = await content.create({
      topic: topic.trim(),
      platform: id,
      title: p.title ?? "",
      body: p.body,
      hashtags: (p.hashtags ?? []).join(" "),
      keywords: result.keywords.join(", "),
    })
    if (res.ok) {
      toast.success("Saved to drafts.")
      loadDrafts()
    } else toast.error(res.error || "Could not save.")
  }

  const sendToBlog = async (id: string) => {
    if (!result) return
    const p = result.platforms[id]
    const res = await blog.create({
      title: p.title || topic.trim(),
      excerpt: p.body.split(/\n{2,}/)[0]?.slice(0, 280) ?? "",
      body: p.body,
      category: "Insight",
      cover: "article",
      status: "draft",
    })
    if (res.ok) toast.success("Sent to Blog as a draft — publish it there to go live.")
    else toast.error(res.error || "Could not create the blog draft.")
  }

  const removeDraft = async (d: ContentDraft) => {
    const res = await content.remove(d.id)
    if (res.ok) {
      setDrafts((xs) => xs.filter((x) => x.id !== d.id))
      toast.success("Draft deleted.")
    } else toast.error(res.error || "Could not delete.")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Sparkles className="h-6 w-6 text-[hsl(var(--primary))]" /> Content Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            One brief → on-brand content for every platform, with suggested keywords and hashtags.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        {/* Brief */}
        <div className="gk-app-card space-y-4 p-5">
          <div>
            <Label htmlFor="topic">Topic or idea</Label>
            <Textarea
              id="topic"
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1.5"
              placeholder="e.g. Why a fast website wins more enquiries"
            />
          </div>
          <div>
            <Label htmlFor="aud">Audience</Label>
            <Input id="aud" value={audience} onChange={(e) => setAudience(e.target.value)} className="mt-1.5" placeholder="e.g. clinic owners" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Professional", "Friendly", "Bold", "Plain"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Goal</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Awareness", "Leads", "Engagement", "Educate"].map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const Icon = p.icon
                const on = selected.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    aria-pressed={on}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      on
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" /> {p.label}
                  </button>
                )
              })}
            </div>
          </div>
          <Button className="w-full" onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {generating ? "Generating…" : "Generate content"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Keywords &amp; hashtags are AI suggestions tuned to your brief — review before publishing.
          </p>
        </div>

        {/* Output */}
        <div className="min-w-0">
          {!result ? (
            <div className="flex h-full min-h-[20rem] flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Sparkles className="mb-3 h-8 w-8 opacity-40" />
              Write a brief and generate to see platform-ready content here.
            </div>
          ) : (
            <div className="space-y-5">
              {/* keywords + hashtags */}
              <div className="grid gap-4 sm:grid-cols-2">
                <ChipBox title="Suggested keywords" items={result.keywords} onCopy={() => copy(result.keywords.join(", "))} />
                <ChipBox title="Suggested hashtags" items={result.hashtags} onCopy={() => copy(result.hashtags.join(" "))} mono />
              </div>

              {/* per-platform */}
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="flex flex-wrap">
                  {resultPlatforms.map((p) => {
                    const Icon = p.icon
                    return (
                      <TabsTrigger key={p.id} value={p.id} className="gap-1.5">
                        <Icon className="h-3.5 w-3.5" /> {p.label}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
                {resultPlatforms.map((p) => {
                  const data = result.platforms[p.id]
                  const full = [data.title, data.body, (data.hashtags ?? []).join(" ")].filter(Boolean).join("\n\n")
                  return (
                    <TabsContent key={p.id} value={p.id} className="mt-4">
                      <div className="gk-app-card p-5">
                        {data.title && <h3 className="font-serif text-lg font-bold">{data.title}</h3>}
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{data.body}</p>
                        {data.hashtags?.length > 0 && (
                          <p className="mt-3 text-sm font-medium text-[hsl(var(--primary))]">{data.hashtags.join(" ")}</p>
                        )}
                        <div className="mt-5 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => copy(full)}>
                            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => saveDraft(p.id)}>
                            <Save className="mr-1.5 h-3.5 w-3.5" /> Save draft
                          </Button>
                          {p.id === "blog" && (
                            <Button size="sm" onClick={() => sendToBlog(p.id)}>
                              <Send className="mr-1.5 h-3.5 w-3.5" /> Send to Blog
                            </Button>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  )
                })}
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Saved drafts */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Saved drafts</h2>
          <Button variant="ghost" size="sm" onClick={loadDrafts}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
        {draftsError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {draftsError} — the content endpoint and DB must be live on the server.
          </div>
        ) : drafts.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">No saved drafts yet.</div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.map((d) => (
              <li key={d.id} className="gk-app-card flex flex-col p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium capitalize">{labelOf(d.platform)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDraft(d)} aria-label="Delete draft">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {d.title && <div className="mt-2 text-sm font-semibold">{d.title}</div>}
                <p className="mt-1 line-clamp-3 flex-1 text-xs text-muted-foreground">{d.body}</p>
                <button onClick={() => copy([d.title, d.body, d.hashtags].filter(Boolean).join("\n\n"))} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--primary))]">
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ChipBox({ title, items, onCopy, mono = false }: { title: string; items: string[]; onCopy: () => void; mono?: boolean }) {
  return (
    <div className="gk-app-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
        <button onClick={onCopy} className="inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--primary))]">
          <Copy className="h-3 w-3" /> Copy
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {items.map((k) => (
          <span key={k} className={cn("rounded-full bg-muted px-2.5 py-1 text-xs", mono && "font-mono text-[hsl(var(--primary))]")}>
            {k}
          </span>
        ))}
      </div>
    </div>
  )
}

// Pick the first selected platform that actually came back, for the default tab.
function resultFirst(r: GenResult, selected: string[]): string {
  return selected.find((s) => r.platforms[s]) ?? Object.keys(r.platforms)[0] ?? "blog"
}
