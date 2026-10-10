// Lint ratchet (plan A15). The backlog may shrink but never grow. Lower these
// numbers whenever the backlog falls, and delete this script once both are 0
// and `npm run lint` can be the gate on its own.
import { execFileSync } from "node:child_process"

const MAX_ERRORS = 47
const MAX_WARNINGS = 2

let out
try {
  out = execFileSync("npx", ["eslint", ".", "-f", "json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
} catch (e) {
  out = e.stdout // eslint exits 1 when problems exist; the JSON is still on stdout
}
const results = JSON.parse(out)
const errors = results.reduce((n, r) => n + r.errorCount, 0)
const warnings = results.reduce((n, r) => n + r.warningCount, 0)
console.log(`lint: ${errors} errors (max ${MAX_ERRORS}), ${warnings} warnings (max ${MAX_WARNINGS})`)
if (errors > MAX_ERRORS || warnings > MAX_WARNINGS) {
  console.error("Lint backlog grew. Fix the new problems before merging.")
  process.exit(1)
}
