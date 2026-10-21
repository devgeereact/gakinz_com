import { useState, type ReactNode } from "react"
import { useLoad, useLoader } from "@/hooks/use-load"
import { AlertCircle, Code2, ExternalLink, Github, Loader2, RefreshCw, Rocket, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader, StatusBadge } from "@/app/components/page-kit"
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

// The prototype shows a successful deploy as "Deployed".
const DEPLOY_LABEL: Record<Deploy["status"], string> = {
  success: "Deployed",
  failed: "Failed",
  rolled_back: "Rolled back",
}

function fmt(d: string) {
  return new Date(d.replace(" ", "T")).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

/** The prototype's `.card` with a `.card__h` title row and a `.card__b` body. */
function Panel({ title, extra, children, className }: { title: ReactNode; extra?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-2xl border bg-card", className)}>
      <div className="flex flex-wrap items-center gap-2.5 px-[18px] pb-3 pt-4">
        <h2 className="min-w-0 font-display text-[1.05rem] font-semibold tracking-[-0.01em] [overflow-wrap:anywhere]">{title}</h2>
        {extra && <div className="ml-auto">{extra}</div>}
      </div>
      <div className="px-[18px] pb-[18px]">{children}</div>
    </section>
  )
}

export default function DevPipeline() {
  const { data: rows, error, loading, reload: load } = useLoad<DevProjectRow[]>(() => dev.list(), [])
  const [selected, setSelected] = useState<DevProjectRow | null>(null)
  const [logOpen, setLogOpen] = useState(false)


  return (
    <div>
      <PageHeader
        title="Dev Pipeline"
        subtitle="Repos, environments, deploys and the build checklist, per project."
        actions={
          <>
            <Button onClick={() => setLogOpen(true)} disabled={!selected} title={selected ? undefined : "Pick a project first"}>
              <Rocket /> Log deploy
            </Button>
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Refresh
            </Button>
          </>
        }
      />

      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-start gap-3.5 rounded-2xl border border-bad/30 bg-bad-soft p-[18px] text-foreground">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-bad" />
          <div className="min-w-[min(100%,200px)] flex-1">
            <p className="font-semibold">Could not load the dev pipeline.</p>
            <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {error}. The dev endpoint and database must be live on the server.
            </p>
          </div>
          <Button variant="outline" onClick={load}>
            <RefreshCw /> Try again
          </Button>
        </div>
      )}

      {loading ? (
        <div role="status" className="grid gap-4">
          <Skeleton className="h-10 w-full max-w-[340px]" />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <Skeleton className="h-[260px] rounded-2xl" />
            <Skeleton className="h-[260px] rounded-2xl" />
          </div>
          <span className="sr-only">Loading projects…</span>
        </div>
      ) : rows.length === 0 ? (
        !error && (
          <div className="grid place-items-center gap-2.5 rounded-2xl border border-dashed border-line-strong bg-card px-5 py-14 text-center">
            <span aria-hidden className="grid h-12 w-12 place-items-center rounded-[14px] bg-acc-soft text-acc">
              <Code2 className="h-5 w-5" />
            </span>
            <h2 className="font-display text-[1.2rem] font-semibold">No projects yet</h2>
            <p className="max-w-[46ch] text-muted-foreground">Create a project first, then wire its repo and environments here.</p>
          </div>
        )
      ) : (
        <>
          <div className="mb-3.5 flex flex-wrap items-center gap-2">
            <div className="flex min-h-10 w-full min-w-0 max-w-[340px] items-center gap-2 rounded-[10px] border bg-card pl-3 focus-within:border-acc focus-within:shadow-[0_0_0_3px_hsl(var(--os-acc-soft))]">
              <span className="shrink-0 text-muted-foreground" aria-hidden>Project</span>
              <Select
                value={selected ? String(selected.id) : ""}
                onValueChange={(v) => setSelected(rows.find((r) => String(r.id) === v) ?? null)}
              >
                <SelectTrigger aria-label="Project" className="h-[38px] min-w-0 flex-1 border-0 bg-transparent focus:shadow-none">
                  <SelectValue placeholder="Pick a project" />
                </SelectTrigger>
                <SelectContent>
                  {rows.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} · {p.client_company || "Internal"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selected && (
              <span className="flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Github className="h-3.5 w-3.5" /> {selected.repo_url ? "Repo linked" : "No repo"}
                </span>
                <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                  <Rocket className="h-3.5 w-3.5" /> {selected.deploy_count} deploys
                </span>
              </span>
            )}
          </div>

          {selected ? (
            <ProjectPipeline key={selected.id} project={selected} onChanged={load} logOpen={logOpen} setLogOpen={setLogOpen} />
          ) : (
            <p className="rounded-2xl border border-dashed border-line-strong bg-card px-5 py-10 text-center text-muted-foreground">
              Pick a project to see its repo, environments, checklist and deploys.
            </p>
          )}
        </>
      )}
    </div>
  )
}

