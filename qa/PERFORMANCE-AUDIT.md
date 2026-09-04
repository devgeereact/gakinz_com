# Performance audit

**Verdict: PARTIAL.** Bundle composition is measured. Everything a user actually experiences
is unmeasured.

**Date:** 2026-09-04 · **Target:** `chore/gee-os-adoption` at `065a234`
**Method:** one local production build. No browser measurement, no Lighthouse run, no field
data, no server timing.

---

## 1. What was measured

`npm run build`, completed in 2.83 s. The chunks worth watching:

| Chunk | Raw | Gzip | Loaded |
|---|---|---|---|
| `index` (marketing entry) | 556.94 kB | 173.79 kB | Eagerly, on the public site |
| `jspdf.es.min` | 386.00 kB | 124.94 kB | On demand |
| `card` | 384.82 kB | 105.84 kB | On demand |
| `csv` (xlsx) | 283.25 kB | 94.21 kB | On demand |
| `html2canvas.esm` | 201.04 kB | 47.07 kB | On demand |
| `index.es` | 158.83 kB | 52.93 kB | On demand |
| `AppLayout` | 92.46 kB | 26.93 kB | On CMS entry |
| `Invoicing` | 43.74 kB | 14.25 kB | On demand |
| `Analytics` | 37.68 kB | 10.79 kB | On demand |
| `Dashboard` | 35.58 kB | 10.84 kB | On demand |

Vite warns that chunks exceed 500 kB.

## 2. What that means

**The code splitting is doing its job.** Every heavy library sits in its own chunk behind a
lazy route: the PDF generator, the spreadsheet writer, the canvas rasteriser, the charts and
the calendar. A visitor to the marketing site downloads none of them. Individual CMS modules
are 8 to 44 kB each. This is the right shape.

**The problem is the eager entry.** 556.94 kB raw and 173.79 kB gzipped is what a first-time
visitor to the public site pays before anything renders. Previous documentation recorded 539
kB, so it has grown, which suggests it will keep growing unless someone watches it.

The public routes are eager by deliberate choice, to keep first paint fast. That choice puts
14 page components, the layout, the navigation, the footer, the mockup component and all of
`src/marketing/data/site.ts` into one chunk. Several of those pages are rarely the entry
point.

## 3. Other observed costs

**Render-blocking third-party fonts.** `index.html` loads two icon-font stylesheets, Bootstrap
Icons from `cdn.jsdelivr.net` and Boxicons from `cdn.boxicons.com`, in the document head with
no `preconnect`, no `media` trick and no local fallback. `src/index.css` then imports three
Google Font families with `display=swap`. That is five third-party requests on the critical
path, across three hosts, before the page can paint. Impact is **NOT MEASURED**.

**Server-side cost.** Not measured at all. Two observations from reading the code, both
unmeasured:

- Several list endpoints compute invoice totals with a correlated subquery over
  `invoice_items` per row. Fine at current data volumes, and it will not stay fine.
- `weather.php` caches per city for 10 minutes in the system temp directory, which is the
  right instinct. No other endpoint caches anything.

**Images.** `public/` holds `cards/`, `illustrations/`, `images/` and `products/`. Their sizes,
formats and whether they are appropriately dimensioned have **NOT** been examined.

## 4. Not measured

Everything a user experiences:

- Largest Contentful Paint, Interaction to Next Paint, Cumulative Layout Shift. No lab run and
  no field data.
- Time to first byte from the live host.
- Real-world load on a slow connection or a mid-range device.
- API response times.
- Database query performance under real data volume.
- Whether the host applies gzip or Brotli to the served assets. The gzip figures above are
  Vite's estimate, not what the server actually sends.
- Image weight and format.

## 5. If this is worth acting on

In order of value per unit of effort. None of it should start before a baseline measurement
exists, because otherwise there is no way to know whether it helped.

1. **Measure first.** Run Lighthouse against the live site. Everything below is speculation
   without it.
2. **Self-host or drop the two icon fonts.** They are two third-party hosts on the critical
   path, and this also closes a supply-chain exposure noted in `qa/SECURITY-AUDIT.md` S-005.
3. **Lazy-load the rarely-entered public routes.** Legal, Verify and the resource detail page
   are unlikely first landings and would come out of the eager entry.
4. **Split `src/marketing/data/site.ts`** so a page loads only its own content.
5. **Set a size budget** in the build so the entry chunk cannot drift upward unnoticed.
6. **Audit the images in `public/`** for dimensions and format.

## 6. Statuses

| Area | Status |
|---|---|
| Bundle composition and code splitting | PASS. Measured, and the shape is right |
| Eager entry chunk size | PARTIAL. Measured at 556.94 kB, above the warning threshold |
| Core Web Vitals | NOT TESTED |
| Third-party request cost | NOT TESTED |
| Image optimisation | NOT TESTED |
| API response time | NOT TESTED |
| Database performance | NOT TESTED |
| Server compression and caching headers | NOT TESTED |
