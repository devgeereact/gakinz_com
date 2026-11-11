#!/usr/bin/env node
// Runs the real server/.htaccess under Apache on this machine, over a copy of the built site, and checks
// the routing it decides: prerendered pages, the app shell, client-only records, the real 404 for an unknown
// address (V1.2 item 5), and the 404s it already gave. The release never uploads .htaccess, so this is how a
// change to it is proved before the owner applies it by hand (docs/DEPLOYMENT.md section 5).
//
//   pnpm run build && pnpm run check:htaccess
//
// What it starts, all on 127.0.0.1 and all stopped by pid before it exits:
//   /usr/sbin/httpd -X   port 5491, a temporary config: AllowOverride All, directory listing ON (as on the
//                        host, so the .htaccess has to be what stops it), *.php handed to PHP-FPM over FastCGI
//   php-fpm -F           port 5492, so the real server/notfound.php runs as it would on the host
// The document root is .local-test/htaccess-check/docroot: a copy of dist/, server/.htaccess and
// server/notfound.php. Every request sends `CF-RAY: local`, because the origin lock refuses a request without it.
//
// Exit 0 when every check passes, 1 when one fails, 2 (BLOCKED) when httpd or php-fpm is missing.
import { spawn, spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import net from "node:net"
import { join, relative, resolve, sep } from "node:path"

const ROOT = resolve(import.meta.dirname, "..")
const DIST = join(ROOT, "dist")
const WORK = join(ROOT, ".local-test", "htaccess-check")
const DOCROOT = join(WORK, "docroot")
const HTTP_PORT = 5491
const FPM_PORT = 5492
const BASE = `http://127.0.0.1:${HTTP_PORT}`
const HTTPD = process.env.GK_HTTPD ?? "/usr/sbin/httpd"
const MODULES = "/usr/libexec/apache2"
const FPM = process.env.GK_PHP_FPM ?? ["/opt/homebrew/sbin/php-fpm", "/usr/local/sbin/php-fpm"].find((p) => existsSync(p)) ?? whichOrNull("php-fpm")

function whichOrNull(cmd) {
  const r = spawnSync("which", [cmd], { encoding: "utf8" })
  return r.status === 0 ? r.stdout.trim() : null
}

if (!existsSync(HTTPD) || !existsSync(join(MODULES, "mod_rewrite.so"))) {
  console.log(`BLOCKED: Apache is not available here (${HTTPD}, ${MODULES}/mod_rewrite.so). Nothing was checked.`)
  process.exit(2)
}
if (!FPM) {
  console.log("BLOCKED: php-fpm is not available here (set GK_PHP_FPM to its path). Nothing was checked.")
  process.exit(2)
}
if (!existsSync(join(DIST, "index.html")) || !existsSync(join(DIST, "app-shell.html"))) {
  console.log("FAIL: dist/ has no built site. Run `pnpm run build` first.")
  process.exit(1)
}

/** Resolves true once nothing accepts a connection on the port. */
function portFree(port) {
  return new Promise((done) => {
    const s = net.connect(port, "127.0.0.1")
    s.once("connect", () => { s.destroy(); done(false) })
    s.once("error", () => done(true))
  })
}

async function waitUntil(test, ms, what) {
  const until = Date.now() + ms
  while (Date.now() < until) {
    if (await test()) return
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`timed out waiting for ${what}`)
}

for (const port of [HTTP_PORT, FPM_PORT]) {
  if (!(await portFree(port))) {
    console.log(`FAIL: port ${port} is already in use (lsof -nP -iTCP:${port} -sTCP:LISTEN). Nothing was started.`)
    process.exit(1)
  }
}

// The document root: what a release puts there, plus the .htaccess under test.
rmSync(WORK, { recursive: true, force: true })
mkdirSync(WORK, { recursive: true })
cpSync(DIST, DOCROOT, { recursive: true })
cpSync(join(ROOT, "server", ".htaccess"), join(DOCROOT, ".htaccess"))
if (existsSync(join(ROOT, "server", "notfound.php"))) cpSync(join(ROOT, "server", "notfound.php"), join(DOCROOT, "notfound.php"))

writeFileSync(
  join(WORK, "httpd.conf"),
  `ServerRoot "/usr"
ServerName 127.0.0.1
Listen 127.0.0.1:${HTTP_PORT}
PidFile "${WORK}/httpd.pid"
DefaultRuntimeDir "${WORK}"
Mutex file:${WORK} default
# One process (-X) serves one connection at a time, so no keep-alive holding it.
KeepAlive Off
ErrorLog "${WORK}/httpd-error.log"
LogLevel warn
LoadModule mpm_prefork_module ${MODULES}/mod_mpm_prefork.so
LoadModule unixd_module ${MODULES}/mod_unixd.so
LoadModule authz_core_module ${MODULES}/mod_authz_core.so
LoadModule mime_module ${MODULES}/mod_mime.so
LoadModule dir_module ${MODULES}/mod_dir.so
LoadModule autoindex_module ${MODULES}/mod_autoindex.so
LoadModule log_config_module ${MODULES}/mod_log_config.so
LoadModule env_module ${MODULES}/mod_env.so
LoadModule setenvif_module ${MODULES}/mod_setenvif.so
LoadModule headers_module ${MODULES}/mod_headers.so
LoadModule rewrite_module ${MODULES}/mod_rewrite.so
LoadModule proxy_module ${MODULES}/mod_proxy.so
LoadModule proxy_fcgi_module ${MODULES}/mod_proxy_fcgi.so
TypesConfig /private/etc/apache2/mime.types
DocumentRoot "${DOCROOT}"
DirectoryIndex index.html
# LiteSpeed on the host serves /work from work/index.html with no redirect (check:live: /work 200). Apache's
# mod_dir would add a slash first (301 to /work/) even though the .htaccess rewrites the path, so it is off here.
DirectorySlash Off
<Directory "${DOCROOT}">
  # Listing on, as it was on the host: the .htaccess, not this file, has to stop it.
  Options FollowSymLinks Indexes
  AllowOverride All
  Require all granted
</Directory>
<FilesMatch "\\.php$">
  SetHandler "proxy:fcgi://127.0.0.1:${FPM_PORT}"
</FilesMatch>
`,
)
writeFileSync(
  join(WORK, "php-fpm.conf"),
  `[global]
pid = ${WORK}/php-fpm.pid
error_log = ${WORK}/php-fpm.log
daemonize = no
[www]
listen = 127.0.0.1:${FPM_PORT}
pm = static
pm.max_children = 2
`,
)

const children = []
async function stopAll() {
  for (const { proc, port } of children) {
    try { proc.kill("SIGTERM") } catch { /* already gone */ }
    try { await waitUntil(() => portFree(port), 5_000, `port ${port} to close`) } catch {
      try { proc.kill("SIGKILL") } catch { /* already gone */ }
    }
  }
}
process.once("SIGINT", async () => { await stopAll(); process.exit(1) })

function start(cmd, args, port) {
  const proc = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] })
  let stderr = ""
  proc.stderr.on("data", (c) => (stderr += c))
  children.push({ proc, port })
  return () => stderr
}

