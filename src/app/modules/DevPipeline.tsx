import { useEffect, useState } from "react"
import { Loader2, RefreshCw, ExternalLink, Save, Rocket, Github } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { dev, github, type DevProjectRow, type DevMeta, type Deploy, type GithubRepo } from "@/lib/api"
import { cn } from "@/lib/utils"

// Build / QA checklist keys (SEO + a11y + perf + cross-browser fundamentals).
const CHECKS: { key: string; label: string }[] = [
  { key: "performance", label: "Performance budget met" },
  { key: "accessibility", label: "Accessibility (WCAG AA)" },
  { key: "seo", label: "SEO fundamentals" },
  { key: "crossbrowser", label: "Cross-browser checked" },
  { key: "responsive", label: "Responsive on mobile/tablet" },
  { key: "prelaunch", label: "Pre-launch QA sign-off" },
]

const deployClass: Record<Deploy["status"], string> = {
  success: "bg-accent text-accent-foreground",
  failed: "bg-destructive/10 text-destructive",
  rolled_back: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
}

function fmt(d: string) {
  return new Date(d.replace(" ", "T")).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

export default function DevPipeline() {
  const [rows, setRows] = useState<DevProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<DevProjectRow | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await dev.list()
    if (res.ok) {
      setRows(res.data)
      setError(null)
    } else setError(res.error)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gk-app-grad text-2xl font-bold tracking-tight">Dev Pipeline</h1>
          <p className="text-sm text-muted-foreground">Repos, environments, deploys and the build checklist — per project.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error} — the dev endpoint and DB must be live on the server.
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading projects…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No projects yet. Create a project first, then wire its repo and environments here.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={cn(
                "rounded-xl border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-sm",
                selected?.id === p.id ? "border-primary ring-1 ring-primary" : "border-border",
              )}
            >
              <h3 className="font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.client_company || "Internal"}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Github className="h-3 w-3" /> {p.repo_url ? "linked" : "no repo"}</span>
                <span className="inline-flex items-center gap-1"><Rocket className="h-3 w-3" /> {p.deploy_count} deploys</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <ProjectPipeline key={selected.id} project={selected} onChanged={load} />}
    </div>
  )
}

