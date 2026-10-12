"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// This file is loaded as CommonJS by Tailwind's config loader even though the
// package is "type": "module". Keep the exports.default shape — it works, and
// changing it has broken the build before. tailwind.config.ts was an empty
// stub and has been deleted; components.json now points here.
var config = {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{ts,tsx}",
    ],
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px'
            }
        },
        extend: {
            // ── Type scale ───────────────────────────────────────────────
            // Nine values for the PUBLIC surface, closed (D-024): no size
            // outside this scale ships on a public page, and the semantic
            // names mean there is no `text-[2.6rem]` to reach for.
            //
            // The values follow the D-037 reference (DESIGN-REFERENCE-
            // MASTERCARD.md section 3): hero 64px at 1:1, section 36/44,
            // card title 24 at 1.2, body 16 at 1.4, eyebrow 14 with +4%,
            // and -2% tracking on every heading step. The names keep their
            // roles, so a page's `text-t2` still means "section heading".
            //
            // The CMS keeps Tailwind's default sizes; these are additions.
            fontSize: {
                label: ['0.875rem', { lineHeight: '1.3', letterSpacing: '0.04em' }],   // 14px eyebrow
                body: ['1rem', { lineHeight: '1.4' }],                                  // 16px
                lede: ['1.25rem', { lineHeight: '1.4' }],                               // 20px
                t4: ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],        // 24px card title
                t3: ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],       // 28px
                t2: ['2.25rem', { lineHeight: '1.22', letterSpacing: '-0.02em' }],      // 36px section
                t1: ['3rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],         // 48px tablet hero
                display: ['4rem', { lineHeight: '1', letterSpacing: '-0.02em' }],       // 64px hero
                hero: ['5rem', { lineHeight: '1', letterSpacing: '-0.02em' }],          // 80px, unused
            },
            // Spacing needs no extension: the reference's 8, 16, 24, 32, 48,
            // 64, 96 and 128 are Tailwind's 2, 4, 6, 8, 12, 16, 24 and 32.
            borderRadius: {
                // Public radius scale: 12px actions and fields (D-047),
                // 40px media frames. Pills and circles use `rounded-full`.
                action: '0.75rem',
                media: '2.5rem',
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            // Reference elevation levels 1 and 2: atmospheric, never hard.
            boxShadow: {
                float: '0 4px 24px 0 rgba(0, 0, 0, 0.04)',
                lifted: '0 24px 48px 0 rgba(0, 0, 0, 0.08)',
            },
            fontFamily: {
                // CMS families. Unchanged — the public rebrand does not
                // propagate into GAkinzOS.
                sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
                // `serif` previously mapped to Space Grotesk, a sans-serif
                // face with no serif fallback, which meant `font-serif`
                // silently rendered a sans. It names an actual serif, used
                // by three CMS headings only.
                serif: ['Newsreader', 'ui-serif', 'Georgia', 'serif'],
                // Public-surface families (D-037). One family carries all
                // three slots, as the reference requires: Sofia Sans
                // variable, self-hosted, standing in for the proprietary
                // MarkForMC, with Manrope as the fallback. The three names
                // survive so pages need no edits; `font-data` still turns on
                // tabular figures in index.css.
                display: ['"Sofia Sans Variable"', 'Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                ui: ['"Sofia Sans Variable"', 'Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                data: ['"Sofia Sans Variable"', 'Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
            colors: {
                // ── Public brand ─────────────────────────────────────────
                // D-037, the reference palette in DESIGN-REFERENCE-
                // MASTERCARD.md, kept in step with the HSL list on
                // `.gk-public` in src/index.css. Edit both together.
                //
                // Names are unchanged so the pages need no edits: `paper` is
                // canvas cream, `sunk` is now lifted cream (the alternate
                // band), `set` is the warm-black primary action, `come`
                // still marks "awaiting material", now in clay.
                //
                // Contrast on canvas cream #F3F0EE, computed:
                //   ink 16.25 · ink-soft 6.57 · ink-mute 4.84 · come 6.20
                //   edge 3.21 (non-text) · signal 4.11 (non-text dots only)
                // The Mastercard mark colours #EB001B and #F79E1B are never
                // used (DESIGN-SYSTEM 10.2).
                gk: {
                    paper: '#F3F0EE',
                    sunk: '#FCFBFA',
                    white: '#FFFFFF',
                    ink: '#141413',
                    'ink-soft': '#555555',
                    'ink-mute': '#696969',
                    set: '#141413',
                    come: '#9A3A0A',
                    rule: '#D1CDC7',      // decorative hairline only
                    edge: '#8C857C',      // structural rule and form borders, 3.21:1
                    orange: '#F37338',    // decorative orbit, never text
                    signal: '#CF4500',    // eyebrow dots only
                    'on-dark': '#F3F0EE',
                    'on-dark-soft': '#B8B2AA',   // 8.77:1 on ink
                    'set-on-dark': '#F3F0EE',    // 16.25:1 on ink
                    'come-on-dark': '#F37338',   // 6.43:1 on ink
                },
                // ── CMS tokens. Unchanged. ───────────────────────────────
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                chart: {
                    '1': 'hsl(var(--chart-1))',
                    '2': 'hsl(var(--chart-2))',
                    '3': 'hsl(var(--chart-3))',
                    '4': 'hsl(var(--chart-4))',
                    '5': 'hsl(var(--chart-5))'
                },
                sidebar: {
                    DEFAULT: 'hsl(var(--sidebar-background))',
                    foreground: 'hsl(var(--sidebar-foreground))',
                    primary: 'hsl(var(--sidebar-primary))',
                    'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
                    accent: 'hsl(var(--sidebar-accent))',
                    'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
                    border: 'hsl(var(--sidebar-border))',
                    ring: 'hsl(var(--sidebar-ring))'
                }
            }
        }
    },
    plugins: [require("tailwindcss-animate")],
};
exports.default = config;