const results = []
const check = (name, ok, detail) => results.push({ name, ok, detail })

try {
  const fpmErr = start(FPM, ["-F", "-y", join(WORK, "php-fpm.conf")], FPM_PORT)
  await waitUntil(async () => !(await portFree(FPM_PORT)), 10_000, `php-fpm on ${FPM_PORT}: ${fpmErr()}`)
  const httpdErr = start(HTTPD, ["-X", "-f", join(WORK, "httpd.conf")], HTTP_PORT)
  await waitUntil(async () => !(await portFree(HTTP_PORT)), 10_000, `httpd on ${HTTP_PORT}: ${httpdErr()}`)

  const get = async (path, headers = { "CF-RAY": "local" }) => {
    const r = await fetch(BASE + path, { headers, redirect: "manual", signal: AbortSignal.timeout(10_000) })
    return { status: r.status, headers: r.headers, body: await r.text() }
  }
  const expectStatus = async (path, status) => {
    const r = await get(path)
    check(`${path} answers ${status}`, r.status === status, `${path} ${r.status}`)
    return r
  }

  // Every prerendered page (each dist/<path>/index.html), the home page first.
  const pages = ["/"]
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (!statSync(full).isDirectory()) continue
      if (existsSync(join(full, "index.html"))) pages.push("/" + relative(DOCROOT, full).split(sep).join("/"))
      walk(full)
    }
  }
  walk(DOCROOT)
  const home = await get("/")
  check("/ answers 200", home.status === 200, `/ ${home.status}`)
  for (const p of pages.slice(1)) await expectStatus(p, 200)

  // Paths the browser app owns, and records published only in the CMS: still the app page, 200.
  // (/work and /services/web-design are prerendered pages, checked above.)
  for (const p of [
    "/services/a-service-only-in-the-cms", "/work/a-project-only-in-the-cms",
    "/resources/a-post-only-in-the-cms", "/login", "/login/factor-one", "/set-password", "/app", "/app/leads",
    "/p/abc", "/verify", "/verify/x",
    // The exemption matches the first segment case-insensitively, as before V1.2, so a mistyped capital keeps the app page.
    "/App/leads", "/Work/anything",
  ]) await expectStatus(p, 200)

  // An unknown address: a real 404 with the site's own not-found page and the public pages' policy.
  const homeCsp = home.headers.get("content-security-policy")
  check("/ sends the Content-Security-Policy", Boolean(homeCsp), homeCsp ? "present" : "missing")
  // /blog is not exempt: the app has no /blog route (posts publish under /resources), so an old /blog link is a real 404.
  for (const p of ["/definitely-not-a-page", "/definitely/not/a-page", "/workshop", "/blog/an-old-link"]) {
    const r = await get(p)
    check(`${p} answers 404`, r.status === 404, `${p} ${r.status}`)
    const built = r.body.includes("<title>Page not found") && r.body.includes('data-prerendered="/404"')
    check(`${p} shows the built not-found page`, built, built ? "dist/404.html" : `body starts ${JSON.stringify(r.body.slice(0, 80))}`)
    const csp = r.headers.get("content-security-policy")
    check(`${p} sends the same Content-Security-Policy as /`, Boolean(csp) && csp === homeCsp, csp ?? "missing")
    check(`${p} is noindex and no-store`, r.headers.get("x-robots-tag") === "noindex" && r.headers.get("cache-control") === "no-store",
      `x-robots-tag ${r.headers.get("x-robots-tag")}, cache-control ${r.headers.get("cache-control")}`)
  }

  // /404.html asked for by name is a real file, so the pass-through serves it with 200 (it is noindex in its own
  // markup and linked from nowhere); the CSP FilesMatch names it, so it carries the same policy as /.
  const named = await get("/404.html")
  check("/404.html by name answers 200 (a real file)", named.status === 200, `/404.html ${named.status}`)
  const namedCsp = named.headers.get("content-security-policy")
  check("/404.html by name sends the same Content-Security-Policy as /", Boolean(namedCsp) && namedCsp === homeCsp, namedCsp ?? "missing")

  // The 404s and refusals the file already gave.
  await expectStatus("/missing.php", 404)
  await expectStatus("/assets/", 404)
  const locked = await get("/", {})
  check("a request without CF-RAY is refused (origin lock)", locked.status === 403, `/ without CF-RAY ${locked.status}`)
} catch (e) {
  check("the local Apache run", false, e.message)
} finally {
  await stopAll()
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}: ${r.detail}`)
const failed = results.filter((r) => !r.ok).length
const stillOpen = []
for (const port of [HTTP_PORT, FPM_PORT]) if (!(await portFree(port))) stillOpen.push(port)
if (stillOpen.length) console.log(`FAIL  ports still in use after stopping: ${stillOpen.join(", ")}`)
console.log(`\n${results.length - failed} of ${results.length} checks passed (server/.htaccess under Apache ${BASE}, local copy of dist/).`)
process.exit(failed || stillOpen.length ? 1 : 0)
