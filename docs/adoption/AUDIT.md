# CLAUDE.md claim audit — gakinz.com

Audited on 2026-09-04 against the working tree at `chore/gee-os-adoption` (`065a234`).
Method: source inspection plus a local build, test and lint run. No live server, live
database, DNS or hosting panel was contacted, so every claim about server state is
recorded as NOT TESTED rather than assumed true.

Statuses follow the GEE OS evidence standard.

| Status | Meaning here |
|---|---|
| VERIFIED | Checked against a file in this repository and matches |
| OUTDATED | Was true once, contradicted by the current tree |
| CONFLICTING | Contradicts another active instruction, and following it could cause harm |
| SENSITIVE | Contains a credential or an identifier that should not sit in a tracked file |
| UNKNOWN | Cannot be verified without live server, database or DNS access |
| MISSING | Real behaviour exists in the code but no claim covers it |

---

## Section 1 — Project-specific values

| Claim | Status | Evidence |
|---|---|---|
| Repo `devgeereact/gakinz_com` | VERIFIED | Consistent with `.github/workflows/deploy.yml` and the account recorded in the global notes |
| Domain `gakinz.com` | VERIFIED | `index.html` title, `src/lib/api.ts` `API_BASE`, `server/config.php.example` `ALLOWED_ORIGINS` |
| Document root `/home/<cpanel_user>/gakinz.com` | VERIFIED | Matches `server/README.md` and the global hosting notes |
| Database name and user `devgeereact_gakinz_com` | SENSITIVE | Real values, `server/config.php.example` lines 26 to 27. Not secret on their own, but they narrow a brute-force target and belong with the password, on the server |
| Database host `localhost` | VERIFIED | `server/config.php.example` line 25 |
| Deploy branch `main` | VERIFIED | `.github/workflows/deploy.yml`, `on: push: branches: [ main ]` |
| FTP username `gakinz_com@gakinz.com` | SENSITIVE | Half of a live FTP credential pair, in a tracked file. The workflow reads it from `secrets.FTP_USERNAME`, so the repository never needs the literal |

## Section 2 — Shared hosting infrastructure

| Claim | Status | Evidence |
|---|---|---|
| Namecheap cPanel hosting | VERIFIED | Consistent with the global hosting record |
| Placeholders `<cpanel_user>`, `<server_ip>` | VERIFIED | Left unfilled deliberately, correct behaviour |
| "DNS provider Cloudflare, records set to DNS only (grey cloud)" | CONFLICTING | The global operations record states all thirteen cPanel domains must stay orange-clouded because the origin holds Cloudflare Origin certificates, which browsers reject when the proxy is bypassed. It records three outages on 2026-07-21 caused by grey-clouding. Acting on this project file would repeat that outage |
| FTP server is the server IP | UNKNOWN | Stored in `secrets.FTP_SERVER`. The global record notes all seven FTP host secrets were repointed to 185.61.152.45 on 2026-07-21 but remain untested |

## Section 3 — What this project is

| Claim | Status | Evidence |
|---|---|---|
| React single-page app on cPanel | VERIFIED | `src/main.tsx`, `src/routes/index.tsx`, `vite.config.ts` |
| Reads and writes MySQL through a PHP API | VERIFIED | 44 PHP endpoints in `server/`, all routed through `_bootstrap.php` |
| "a small PHP API (`api.php`)" | OUTDATED | `server/api.php` is now only the items smoke test, 1,150 bytes of 44 files. The real API is 44 endpoints across roughly 250 kB |
| Deployment is automatic on push | VERIFIED | `.github/workflows/deploy.yml` |

## Section 4 — Architecture and data flow

| Claim | Status | Evidence |
|---|---|---|
| React never connects to MySQL directly | VERIFIED | No database driver in `package.json`; all calls go through `src/lib/api.ts` |
| `api.php` is the only thing that touches the database | OUTDATED | Every one of the 44 endpoints opens `$conn` through `_bootstrap.php` |
| Static build and PHP live together in the document root | VERIFIED | `server/README.md`, deploy workflow `server-dir: ./` |

## Section 5 — Tech stack

| Claim | Status | Evidence |
|---|---|---|
| "React 18 + Vite (JavaScript)" | OUTDATED | `package.json` pins `react@^19.2.0`; the app is TypeScript. Section 13 already overrides this, so the file contradicts itself |
| PHP with mysqli and prepared statements | VERIFIED | `server/_bootstrap.php` and the endpoint files |
| MySQL via cPanel | VERIFIED | `server/schema.sql`, 31 tables |
| DNS Cloudflare, DNS only | CONFLICTING | Same conflict as section 2 |
| CI/CD GitHub Actions to FTP | VERIFIED | `SamKirkland/FTP-Deploy-Action@v4.4.0` in the workflow |

## Section 6 — Key files

