#!/usr/bin/env node
/**
 * Prerender the public site into dist/ (K-043, K-052, K-053).
 *
 * Runs after `vite build` (the browser bundle, dist/) and
 * `vite build --ssr src/entry-server.tsx --outDir dist-ssr` (the renderer).
 *
 *   dist/index.html            the template, read once, then overwritten by "/"
 *   dist/app-shell.html        the SPA shell: default head, empty #root
 *   dist/<path>/index.html     one page per path in prerenderPaths()
 *
 * Every page, the shell included, preloads the three Latin font files the first
 * screen is set in (withFontPreloads).
 *
 * The prerender makes no network request. Data hooks fetch only in effects,
 * which renderToString never runs, and fetch and XMLHttpRequest are replaced
 * below with functions that throw, so a future change that fetches during
 * render fails the build instead of quietly calling the live API.
 *
 * dist-ssr/ is deleted at the end: it is a build tool, not something to ship.
 */
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

const root = resolve(import.meta.dirname, "..")
const dist = join(root, "dist")
const ssrDir = join(root, "dist-ssr")

const offline = (what) => () => {
  throw new Error(`prerender: ${what} called during the build. The prerender must make no network request.`)
}
globalThis.fetch = offline("fetch")
globalThis.XMLHttpRequest = offline("XMLHttpRequest")

const ssr = await import(pathToFileURL(join(ssrDir, "entry-server.js")).href)

// The Latin files of the three faces the first screen is set in (D-046). A
// missing one is a warning, not a failure: the page still works, it only risks
// the font-swap shift again (K-052).
const FONTS = [/^bricolage-grotesque-latin-opsz-normal-.*\.woff2$/, /^hanken-grotesk-latin-wght-normal-.*\.woff2$/, /^jetbrains-mono-latin-wght-normal-.*\.woff2$/]
const assets = await readdir(join(dist, "assets"))
const fonts = FONTS.map((re) => assets.find((f) => re.test(f)))
fonts.forEach((f, i) => f || console.warn(`prerender: no font file matches ${FONTS[i]}, so it is not preloaded`))

const template = ssr.withFontPreloads(
  await readFile(join(dist, "index.html"), "utf8"),
  fonts.filter(Boolean).map((f) => `/assets/${f}`),
)

await writeFile(join(dist, "app-shell.html"), ssr.buildShell(template))

const paths = ssr.prerenderPaths()
for (const path of paths) {
  const markup = ssr.render(path)
  // Every listed path is a real page. A 404 here means the list and the
  // built-in content have drifted apart.
  if (markup.includes("<title>Page not found")) throw new Error(`prerender: ${path} rendered the 404 page`)
  const file = join(dist, ssr.outputFile(path))
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, ssr.buildPage(template, { path, markup }))
}

await rm(ssrDir, { recursive: true, force: true })
console.log(`prerender: ${paths.length} public pages and app-shell.html written to dist/`)
