// capture.mjs <outdir> slug=host ... : first-screen captures of live sites for the Work cards.
// Desktop 1440x900 saved at 1200x750, mobile 390x844, WebP. Look at every file before using it.
// Example: node capture.mjs .local-test/captures ego=egolimited.com harni=harni.uk
import { createRequire } from 'node:module'; import path from 'node:path'; import os from 'node:os'; import fs from 'node:fs';
const npx = path.join(os.homedir(), '.npm/_npx'); let pp; for (const d of fs.readdirSync(npx)) { try { pp = createRequire(path.join(npx, d, 'x.js'))('puppeteer'); break } catch {} }
const out = process.argv[2]; const b = await (pp.default ?? pp).launch({ headless: true });
for (const pair of process.argv.slice(3)) {
  const [slug, host] = pair.split('=');
  for (const [kind, vp] of [['d', { width: 1440, height: 900, deviceScaleFactor: 1200 / 1440 }], ['m', { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }]]) {
    const p = await b.newPage(); await p.setViewport(vp);
    if (kind === 'm') await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1');
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    let status = 0; try { const r = await p.goto('https://' + host + '/', { waitUntil: 'networkidle2', timeout: 45000 }); status = r?.status() } catch (e) { console.log(slug, kind, 'LOAD FAIL', e.message); await p.close(); continue }
    await new Promise((r) => setTimeout(r, 2500));
    // Consent and storage notices: take the most privacy-preserving choice on offer (session is throwaway).
    const clicked = await p.evaluate(() => { const order = [/^reject all$/i, /^essential only$/i, /^necessary only$/i, /^decline( all)?$/i, /^got it$/i, /^ok(ay)?$/i, /^dismiss$/i, /^close$/i]; const btns = [...document.querySelectorAll('button,a[role=button]')].filter((x) => x.offsetParent); const hits = []; for (const re of order) for (const x of btns) if (re.test(x.textContent.trim())) { x.click(); hits.push(x.textContent.trim()) } return hits });
    // Trigger scroll-reveal content, then return to the top.
    const H = await p.evaluate(() => document.body.scrollHeight); for (let y = 0; y < Math.min(H, 6000); y += 500) { await p.evaluate((y) => scrollTo(0, y), y); await new Promise((r) => setTimeout(r, 120)) }
    await p.evaluate(() => scrollTo(0, 0)); await new Promise((r) => setTimeout(r, 1500));
    // A connectivity banner raised only because the headless browser fails the site's own online check.
    const hid = await p.evaluate(() => { let n = 0; for (const e of document.querySelectorAll('body *')) { const s = getComputedStyle(e); if (s.position === 'fixed' && /you('|’)re offline/i.test(e.textContent) && e.textContent.length < 200) { e.style.display = 'none'; n++ } } return n });
    if (hid) console.log(slug, kind, 'hid headless-only offline banner');
    if (clicked.length) console.log(slug, kind, 'chose:', clicked.join(' / '));
    const info = await p.evaluate(() => ({ title: document.title, overlays: [...document.querySelectorAll('body *')].filter((e) => { const s = getComputedStyle(e); return (s.position === 'fixed' || s.position === 'sticky') && e.offsetHeight > 120 && e.offsetWidth > 200 }).map((e) => (e.id || e.className || e.tagName).toString().slice(0, 40)) }));
    await p.screenshot({ path: path.join(out, `${slug}-${kind}.webp`), type: 'webp', quality: 86 });
    console.log(slug, kind, status, info.title.slice(0, 50), info.overlays.length ? 'OVERLAYS: ' + info.overlays.join(', ') : '');
    await p.close();
  }
}
await b.close();