| Claim | Status | Evidence |
|---|---|---|
| `vite.config.js` | OUTDATED | The file is `vite.config.ts`. A `tailwind.config.ts` also exists but is near-empty; `tailwind.config.js` is the live one, which section 13 records correctly |
| `.gitignore` excludes `node_modules/`, `dist/`, `config.php` | VERIFIED | All three present, plus `server/uploads/` |
| "`api.php` on the server only, NOT in the repo" | OUTDATED | `server/api.php` is tracked. So are `.htaccess` and `schema.sql`. Only `config.php` is genuinely server-only |
| Deploys upload only `dist/` | VERIFIED | `local-dir: ./dist/` in the workflow |

## Section 7 — Golden rules

| Claim | Status | Evidence |
|---|---|---|
| Never commit `config.php` | VERIFIED | Gitignored; no `config.php` in the tree |
| React never connects to MySQL | VERIFIED | As section 4 |
| `API_BASE` pattern | VERIFIED | `src/lib/api.ts` line 6 implements it exactly |
| Deploys upload only `dist/` | VERIFIED | As above |
| "Cloudflare records stay grey-cloud so cPanel can issue SSL" | CONFLICTING | The global record states this account does not have the AutoSSL feature, so cPanel cannot issue a public certificate. Grey-clouding removes the only working certificate path |
| Do not manually FTP files | VERIFIED as intent | Partially untrue in practice: `server/README.md` and section 13 both require hand-upload of PHP files, because the workflow ships only `dist/` |

## Section 8 — Local development

| Claim | Status | Evidence |
|---|---|---|
| `npm run dev` on port 5102, strictPort | VERIFIED | `vite.config.ts` pins `server.port` and `preview.port` to 5102 with `strictPort: true` |
| Dev fetches hit the live API | VERIFIED | `src/lib/api.ts`, `import.meta.env.DEV ? "https://gakinz.com" : ""` |

## Section 9 — Build and deploy

| Claim | Status | Evidence |
|---|---|---|
| `npm run build` produces `dist/` | VERIFIED | Ran it, see baseline results |
| Actions runs `npm ci`, `npm run build`, FTP upload | VERIFIED | Workflow steps match exactly |

## Section 10 — Database and adding features

| Claim | Status | Evidence |
|---|---|---|
| Prepared statements, JSON responses, one file per resource | VERIFIED | Convention holds across the endpoints inspected |
| "`api.php` begins with `require 'config.php'`" | OUTDATED | Endpoints require `_bootstrap.php`, which in turn requires `config.php` |

## Section 11 — Troubleshooting

| Claim | Status | Evidence |
|---|---|---|
| "Cloudflare record may be orange-cloud, set grey" | CONFLICTING | Following this advice would take the site down. This is the single most dangerous line in the file |
| Deploy and API failure modes | VERIFIED as plausible | Generic and still accurate |
| "run cPanel AutoSSL" | CONFLICTING | The global record shows AutoSSL is not available on this account |

## Section 12 — What not to do

| Claim | Status | Evidence |
|---|---|---|
| Do not commit secrets, `node_modules/`, `dist/` | VERIFIED | Enforced by `.gitignore` |
| Do not deploy into a subfolder | VERIFIED | `server-dir: ./` |
| "Don't switch Cloudflare to orange-cloud" | CONFLICTING | Inverted, as above |

## Section 13 — Build state and decisions

This section is roughly 250 lines of session history. It is the most useful part of the
file and the least maintainable, because it records what each session did rather than what
is true now.

