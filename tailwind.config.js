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
            // Nine values, perfect fourth (1.333), for the PUBLIC surface.
            // No size outside this scale is permitted on a public page. The
            // site it replaced used eight arbitrary heading sizes, which was
            // the clearest single signal that it had been assembled rather
            // than designed.
            //
            // The names are semantic on purpose: there is no `text-[2.6rem]`
            // to reach for, and a reviewer can see at a glance whether a page
            // has invented a size.
            //
            // The CMS keeps Tailwind's default sizes; these are additions.
            fontSize: {
                label: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.08em' }],   // 12px
                body: ['1rem', { lineHeight: '1.6' }],                                 // 16px
                lede: ['1.333rem', { lineHeight: '1.5' }],                             // 21px
                t4: ['1.777rem', { lineHeight: '1.25', letterSpacing: '-0.01em' }],    // 28px
                t3: ['2.369rem', { lineHeight: '1.18', letterSpacing: '-0.015em' }],   // 38px
                t2: ['3.157rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],     // 51px
                t1: ['4.209rem', { lineHeight: '1.04', letterSpacing: '-0.025em' }],   // 67px
                display: ['5.61rem', { lineHeight: '1.0', letterSpacing: '-0.03em' }], // 90px
                hero: ['7.478rem', { lineHeight: '0.95', letterSpacing: '-0.035em' }], // 120px
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            fontFamily: {
                // CMS families. Unchanged — the public rebrand does not
                // propagate into GAkinzOS.
                sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
                // `serif` previously mapped to Space Grotesk, a sans-serif
                // face with no serif fallback, which meant `font-serif`
                // silently rendered a sans. It now names an actual serif.
                serif: ['Newsreader', 'ui-serif', 'Georgia', 'serif'],
                // Public-surface families.
                // Newsreader carries both 120px and 21px from one family by
                // way of its optical-size axis, so the page needs no second
                // display voice. IBM Plex Mono is confined to record data,
                // where tabular figures matter.
                display: ['Newsreader', 'ui-serif', 'Georgia', 'serif'],
                ui: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                data: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
            },
            colors: {
                // ── Public brand ─────────────────────────────────────────
                // Direction C with direction A's colour, per
                // docs/design/2026-09-22-directions/direction-approved.md.
                //
                // The two chromatics carry meaning rather than decoration:
                // `set` marks a record whose material is settled, `come`
                // marks one still waiting for real material. Do not use
                // either as an ornament.
                //
                // Contrast against paper #F6F3ED, computed not estimated:
                //   ink 15.69:1 · inkSoft 7.70:1 · inkMute 5.28:1
                //   set 11.11:1 · come 6.48:1 · edge 3.29:1 (non-text, AA)
                // The retired lavender #7F77DD and rose #D4537E could hold
                // neither a flat block nor white text, which is why the old
                // site could only ever wash them into a gradient.
                gk: {
                    paper: '#F6F3ED',
                    sunk: '#EFEBE2',
                    ink: '#1C1A16',
                    'ink-soft': '#514C42',
                    'ink-mute': '#6B6459',
                    set: '#2A3160',
                    come: '#933C2F',
                    rule: '#D8D2C6',      // decorative hairline only
                    edge: '#8E8577',      // structural rule and form borders, 3.29:1
                    'on-dark': '#F6F3ED',
                    'on-dark-soft': '#C3BCAE',   // 9.20:1 on ink
                    'set-on-dark': '#9FA8D8',    // 7.50:1 on ink
                    'come-on-dark': '#E8A598',   // 8.49:1 on ink
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
