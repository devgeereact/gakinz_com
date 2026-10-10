# Feature list

Proposed 10 October 2026. This is the single list of everything to build or finish, gathered from documents 02, 03, 04 and 08. It adds no new scope. Each row either saves the owner repeated work or helps a client complete something. "Exists" means the code is there today (verified in document 01); it does not mean the feature is tested.

**Phase** matches document 05: 1 safety, 2 business journeys, 3 CMS polish, 4 public site, 5 social and affiliate, 6 AdSense. **Size**: S is about a day or less of focused work, M is a few days. Sizes are rough planning guides, not estimates.

## Daily work

| Feature | Why it helps | Today | Phase | Size | Depends on |
|---|---|---|---|---|---|
| Today screen: replies due, calls, deadlines, waiting client material, overdue invoices | One place to start the day; each item opens its record | Dashboard exists, chart-led | 3 | M | Unavailable states |
| "Unavailable, retry" instead of £0 when a source fails | Stops false reassurance such as "All on time" | Banner exists, cards show zero (A08) | 1 | S | None |
| Seven-item navigation (Today, Enquiries, Clients, Projects, Money, Website, Settings) | Fewer decisions; other tools sit inside records | Flat 24-item sidebar (A09) | 3 | M | None; URLs kept |
| Record search across clients and projects | Find a client quickly from a phone | Menu search only | 3 | M | Safe search endpoint |
| My account for every role: profile, password, 2FA, own sessions | Fixes two dead links and admin-only security (A10) | Missing | 2 | M | Ownership checks |

## Enquiries and bookings

| Feature | Why it helps | Today | Phase | Size | Depends on |
|---|---|---|---|---|---|
| Next-action date and short note on each enquiry | Nothing goes cold unnoticed | Missing | 2 | S | None |
| Simple priority set by the owner | Replaces AI scoring | Missing | 2 | S | None |
| Call record: requested or confirmed time, timezone, link, outcome | Bookings tracked against the enquiry | `book.php` returns a Calendly link only | 2 | M | None |
| Optional calendar file (ICS) download for a confirmed call | Adds to any calendar without OAuth | Missing | Later | S | Call record |
| Convert enquiry to client once, matching existing email or company | No duplicate clients | Exists, untested for duplicates | 2 | S | Synthetic tests |
| Six service options on the enquiry form, same labels as the website; budget bands that fit small IT jobs | Clean source data | Five project types that do not match service names; lowest budget band "Under £5k" (`Contact.tsx:36-37`) | 4 | S | Services and prices approved |

## Clients and portal

| Feature | Why it helps | Today | Phase | Size | Depends on |
|---|---|---|---|---|---|
| One client timeline: enquiries, calls, quotes, projects, invoices, messages | Answers "what happened with this client?" | Spread across modules | 2 | M | None |
| Private owner notes kept apart from client-visible information | Nothing internal leaks | Partly | 2 | S | None |
| Client portal: project summary, next step, invoices, shared files | Clients help themselves | Read-only portal exists | 2 | M | Isolation tests |
| Client messages through support tickets | Two-way conversation without a new chat system | Staff-only (A24) | 2 | M | Client branch in `support.php` |
| Request an update, request a call, supply assets | Fewer chasing emails | Missing | 2 | M | Client messages |
| Private delivery feedback, with separate permission to publish | Honest feedback and lawful testimonials | Missing | 2 | S | Client messages |
| Project reference on documents; reference plus email link sign-in | Easy access without passwords | Missing | After J03 | M | A22, A23 fixed |

## Quotes and money