function ProjectPipeline({ project, onChanged }: { project: DevProjectRow; onChanged: () => void }) {
  const [, setMeta] = useState<DevMeta | null>(null)
  const [deploys, setDeploys] = useState<Deploy[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [repo, setRepo] = useState("")
  const [staging, setStaging] = useState("")
  const [prod, setProd] = useState("")
  const [checks, setChecks] = useState<Record<string, boolean>>({})

  // Add-deploy form
  const [env, setEnv] = useState<"staging" | "production">("staging")
  const [depStatus, setDepStatus] = useState("success")
  const [depUrl, setDepUrl] = useState("")
  const [depNotes, setDepNotes] = useState("")
  const [deploying, setDeploying] = useState(false)

  // GitHub panel
  const [gh, setGh] = useState<GithubRepo | null>(null)
  const [ghLoading, setGhLoading] = useState(false)
  const [ghError, setGhError] = useState<string | null>(null)

  const loadGithub = async (url: string) => {
    if (!/github\.com/i.test(url)) { setGh(null); setGhError(null); return }
    setGhLoading(true)
    setGhError(null)
    const res = await github.repo(url)
    setGhLoading(false)
    if (res.ok) setGh(res.data)
    else { setGh(null); setGhError(res.error) }
  }

  const load = async () => {
    setLoading(true)
    const res = await dev.get(project.id)
    if (res.ok) {
      setMeta(res.data.meta)
      setDeploys(res.data.deploys)
      setRepo(res.data.meta?.repo_url ?? "")
      setStaging(res.data.meta?.staging_url ?? "")
      setProd(res.data.meta?.prod_url ?? "")
      try {
        setChecks(res.data.meta?.checklist ? JSON.parse(res.data.meta.checklist) : {})
      } catch {
        setChecks({})
      }
      if (res.data.meta?.repo_url) loadGithub(res.data.meta.repo_url)
      else setGh(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  const saveMeta = async (nextChecks?: Record<string, boolean>) => {
    setSaving(true)
    const res = await dev.saveMeta({
      project_id: project.id,
      repo_url: repo,
      staging_url: staging,
      prod_url: prod,
      checklist: nextChecks ?? checks,
    })
    setSaving(false)
    if (res.ok) {
      toast.success("Pipeline saved.")
      onChanged()
    } else toast.error(res.error || "Could not save.")
  }

  const toggleCheck = (key: string) => {
    const next = { ...checks, [key]: !checks[key] }
    setChecks(next)
    saveMeta(next)
  }

  const addDeploy = async () => {
    setDeploying(true)
    const res = await dev.deploy({ project_id: project.id, environment: env, status: depStatus, url: depUrl || undefined, notes: depNotes || undefined })
    setDeploying(false)
    if (res.ok) {
      toast.success("Deploy logged.")
      setDepUrl("")
      setDepNotes("")
      load()
      onChanged()
    } else toast.error(res.error || "Could not log the deploy.")
  }

  const done = CHECKS.filter((c) => checks[c.key]).length

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">{project.name} · pipeline</h2>
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {/* Environments */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Repo &amp; environments</h3>
            <div>
              <Label htmlFor="repo">Repository</Label>
              <Input id="repo" value={repo} onChange={(e) => setRepo(e.target.value)} className="mt-1.5" placeholder="https://github.com/…" />
            </div>
            <div>
              <Label htmlFor="staging">Staging URL</Label>
              <Input id="staging" value={staging} onChange={(e) => setStaging(e.target.value)} className="mt-1.5" placeholder="https://staging…" />
            </div>
            <div>
              <Label htmlFor="prod">Production URL</Label>
              <Input id="prod" value={prod} onChange={(e) => setProd(e.target.value)} className="mt-1.5" placeholder="https://…" />
            </div>
            <Button size="sm" onClick={() => saveMeta()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>

            <div className="pt-2">
              <h3 className="mb-2 text-sm font-semibold">Build checklist · {done}/{CHECKS.length}</h3>
              <ul className="space-y-1.5">
                {CHECKS.map((c) => (
                  <li key={c.key}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!checks[c.key]} onChange={() => toggleCheck(c.key)} className="h-4 w-4 rounded border-border" />
                      <span className={checks[c.key] ? "text-muted-foreground line-through" : ""}>{c.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Deploys */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Log a deploy</h3>
            <div className="flex flex-wrap gap-2">
              <Select value={env} onValueChange={(v) => setEnv(v as "staging" | "production")}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
              <Select value={depStatus} onValueChange={setDepStatus}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="rolled_back">Rolled back</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input value={depUrl} onChange={(e) => setDepUrl(e.target.value)} placeholder="Deploy URL (optional)" />
            <Input value={depNotes} onChange={(e) => setDepNotes(e.target.value)} placeholder="Notes (optional)" />
            <Button size="sm" onClick={addDeploy} disabled={deploying}>
              {deploying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
              Log deploy
            </Button>

            <div className="pt-2">
              <h3 className="mb-2 text-sm font-semibold">Deploy log</h3>
              {deploys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deploys logged yet.</p>
              ) : (
                <ul className="space-y-2">
                  {deploys.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      <span className="font-medium capitalize">{d.environment}</span>
                      <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", deployClass[d.status])}>{d.status.replace("_", " ")}</span>
                      {d.url && (
                        <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          link <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">{fmt(d.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* GitHub */}
          {(ghLoading || gh || ghError) && (
            <div className="lg:col-span-2 rounded-lg border border-border bg-muted/20 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Github className="h-4 w-4" /> GitHub{gh ? ` · ${gh.repo}` : ""}
                {gh?.run && (
                  <span className={cn(
                    "rounded px-1.5 py-0.5 text-xs font-medium",
                    gh.run.conclusion === "success" ? "bg-accent text-accent-foreground"
                      : gh.run.conclusion === "failure" ? "bg-destructive/10 text-destructive"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                  )}>
                    CI: {gh.run.conclusion || gh.run.status}
                  </span>
                )}
              </h3>
              {ghLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading from GitHub…</div>
              ) : ghError ? (
                <p className="text-sm text-muted-foreground">{ghError}</p>
              ) : gh ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent commits</p>
                    <ul className="space-y-1">
                      {gh.commits.map((c) => (
                        <li key={c.sha} className="text-sm">
                          <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-primary hover:underline">{c.sha}</a>{" "}
                          <span>{c.message}</span>
                          <span className="text-xs text-muted-foreground"> — {c.author}</span>
                        </li>
                      ))}
                      {gh.commits.length === 0 && <li className="text-sm text-muted-foreground">No commits.</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Open PRs ({gh.pulls.length})</p>
                    <ul className="space-y-1">
                      {gh.pulls.map((p) => (
                        <li key={p.number} className="text-sm">
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">#{p.number}</a>{" "}
                          {p.title}<span className="text-xs text-muted-foreground"> — {p.author}</span>
                        </li>
                      ))}
                      {gh.pulls.length === 0 && <li className="text-sm text-muted-foreground">No open PRs.</li>}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
