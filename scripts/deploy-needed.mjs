// Decides whether a push to main should start a release. CI calls this after the checks pass.
// A push that changes only documents does not release, as the old `paths-ignore` rule said:
// anything under docs/ or .agent/, and any Markdown file. Everything else does, including the
// workflow files and .gitignore. When the comparison cannot be made, it releases: a release
// with nothing new to send is a no-op, but a skipped release would leave the site behind.
//
//   node scripts/deploy-needed.mjs <before-sha> <sha>     prints deploy=true or deploy=false
import { execFileSync } from "node:child_process"
import { pathToFileURL } from "node:url"

const DOCUMENT = [/^docs\//, /^\.agent\//, /\.md$/]
const COMMIT = /^[0-9a-f]{40}$/i

export function deployNeeded(files) {
  return files.some((f) => !DOCUMENT.some((rule) => rule.test(f)))
}

function gitChangedFiles(before, sha) {
  return execFileSync("git", ["diff", "--name-only", before, sha], { encoding: "utf8" })
}

export function deployNeededForRange(before, sha, changedFiles = gitChangedFiles) {
  const known = typeof before === "string" && COMMIT.test(before) && !/^0+$/.test(before)
  if (!known || typeof sha !== "string" || !COMMIT.test(sha)) return true
  try {
    return deployNeeded(changedFiles(before, sha).split("\n").filter(Boolean))
  } catch {
    return true
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [before, sha] = process.argv.slice(2)
  console.log(`deploy=${deployNeededForRange(before, sha)}`)
}
