# Verification routine for gakinz.com and GAkinzOS

Run from the project root. Scratch output goes to `.local-test/` (ignored). Never test against the live
API: development calls it, so a save in development is a save to the real business.

## 0. Tools (once per machine)

```bash
npx puppeteer browsers install chrome-headless-shell        # used by shots.mjs and the scripts here
mkdir -p .local-test/tools && cd .local-test/tools && npm init -y >/dev/null && npm i axe-core --no-audit --no-fund && cd -
```

`shots.mjs` finds axe-core from the directory it runs in, so run it from `.local-test/tools`. Name the
axe-core version in every report: newer versions add rules (4.14.0 flagged the logo links, K-114, where
4.10.2 passed the same markup).

## 1. Gate

```bash
npm run build && npm test && npm run lint:ratchet && npm run docs:check
find server -name '*.php' -print0 | xargs -0 -n1 php -l
```

## 2. Serve the build with no route to the live API

```bash
node .claude/skills/gakinz-design/scripts/serve.mjs dist 5197
```

Every `.php` answers 404 here. Do not use `vite preview` until `preview.proxy` is set to `{}`: it inherits
the dev proxy and sends `.php` calls to gakinz.com (finding N3).

## 3. Screens at every width, with overflow, errors and axe

```bash
cd .local-test/tools
node ~/.claude/skills/product-design/scripts/shots.mjs --base http://127.0.0.1:5197 \
  --pages "/,/work,/services,/pricing,/about,/contact,/work/ego,/work/rotaflow,/login" \
  --widths 390,834,1440,1920,2560 --out ../shots/run1 --axe --full
cd -
```

Add every case study route (`/work/<slug>` for all twelve) and every service page when those change: the
Harni case study failed while the others passed, because its colour is light.

The CMS needs a signed-in session. Build without the Clerk key
(`VITE_CLERK_PUBLISHABLE_KEY= npx vite build --outDir .local-test/dist-noclerk`), serve that, seed
`localStorage['gk-auth']` with a synthetic `super_admin`, and stub `fetch` for `.php` with labelled sample
data (the pattern used on 31 Oct 2026). Never sign in to the live system to test.

## 4. Look at the screens

```bash
python3 .claude/skills/gakinz-design/scripts/sheet.py .local-test/shots/run1 390 9 260 563 .local-test/shots/s390.png
python3 .claude/skills/gakinz-design/scripts/sheet.py .local-test/shots/run1 834 9 280 400 .local-test/shots/s834.png
python3 .claude/skills/gakinz-design/scripts/sheet.py .local-test/shots/run1 2560 6 480 270 .local-test/shots/s2560.png
```

Open each sheet and check: rows equal, no lone card, no empty half, titles not wrapping one word per line,
three-column screens stacked on tablet, wide screens centred, nothing clipped. Most layout faults found on
31 Oct were only visible here, not in axe.

If a page overflows, find the culprit:

```bash
node .claude/skills/gakinz-design/scripts/wide.mjs "http://127.0.0.1:5197/work" 390
```

## 5. States axe does not reach by default

- Dark theme on every CMS screen (toggle, then run axe again).
- Open dialogs, drawers and popovers, in both themes.
- Every hero slide on `/` (click each segment, run axe on the hero): each slide changes the background.
- Empty, loading, error and unavailable states (stub the API to return `[]`, a 500, and a 503).

## 6. Colour pairs

```bash
python3 ~/.claude/skills/product-design/scripts/contrast.py "#9AA3B0,#16202B" "#7F8896,#FFFFFF"
```

Text 4.5:1, large text 3:1, UI parts and field edges 3:1 against every surface they touch. Record the
ratio in `tokens.md` and as a comment beside the token.

## 7. Work screenshots

```bash
node .claude/skills/gakinz-design/scripts/capture.mjs .local-test/captures \
  rotaflow=rotaflow.space ritagreen=ritagreenservices.com harni=harni.uk heritage=heritclothing.com \
  mimmycare=mimmycare.com ego=egolimited.com
```

Look at each file. Copy accepted ones to `public/images/work/<slug>-d.webp` and `-m.webp` (1200×750 and
390×844). Leave Vitalcare's existing screenshot (owner decision, 31 Oct 2026).

## 8. Report

Use DONE / PARTIAL / NOT TESTED / BLOCKED with counts ("185 of 185 captures clean"), never "looks good".
Record the run in `docs/AUDIT.md` (newest first) and move fixed items in `findings.md` from Open to Fixed.
