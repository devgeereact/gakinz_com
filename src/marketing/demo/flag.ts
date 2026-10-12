/**
 * Demo content switch.
 *
 * Demo content exists so a developer working on the public site can see every
 * section populated, the way it will look once real records, testimonials and
 * screenshots arrive. It is NEVER part of a production build:
 *
 *   - `import.meta.env.DEV` is replaced with `false` by `vite build`, so every
 *     branch guarded by `DEMO_ON` is removed, and the dynamic import of
 *     ./content with it. After `npm run build`, a search of `dist/` for
 *     "Demo content" must find nothing.
 *   - In development it can be switched off with `VITE_DEMO=off npm run dev`,
 *     to see the site exactly as production will render it.
 *
 * The evidence rule (docs/DECISIONS.md D-027) is why this is development
 * only: every name, quote and project in ./content is fictional, and none of
 * it may ever reach a visitor.
 */
export const DEMO_ON = import.meta.env.DEV && import.meta.env.VITE_DEMO !== "off"