| Claim | Status | Evidence |
|---|---|---|
| TypeScript, builds to static `dist/` via `tsc -b && vite build` | VERIFIED | `package.json` build script |
| Public site under `src/marketing/`, CMS under `/app/*` | VERIFIED | `src/routes/index.tsx` |
| Public routes list includes `smoke` | OUTDATED | The `/smoke` route and `SmokeTest.tsx` were removed. `server/README.md` still tells you to visit it |
| Brand "violet `#6e56cf` / lavender-white `#f5f5ff` / navy ink `#2a2a4a`" | OUTDATED | `src/index.css` now defines a monochrome core, `--primary: 0 0% 4%`, with lavender `245 56% 60%` and rose `340 58% 58%` accents |
| Brand "violet `#8b5cf6`, indigo-ink `#312e81`" from the remodel | OUTDATED | Superseded by commit `d9b27a2`, the mono and duo rebrand |
| Fonts "Inter, Georgia, JetBrains Mono" | OUTDATED | `tailwind.config.js` sets Manrope, Space Grotesk, JetBrains Mono |
| Fonts "Roboto, Playfair Display, Fira Code" | OUTDATED | Same evidence. The file now records three different font stacks, none of them current |
| Active Tailwind config is `tailwind.config.js` | VERIFIED | The `.ts` variant is near-empty at 431 bytes |
| Whole `/app` tree is lazy loaded | VERIFIED | Every CMS route uses `lz()` in `src/routes/index.tsx` |
| "Marketing entry chunk is ~539 kB (169 kB gzip)" | OUTDATED | The current entry chunk is 556.94 kB, 173.79 kB gzipped |
| Seven roles, client-side mirror in `src/lib/access.ts` | VERIFIED | `super_admin`, `admin`, `manager`, `trainer`, `editor`, `employee`, `client` |
| `access.ts` is a UX convenience, not a security boundary | VERIFIED | Stated in the file header and enforced by `require_auth` server-side |
| Login `dev@gakinz.com` with a plaintext password | SENSITIVE | A live super-admin credential in a tracked file. Treat as compromised |
| Ten operational modules built | OUTDATED, understated | There are 22 CMS modules in `src/app/modules/` |
| `ModuleStub.tsx` deleted | VERIFIED | Absent |
| "Stray Pulse demo pages rebranded, orphan URL-only routes" | OUTDATED | Later in the same section the cleanup entry says they were deleted. Neither the files nor the routes exist. The file contradicts itself |
| Demo surface stripped, `src/auth/`, `src/pages/*` subdirectories, `file-manager` removed | VERIFIED | `src/pages/` holds only `ErrorPage.tsx` and `NotFound.tsx`; no `src/auth/`; no `file-manager` |
| Vitest added, 11 tests in `src/lib/access.test.ts` | VERIFIED | 11 passed, see baseline |
| Accessibility pass, zero violations on home, contact, pricing | UNKNOWN | No axe run is reproducible from this tree and no report was kept. Re-run before repeating the claim |
| SMTP and IMAP host `premium152.web-hosting.com` | OUTDATED and risky | That US host was retired. The global record repointed three sibling sites to `premium17.web-hosting.com` on 2026-08-24 and notes the old host still resolves and still answers on 465, so this fails silently rather than loudly. `server/config.php.example` lines 65 and 75 still carry the retired host |
| `weather.php` on the server is a stale pre-bootstrap copy | UNKNOWN | The repository copy routes through `_bootstrap.php` correctly. Live state not checked |
| Migrations at the foot of `schema.sql` | VERIFIED | Present as commented `ALTER TABLE` statements from line 291. They are documentation, not runnable migration files |
| Every "DEPLOYED and LIVE" and "NEEDS RE-DEPLOY" marker | UNKNOWN | Server state, unverifiable from here. Roughly 25 such markers accumulated across sessions with no single current list |
| Integrations degrade gracefully until keyed | VERIFIED by inspection | `server/integrations.php` returns booleans only; endpoints return 503 when unconfigured. Runtime behaviour NOT TESTED |

## Missing from CLAUDE.md

Real behaviour with no documentation at all.

| Area | Evidence |
|---|---|
| Blog module and public blog surface | `src/app/modules/Blog.tsx`, `server/blog.php`, `posts` table, `src/marketing/data/blog.ts` feeding Home, Resources and ResourceDetail |
| Testimonials module | `src/app/modules/Testimonials.tsx`, `server/testimonials.php`, `testimonials` table |
| AI Content Hub | `src/app/modules/Content.tsx`, `server/content.php`, `content_drafts` table |
| `server/tasks.php`, `audit.php`, `book.php` | Present and referenced by the CMS, never listed |
| Lint is failing | 60 errors and 7 warnings, see baseline. No document mentions lint at all |
| `DESIGN-SYSTEM.md` status | A 7 kB design contract for a "Forest Editorial" green and cream scheme that was never implemented. Nothing says whether it is live, pending or abandoned |
| Public routes `/pricing`, `/p/:token`, `/set-password` | Real routes, absent from the route list in section 13 |

## Cross-document conflicts

1. **Cloudflare proxy state.** Project `CLAUDE.md` says grey cloud in four places. The global
   record says orange cloud is mandatory and documents three outages from getting this wrong.
   The global record carries dated evidence; the project file carries none. Resolve in favour
   of the global record, and delete the instruction from the project file rather than
   restating it.
2. **Mail host.** `server/config.php.example` and section 13 name the retired
   `premium152.web-hosting.com`. The global record names `premium17.web-hosting.com`.
3. **Brand.** Three sources disagree. `src/index.css` and `tailwind.config.js` are the
   implementation and therefore authoritative. `CLAUDE.md` describes two superseded violet
   palettes. `DESIGN-SYSTEM.md` describes a green and cream scheme that was never built.
4. **Language and framework version.** Section 5 says React 18 and JavaScript; section 13
   says TypeScript. The code says React 19 and TypeScript.
5. **Where the PHP lives.** Section 6 says PHP is server-only and not in the repository;
   `server/` holds 44 tracked PHP files.
