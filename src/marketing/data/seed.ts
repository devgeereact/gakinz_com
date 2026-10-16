/**
 * Whether the public data hooks start from their built-in content.
 *
 * Normally a hook starts empty (or loading) and shows the CMS answer, or the
 * built-in fallback only when the request fails (see ./cmsResult.ts). That
 * would leave a prerendered page with "Loading…" where the content belongs.
 *
 * So the build-time prerender (no `window`) renders the built-in content, and
 * the browser's first render over that markup must render exactly the same to
 * hydrate it. main.tsx calls startSeeding() before hydrateRoot, and <Boot> in
 * src/AppRoot.tsx calls endSeeding() once hydration has committed. From then on
 * a hook mounts as before. The fetch effects still run after hydration, and the
 * CMS answer replaces the built-in content as it always has.
 */
let seeding = typeof window === "undefined"

export const seedFromFallback = () => seeding

export function startSeeding() {
  seeding = true
}

export function endSeeding() {
  seeding = false
}
