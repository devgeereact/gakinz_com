// Documentation check (AGENTS.md, "Keeping documents current").
//
//   node scripts/docs-check.mjs                     links and the temporary-folder rule
//   node scripts/docs-check.mjs --base origin/main  also the change-to-document rule
//   DOCS_CHECK_BASE=origin/main node scripts/docs-check.mjs
//
// (a) Every relative Markdown link in the root *.md, docs/*.md, qa/*.md,
//     server/README.md and .agent/*.md resolves to a file or folder, and none
//     points into the owner's temporary planning folder under docs/.
// (b) No file outside that folder names it.
// (c) With a base ref: if server PHP or server/.htaccess changed, docs/DEPLOYMENT.md
//     changed too; if server/schema.sql changed, docs/DATA-MODEL.md and
//     docs/DEPLOYMENT.md changed too. Changes are `git diff <base>...HEAD`, plus
//     any uncommitted or untracked files, so a local run sees work in progress.
//
// Node built-ins only. Exits 1 on any failure.
import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
// Built from parts so this script does not trip check (b) on itself.
const PLAN_NAME = ["Plans", "2026"].join(" ")
const PLAN_DIR = join(ROOT, "docs", PLAN_NAME)

const failures = []
const fail = (msg) => failures.push(msg)
const rel = (p) => relative(ROOT, p).split(sep).join("/")
const inPlanDir = (abs) => abs === PLAN_DIR || abs.startsWith(PLAN_DIR + sep)

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
}

// ── (a) Relative links ─────────────────────────────────────────────────────────
function mdFilesIn(dir) {
  const abs = join(ROOT, dir)
  if (!existsSync(abs)) return []
  return readdirSync(abs)
    .filter((f) => f.endsWith(".md"))
    .map((f) => join(abs, f))
    .filter((p) => statSync(p).isFile())
}

const sources = [
  ...mdFilesIn("."),
  ...mdFilesIn("docs"),
  ...mdFilesIn("qa"),
  ...mdFilesIn(".agent"),
  join(ROOT, "server", "README.md"),
].filter((p) => existsSync(p) && !inPlanDir(p))

// Code is not a link: drop fenced blocks and inline code spans before scanning.
function stripCode(text) {
  return text.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, "").replace(/`[^`\n]*`/g, "")
}

const LINK = /!?\[(?:[^\]\\]|\\.)*\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g

let linkCount = 0
for (const file of sources) {
  const text = stripCode(readFileSync(file, "utf8"))
  for (const m of text.matchAll(LINK)) {
    let target = m[1].replace(/^<|>$/g, "")
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#") || target.startsWith("//")) continue
    target = target.split("#")[0].split("?")[0]
    if (target === "") continue
    let decoded = target
    try {
      decoded = decodeURIComponent(target)
    } catch {
      // leave it as written
    }
    linkCount++
    const abs = decoded.startsWith("/") ? join(ROOT, decoded) : resolve(dirname(file), decoded)
    if (inPlanDir(abs)) {
      fail(`${rel(file)}: links into the temporary planning folder (${target}). Point to the canonical document instead.`)
    } else if (!existsSync(abs)) {
      fail(`${rel(file)}: broken link "${target}" (resolves to ${rel(abs)}, which does not exist).`)
    }
  }
}

// ── (b) Nothing names the temporary folder ────────────────────────────────────
const files = git(["ls-files", "-z", "--cached", "--others", "--exclude-standard"])
  .split("\0")
  .filter(Boolean)
  .filter((f) => !inPlanDir(join(ROOT, f)))
for (const f of files) {
  const abs = join(ROOT, f)
  if (!existsSync(abs) || !statSync(abs).isFile()) continue
  const buf = readFileSync(abs)
  if (buf.includes(0)) continue // binary
  if (buf.toString("utf8").includes(PLAN_NAME)) {
    fail(`${f}: names the temporary planning folder. Nothing outside it may reference it; cite the canonical document.`)
  }
}

// ── (c) Change-to-document rule ───────────────────────────────────────────────
const argIdx = process.argv.indexOf("--base")
const base = (argIdx !== -1 ? process.argv[argIdx + 1] : process.env.DOCS_CHECK_BASE) || ""
let changedSummary = "skipped (no --base given)"
if (argIdx !== -1 && !process.argv[argIdx + 1]) {
  fail("--base needs a ref, for example --base origin/main.")
} else if (base) {
  try {
    git(["rev-parse", "--verify", "--quiet", `${base}^{commit}`])
  } catch {
    fail(`Base ref "${base}" does not resolve. In CI, check out with fetch-depth: 0.`)
  }
  if (!failures.some((f) => f.startsWith("Base ref"))) {
    const changed = new Set(
      [
        ...git(["diff", "--name-only", `${base}...HEAD`]).split("\n"),
        ...git(["diff", "--name-only", "HEAD"]).split("\n"),
        ...git(["ls-files", "--others", "--exclude-standard"]).split("\n"),
      ].filter(Boolean),
    )
    const serverCode = [...changed].filter((f) => /^server\/[^/]+\.php$/.test(f) || f === "server/.htaccess")
    const schema = changed.has("server/schema.sql")
    const need = (doc, why) => {
      if (!changed.has(doc)) fail(`${why} changed, so ${doc} must change in the same pull request. Missing: ${doc}.`)
    }
    if (serverCode.length) need("docs/DEPLOYMENT.md", `Server code (${serverCode.join(", ")})`)
    if (schema) {
      need("docs/DATA-MODEL.md", "server/schema.sql")
      need("docs/DEPLOYMENT.md", "server/schema.sql")
    }
    changedSummary = `${changed.size} changed file(s) against ${base}; server code ${serverCode.length}, schema ${schema ? "yes" : "no"}`
  }
}

// ── Report ─────────────────────────────────────────────────────────────────────
console.log(`docs:check: ${sources.length} documents, ${linkCount} relative links, ${files.length} files scanned`)
console.log(`docs:check: sync rule ${changedSummary}`)
if (failures.length) {
  for (const f of failures) console.error(`  FAIL ${f}`)
  console.error(`docs:check: ${failures.length} problem(s). See AGENTS.md, "Keeping documents current".`)
  process.exit(1)
}
console.log("docs:check: PASS")