| Feature | Why it helps | Today | Phase | Size | Depends on |
|---|---|---|---|---|---|
| Accept only from sent; convert exactly once | Prevents wrong or duplicate projects and invoices (A12, A27) | Unguarded | 1 | S | None |
| Schedule preview with VAT before acceptance | No surprise invoices | Missing | 2 | S | None |
| Acceptance evidence: who, when, which version | Proof of the agreed scope | Staff click only | 2 | S | None |
| Stripe charges VAT-inclusive total; webhook checks amount and currency | Stops silent VAT loss (A25) | Defective | 1 | M | Sandbox fixtures |
| PayPal hidden until it has a webhook | Avoids unrecorded payments (A26) | No webhook | 1 | S | None |
| Manual payment record: reference, date, amount | Bank transfers reconciled simply | Missing | 2 | S | None |
| Owner-triggered payment reminder | Chase money without automation | Partly | 2 | S | Mail sink for tests |
| Safe CSV export (formula prefixes neutralised) | Spreadsheet safety (A21) | Unsafe | 2 | S | None |

## Projects and IT jobs

| Feature | Why it helps | Today | Phase | Size | Depends on |
|---|---|---|---|---|---|
| Task list with due dates, one next milestone, one client-visible progress note | Clear delivery without a project suite | Tasks exist | 2 | S | None |
| Asset request checklist | Clients know what to send | Missing | 2 | S | Portal |
| Project brief and agreed measurements under the client ID | Scope and evidence in one place (document 08) | Missing | 2 | M | None |
| Standing "IT support" project per support client; tickets plus billable time | Bill IT support without a new module | Time requires a project | 2 | S | None |
| Consultancy project closes with a shared recommendation file | Clear deliverable for consultancy | Files exist | 2 | S | Portal files |
| Manual sanitised GEE OS handoff export | Plan development safely on the owner's computer | Missing | 3 | S | Project brief |
| One reusable project template | Faster set-up | Missing | Later | S | None |

## Website and content

| Feature | Why it helps | Today | Phase | Size | Depends on |
|---|---|---|---|---|---|
| Full Mastercard-inspired design on both surfaces, Sofia Sans, one light and one dark CMS theme | One consistent look (document 03) | September design | 3-4 | M | Font licence confirmed |
| Hero and section motion with reduced-motion fallback | Original feel without hurting speed | `FadeIn` only | 4 | M | Design tokens |
| Six service pages with buyer hooks, scope, exclusions and price basis | Services up front for companies | Four pages | 4 | M | Prices approved |
| Blog edit that keeps the body (A06) | Safe content editing | Destructive | 1 | S | None |
| Safe article format: links, lists, recommendation blocks | Needed for affiliate links | Headings and paragraphs only (A17) | 4 | S | None |
| Publish and unpublish that really removes content | Fallback no longer resurrects posts (A16) | Defective | 4 | S | None |
| Route-specific metadata and sitemap from published records | Search and share previews (A18) | Static | 4 | M | Rendering choice |
| Replace "to supply" gaps and engineering counts with real content | Professional public site (A19) | Gaps visible | 4 | M | Owner content |
| Business and social links held in one settings record | Header, footer and schema stay consistent | Hard-coded in `site.ts` | 4 | S | Profiles created |
| "Already working with us?" link in header and footer | Client access without competing with enquiry | Missing | 4 | S | Portal |

## Monetisation and social

| Feature | Why it helps | Today | Phase | Size | Depends on |
|---|---|---|---|---|---|
| Amazon disclosure statement and labelled recommendation blocks | Compliant affiliate income | None | 5 | S | Safe article format |
| Certified consent platform (CMP) | Required before AdSense in the UK | None | 6 | M | AdSense approval |
| One or two reserved ad slots on articles only | Secondary income without hurting enquiries | None | 6 | S | CMP |
| Five profiles from the document 04 kit | Consistent company presence | Not created | 5 | S | Owner checks handles |

## Deliberately not doing

Website or page builder; drag-and-drop or block editor; multi-company tenancy; payroll, leave or capacity planning; full accounting or accounting sync; multi-currency; custom calendar or availability engine; SMS or WhatsApp API; social scheduling or auto-posting; AI scoring, forecasting or auto-replies; client e-signature product; Gantt charts and task dependencies; custom report builder; Zapier or Make automations; Amazon price scraping or product API; a second messaging system beside support tickets; networking or hardware repair services.

Anything here can be reconsidered only through a dated decision that names the repeated need and the maintenance cost.
