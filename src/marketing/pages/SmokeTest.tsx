import { useEffect, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { smoke, type Item, API_BASE } from "@/lib/api"
import { PageHero, Section } from "../components/primitives"

// Build-order step 1: prove the React → api.php → MySQL pipe end to end.
export default function SmokeTest() {
  const [items, setItems] = useState<Item[]>([])
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await smoke.list()
    if (res.ok) {
      setItems(res.data)
      setError(null)
    } else {
      setError(res.error)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    const res = await smoke.add(name.trim())
    setBusy(false)
    if (res.ok) {
      setName("")
      load()
    } else {
      setError(res.error)
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Diagnostics"
        title="API smoke test"
        intro="Confirms the front end can read from and write to api.php on the server. For build verification only."
      />
      <Section>
        <div className="max-w-xl space-y-6">
          <div className="rounded-lg border border-border bg-card p-4 text-sm">
            <span className="text-muted-foreground">API base:</span>{" "}
            <code className="font-mono">{API_BASE || "(relative / same origin)"}</code>
          </div>

          <form onSubmit={add} className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New item name"
              aria-label="New item name"
            />
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
            <Button type="button" variant="outline" onClick={load} aria-label="Reload">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </form>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3 text-sm font-semibold">
              Items ({items.length})
            </div>
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                No items yet. Add one above to test the write path.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((it) => (
                  <li key={it.id} className="flex justify-between px-4 py-3 text-sm">
                    <span>{it.name}</span>
                    <span className="text-muted-foreground">{it.created_at}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>
    </>
  )
}
