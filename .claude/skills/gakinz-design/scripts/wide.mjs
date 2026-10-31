// wide.mjs <url> <width>: lists the last elements that stick out past the viewport, to find what causes
// sideways overflow. Uses the Puppeteer in the npx cache (npx puppeteer browsers install chrome-headless-shell).
import { createRequire } from 'node:module'; import path from 'node:path'; import os from 'node:os'; import fs from 'node:fs';
const npx = path.join(os.homedir(), '.npm/_npx'); let pp;
for (const d of fs.readdirSync(npx)) { try { pp = createRequire(path.join(npx, d, 'x.js'))('puppeteer'); break } catch {} }
const puppeteer = pp.default ?? pp;
const b = await puppeteer.launch({ headless: true }); const p = await b.newPage();
await p.setViewport({ width: Number(process.argv[3]), height: 900 });
await p.goto(process.argv[2], { waitUntil: 'networkidle0' });
console.log(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1 ).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} right=${Math.round(e.getBoundingClientRect().right)}`).slice(-8)), null, 1));
await b.close();