function ProjectPipeline({
  project,
  onChanged,
  logOpen,
  setLogOpen,
}: {
  project: DevProjectRow
  onChanged: () => void
  logOpen: boolean
  setLogOpen: (open: boolean) => void
}) {
  const [, setMeta] = useState<DevMeta | null>(null)
  const [deploys, setDeploys] = useState<Deploy[]>([])
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

  const { loading, reload: load } = useLoader(
    () => dev.get(project.id),
    (res) => {
      if (!res.ok) return
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
    },
    project.id,
  )

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
      setLogOpen(false)
      load()
      onChanged()
    } else toast.error(res.error || "Could not log the deploy.")
  }

  const done = CHECKS.filter((c) => checks[c.key]).length

  const logDialog = (
    <Dialog open={logOpen} onOpenChange={setLogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a deploy</DialogTitle>
          <DialogDescription>{project.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3.5">
          <div className="grid gap-1.5">
            <Label htmlFor="denv">Environment</Label>
            <Select value={env} onValueChange={(v) => setEnv(v as "staging" | "production")}>
              <SelectTrigger id="denv"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dres">Result</Label>
            <Select value={depStatus} onValueChange={setDepStatus}>
              <SelectTrigger id="dres"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="rolled_back">Rolled back</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="durl">URL</Label>
            <Input id="durl" type="url" value={depUrl} onChange={(e) => setDepUrl(e.target.value)} placeholder="Deploy URL (optional)" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dnotes">Notes</Label>
            <Input id="dnotes" value={depNotes} onChange={(e) => setDepNotes(e.target.value)} placeholder="Notes (optional)" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setLogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={addDeploy} disabled={deploying}>
            {deploying ? <Loader2 className="animate-spin" /> : <Rocket />}
            Log deploy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (loading) {
    return (
      <div role="status" className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Skeleton className="h-[260px] rounded-2xl" />
        <Skeleton className="h-[260px] rounded-2xl" />
        <span className="sr-only">Loading…</span>
        {logDialog}
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {logDialog}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Panel title="Repo & environments">
          <div className="grid gap-3.5">
            <div className="grid gap-1.5">
              <Label htmlFor="repo">Repository</Label>
              <Input id="repo" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="https://github.com/…" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="staging">Staging URL</Label>
              <Input id="staging" value={staging} onChange={(e) => setStaging(e.target.value)} placeholder="https://staging…" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="prod">Production URL</Label>
              <Input id="prod" value={prod} onChange={(e) => setProd(e.target.value)} placeholder="Set at launch" />
            </div>
            <div>
              <Button onClick={() => saveMeta()} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                Save
              </Button>
            </div>
          </div>
        </Panel>

        <Panel title="Build checklist">
          <div>
            {CHECKS.map((c) => (
              <label key={c.key} className="flex cursor-pointer items-center justify-between gap-4 border-t py-3 first:border-t-0">
                <span className="min-w-0 [overflow-wrap:anywhere]">{c.label}</span>
                <input
                  type="checkbox"
                  checked={!!checks[c.key]}
                  onChange={() => toggleCheck(c.key)}
                  className="h-5 w-5 shrink-0 cursor-pointer accent-[hsl(var(--os-acc))]"
                />
              </label>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-muted-foreground">
            <span className="font-mono tabular-nums">{done}</span> of {CHECKS.length} done
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Deploy log">
          {deploys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deploys logged yet. Log the first staging deploy to start the record.</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {deploys.map((d, i) => (
                <li key={d.id} className="grid grid-cols-[20px_minmax(0,1fr)] gap-2.5 py-2">
                  <span
                    aria-hidden
                    className={cn("ml-[5px] mt-1.5 h-[9px] w-[9px] rounded-full shadow-[0_0_0_3px_hsl(var(--card))]", i === 0 ? "bg-acc" : "bg-line-strong")}
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <b className="font-semibold capitalize">{d.environment}</b>
                      <StatusBadge status={d.status === "success" ? "deployed" : d.status}>{DEPLOY_LABEL[d.status]}</StatusBadge>
                      <small className="text-[12.5px] text-muted-foreground">{fmt(d.created_at)}</small>
                    </span>
                    {(d.notes || d.url) && (
                      <span className="mt-0.5 block text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
                        {d.notes}
                        {d.notes && d.url && " · "}
                        {d.url && (
                          <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-acc hover:underline">
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={
            <span className="inline-flex items-center gap-2">
              <Github className="h-4 w-4 shrink-0" /> GitHub{gh ? <span className="font-mono text-[13px] font-normal text-muted-foreground">{gh.repo}</span> : null}
            </span>
          }
          extra={gh?.run ? <StatusBadge status={gh.run.conclusion === "failure" ? "failed" : gh.run.conclusion || gh.run.status}>CI: {gh.run.conclusion || gh.run.status}</StatusBadge> : undefined}
        >
          {ghLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading from GitHub…</div>
          ) : ghError ? (
            <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{ghError}</p>
          ) : gh ? (
            <>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[.08em] text-muted-foreground">Recent commits</p>
              <div>
                {gh.commits.map((c) => (
                  <div key={c.sha} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t py-3 first:border-t-0">
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      {c.message}
                      <span className="text-xs text-muted-foreground"> · {c.author}</span>
                    </span>
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-muted-foreground hover:text-acc hover:underline">{c.sha}</a>
                  </div>
                ))}
                {gh.commits.length === 0 && <p className="py-2 text-sm text-muted-foreground">No commits.</p>}
              </div>
              <p className="mb-2 mt-3.5 font-mono text-[11px] uppercase tracking-[.08em] text-muted-foreground">Open PRs ({gh.pulls.length})</p>
              <div>
                {gh.pulls.map((p) => (
                  <div key={p.number} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t py-3 first:border-t-0">
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-acc hover:underline">#{p.number}</a> {p.title}
                    </span>
                    <span className="text-xs text-muted-foreground">{p.author}</span>
                  </div>
                ))}
                {gh.pulls.length === 0 && <p className="py-2 text-sm text-muted-foreground">No open PRs.</p>}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Add a GitHub repository above to see recent commits and open PRs.</p>
          )}
        </Panel>
      </div>
    </div>
  )
}
