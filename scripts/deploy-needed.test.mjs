import { describe, expect, it } from "vitest"
import { deployNeeded, deployNeededForRange } from "./deploy-needed.mjs"

describe("deployNeeded: does a push change what a release sends or how it is built?", () => {
  it("is false when only documents changed", () => {
    expect(deployNeeded(["docs/AUDIT.md", "README.md", ".agent/HANDOFF.md", "docs/sub/dir/NOTES.md"])).toBe(false)
  })

  it("treats any Markdown file as a document, as the old paths-ignore did", () => {
    expect(deployNeeded(["server/README.md", "src/marketing/NOTES.md"])).toBe(false)
  })

  it("is true when a source, server, script or config file changed", () => {
    for (const f of ["src/app/modules/Leads.tsx", "server/_ai.php", "scripts/release.mjs", "package.json", "release.json"]) {
      expect(deployNeeded([f]), f).toBe(true)
    }
  })

  it("is true for the workflow files and .gitignore, which the old paths-ignore did not exempt", () => {
    expect(deployNeeded([".github/workflows/ci.yml"])).toBe(true)
    expect(deployNeeded([".gitignore"])).toBe(true)
  })

  it("is true when documents and code changed together", () => {
    expect(deployNeeded(["docs/AUDIT.md", "server/_ai.php"])).toBe(true)
  })

  it("is false when nothing changed", () => {
    expect(deployNeeded([])).toBe(false)
  })

  it("does not treat a look-alike path as a document", () => {
    expect(deployNeeded(["src/docs/loader.ts"])).toBe(true)
    expect(deployNeeded(["notes.md.php"])).toBe(true)
    expect(deployNeeded(["agent/x.ts"])).toBe(true)
  })
})

describe("deployNeededForRange: the answer for a push from `before` to `sha`", () => {
  const ZERO = "0".repeat(40)
  const A = "a".repeat(40)
  const B = "b".repeat(40)
  const git = (out) => () => out

  it("reads the changed files between the two commits", () => {
    expect(deployNeededForRange(A, B, git("docs/A.md\nREADME.md\n"))).toBe(false)
    expect(deployNeededForRange(A, B, git("docs/A.md\nserver/x.php\n"))).toBe(true)
  })

  it("releases when the before commit is unknown (new branch, empty value)", () => {
    expect(deployNeededForRange(ZERO, B, git(""))).toBe(true)
    expect(deployNeededForRange("", B, git(""))).toBe(true)
    expect(deployNeededForRange(undefined, B, git(""))).toBe(true)
  })

  it("releases when git cannot compare the commits, rather than skipping a release by mistake", () => {
    const failing = () => { throw new Error("bad revision") }
    expect(deployNeededForRange(A, B, failing)).toBe(true)
  })

  it("rejects a value that is not a commit id, so nothing odd reaches git", () => {
    let called = false
    const spy = () => { called = true; return "" }
    expect(deployNeededForRange("main; rm -rf /", B, spy)).toBe(true)
    expect(called).toBe(false)
  })
})
