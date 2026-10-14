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
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ai, content, blog, type ContentDraft } from "@/lib/api"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/app/components/page-kit"
import { EmptyState } from "@/app/components/EmptyState"

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
    if (!res.ok) return toast.error(res.error || "AI is unavailable. Check the OpenRouter key on the server.")
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
    if (res.ok) toast.success("Sent to Blog as a draft. Publish it there to go live.")
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
    <div>
      <PageHeader
        title="Content Hub"
        subtitle="Turn one idea into platform-ready drafts, with suggested keywords and hashtags. You edit before anything goes out."
        actions={
          <Button variant="outline" onClick={() => document.getElementById("saved-drafts")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            <Save /> Saved drafts
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          {/* Brief */}
          <section className="grid min-w-0 content-start gap-[14px] rounded-2xl border bg-card p-[18px]" aria-label="Brief">
            <div className="grid gap-1.5">
              <Label htmlFor="topic">Topic or idea</Label>
              <Textarea
                id="topic"
                rows={4}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Why a fast website wins more enquiries"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="aud">Audience</Label>
              <Input id="aud" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. clinic owners" />
            </div>
            <div className="grid gap-[14px] sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Professional", "Friendly", "Bold", "Plain"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Goal</Label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Awareness", "Leads", "Engagement", "Educate"].map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-1.5 text-[13.5px] font-semibold">Platforms</legend>
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
                      className="inline-flex min-h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full border bg-card px-3 text-[13px] font-medium transition-colors hover:border-line-strong aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
                    >
                      <Icon className="size-3.5" aria-hidden="true" /> {p.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Button onClick={generate} disabled={generating}>
                {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {generating ? "Generating…" : "Generate content"}
              </Button>
              <p className="min-w-[min(100%,14rem)] flex-1 text-[13px] text-muted-foreground">
                Keywords and hashtags are AI suggestions tuned to your brief. Review before publishing.
              </p>
            </div>
          </section>

          {/* Output */}
          <section className="min-w-0 rounded-2xl border bg-card p-[18px]" aria-live="polite" aria-label="Output">
            {generating ? (
              <div aria-busy="true" className="space-y-3 pt-1">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-3" />
                ))}
              </div>
            ) : !result ? (
              <p className="text-muted-foreground">Write a brief and generate to see platform-ready content here.</p>
            ) : (
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="mb-4 flex w-full">
                  {resultPlatforms.map((p) => (
                    <TabsTrigger key={p.id} value={p.id}>
                      {p.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {resultPlatforms.map((p) => {
                  const data = result.platforms[p.id]
                  const full = [data.title, data.body, (data.hashtags ?? []).join(" ")].filter(Boolean).join("\n\n")
                  return (
                    <TabsContent key={p.id} value={p.id} className="mt-0">
                      {/* font-sans, not font-serif. `serif` was remapped from Space
                          Grotesk (a sans-serif, despite the name) to Newsreader (an
                          actual serif) for the public relaunch. This is a CMS preview
                          and is not inside `.gk-public`, so it keeps the workspace's
                          own face. */}
                      {data.title && <h3 className="font-sans text-lg font-bold [overflow-wrap:anywhere]">{data.title}</h3>}
                      <p className="mt-2 whitespace-pre-wrap leading-relaxed text-foreground [overflow-wrap:anywhere]">{data.body}</p>
                      {data.hashtags?.length > 0 && (
                        <p className="mt-3 font-mono text-[13px] text-acc [overflow-wrap:anywhere]">{data.hashtags.join(" ")}</p>
                      )}
                      <div className="mt-[14px] flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => copy(full)}>
                          <Copy /> Copy
                        </Button>
                        <Button variant="outline" onClick={() => saveDraft(p.id)}>
                          <Save /> Save draft
                        </Button>
                        {p.id === "blog" && (
                          <Button onClick={() => sendToBlog(p.id)}>
                            <Send /> Send to Blog
                          </Button>
                        )}
                      </div>
                    </TabsContent>
                  )
                })}
                <div className="mt-5 grid gap-4 border-t pt-4">
                  <ChipBox title="Keywords" items={result.keywords} onCopy={() => copy(result.keywords.join(", "))} />
                  <ChipBox title="Hashtags" items={result.hashtags} onCopy={() => copy(result.hashtags.join(" "))} mono />
                </div>
              </Tabs>
            )}
          </section>
        </div>

        {/* Saved drafts */}
        <section id="saved-drafts" className="scroll-mt-24 pt-2">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="flex-1 font-display text-[1.1rem] font-semibold tracking-[-0.01em]">Saved drafts</h2>
            <Button variant="ghost" onClick={loadDrafts}>
              <RefreshCw /> Refresh
            </Button>
          </div>
          {draftsError ? (
            <div role="alert" className="flex flex-wrap items-start gap-3.5 rounded-2xl border border-bad/30 bg-bad-soft p-[18px] text-foreground">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-bad" aria-hidden="true" />
              <div className="min-w-[min(100%,200px)] flex-1">
                <p className="font-semibold">Saved drafts could not be loaded</p>
                <p className="mt-1 text-sm text-muted-foreground">{draftsError}. The content endpoint and database must be live on the server.</p>
              </div>
              <Button variant="outline" onClick={loadDrafts}>
                <RefreshCw /> Try again
              </Button>
            </div>
          ) : drafts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No saved drafts yet"
              description="Generate content and press Save draft to keep it here."
              className="rounded-2xl border border-dashed border-line-strong bg-card py-10"
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {drafts.map((d) => (
                <li key={d.id} className="flex min-w-0 flex-col rounded-2xl border bg-card p-[18px]">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary">{labelOf(d.platform)}</Badge>
                    <Button variant="ghost" size="sm" className="text-bad hover:text-bad" onClick={() => removeDraft(d)} aria-label="Delete draft" title="Delete draft">
                      <Trash2 />
                    </Button>
                  </div>
                  {d.title && <div className="mt-2 font-semibold [overflow-wrap:anywhere]">{d.title}</div>}
                  <p className="mt-1 line-clamp-3 flex-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">{d.body}</p>
                  <div className="mt-3">
                    <Button variant="outline" size="sm" onClick={() => copy([d.title, d.body, d.hashtags].filter(Boolean).join("\n\n"))}>
                      <Copy /> Copy
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function ChipBox({ title, items, onCopy, mono = false }: { title: string; items: string[]; onCopy: () => void; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11.5px] uppercase tracking-[.06em] text-muted-foreground">{title}</span>
        <Button variant="ghost" size="sm" onClick={onCopy} aria-label={`Copy ${title.toLowerCase()}`}>
          <Copy /> Copy
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((k) => (
          <span key={k} className={cn("rounded-full border bg-secondary px-2.5 py-1 text-xs [overflow-wrap:anywhere]", mono && "font-mono text-acc")}>
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
