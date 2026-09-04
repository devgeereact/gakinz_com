# Product specification: GAkinz and GAkinzOS

**Status:** current. Derived from `GAkinzOS.html` (the original brief, still tracked at the
repository root) and from the implemented surfaces in `src/`.

`GAkinzOS.html` remains the authority on intended product scope and module numbering. This
file records what that brief asks for, what the repository actually contains today, and where
the two differ. Where a claim below could not be checked from the repository, it says so.

---

## 1. What the product is

GAkinz is a web design and development studio. The repository holds one Vite application that
serves two surfaces from one domain and one build:

| Surface | Path | Source | Audience |
|---|---|---|---|
| Public corporate site | `/` | `src/marketing/` | Prospective clients |
| GAkinzOS CMS | `/app/*` | `src/app/` | Studio staff and one client role |

The stated purpose in the brief is to run the studio from first enquiry to final invoice in
one place, so the team spends its hours on the work rather than on administration.

Company facts used across the public site live in `src/marketing/data/site.ts` under
`company`. Several are placeholders in the tracked source (the phone number and the company
registration number are zero-filled), so treat that file as the authority and check it before
quoting a contact detail anywhere.

## 2. Users and roles

Seven roles exist, defined in `server/_bootstrap.php` as `VALID_ROLES` and mirrored for the
interface in `src/lib/access.ts`.

| Role | Nature |
|---|---|
| `super_admin` | Full platform access, including team and audit |
| `admin` | Full platform access, including team and audit |
| `manager` | Operations and money, no platform administration |
| `trainer` | Time and knowledge only |
| `editor` | Sales, content and delivery, no money |
| `employee` | Delivery and support, no money, no sales |
| `client` | External. Sees only its own portal |

The `client` role is the isolation-critical one. See `docs/SECURITY.md`.

## 3. Modules the brief asks for

The brief describes 12 modules, and its cover states 168 features of which 52 are AI features,
across 8 core asks and 1 platform. Counts and descriptions below are read from the `MODULES`
array in `GAkinzOS.html`.

| # | Module | What it covers | AI | New | MVP |
|---|---|---|---|---|---|
| 1 | Studio Dashboard | Pipeline, active projects, hours, cash, what needs attention | 5 | 3 | 6 |
| 2 | Leads and Enquiries | Website enquiries captured, scored and chased to won or lost | 6 | 4 | 7 |
| 3 | Clients (CRM) | Client record with projects, contacts, files and history | 4 | 4 | 7 |
| 4 | Projects and Tasks | Milestones, assignees, deadlines, kickoff to launch | 6 | 5 | 8 |
| 5 | Proposals and Quotes | Branded proposals, line-item quotes, sign-off, convert to project | 5 | 4 | 6 |
| 6 | Invoicing and Payments | Invoices, branded PDF, online payment, reminders, accounting sync | 4 | 5 | 7 |
| 7 | Client Portal | Progress, approvals, invoices and files in one branded space | 4 | 5 | 6 |
| 8 | Time Tracking | Billable hours against projects | 4 | 4 | 6 |
| 9 | Support Tickets | Client issues raised, resolved and tracked | 5 | 4 | 6 |
| 10 | Communication Hub | Email, client messages and internal notes tied to a project | 4 | 4 | 4 |
| 11 | Analytics and Reporting | Revenue, pipeline, profitability, utilisation | 5 | 4 | 4 |
| 12 | Platform and Settings | Team roles, brand kit, integrations, automations, audit trail | 3 | 5 | 5 |

## 4. Modules the repository actually ships

`src/app/modules/` holds 23 module components, and `src/lib/access.ts` gates 23 module keys.
Eleven of them go beyond the twelve in the brief.

| Module key | Route | Component | In the brief? |
|---|---|---|---|
| `dashboard` | `/app` | `Dashboard.tsx` | Yes, module 1 |
| `leads` | `/app/leads` | `Leads.tsx` | Yes, module 2 |
| `clients` | `/app/clients` | `Clients.tsx` | Yes, module 3 |
| `projects` | `/app/projects` | `Projects.tsx` | Yes, module 4 |
| `proposals` | `/app/proposals` | `Proposals.tsx` | Yes, module 5 |
| `invoicing` | `/app/invoicing` | `Invoicing.tsx` | Yes, module 6 |
| `portal` | `/app/portal` | `Portal.tsx` | Yes, module 7 |
| `time` | `/app/time` | `Time.tsx` | Yes, module 8 |
| `support` | `/app/support` | `Support.tsx` | Yes, module 9 |
| `comms` | `/app/comms` | `Comms.tsx` | Yes, module 10 |
| `analytics` | `/app/analytics` | `Analytics.tsx` | Yes, module 11 |
| `platform` | `/app/platform` | `Platform.tsx` | Yes, module 12 |
| `mailbox` | `/app/mailbox` | `Mailbox.tsx` | No. Real IMAP and SMTP mailbox |
| `design` | `/app/design` | `Design.tsx` | No. Figma review rounds |
| `devpipeline` | `/app/devpipeline` | `DevPipeline.tsx` | No. Repo, environments, deploy log |
| `resourcing` | `/app/resourcing` | `Resourcing.tsx` | No. Capacity and leave |
| `contracts` | `/app/contracts` | `Contracts.tsx` | No. Contracts and typed e-signature |
| `knowledge` | `/app/knowledge` | `Knowledge.tsx` | No. Internal SOP and wiki |
| `content` | `/app/content` | `Content.tsx` | No. AI content hub |
| `blog` | `/app/blog` | `Blog.tsx` | No. Public blog authoring |
| `testimonials` | `/app/testimonials` | `Testimonials.tsx` | No. Public testimonials |
| `files` | `/app/files` | `Files.tsx` | No. Per-project and per-client file storage |
| `careplan` | `/app/careplan` | `CarePlan.tsx` | No. Uptime, TLS expiry, care-plan revenue |

The brief's per-feature checklist has not been reconciled against the implementation feature
by feature. Module presence is verified; feature completeness inside each module is
**NOT TESTED**.

## 5. Public site surface

Routes are defined in `src/routes/index.tsx`. Public copy lives in
`src/marketing/data/site.ts`; blog content is fetched live from the API through
`src/marketing/data/blog.ts`.

| Route | Page | Content source |
|---|---|---|
| `/` | Home | `site.ts` plus live blog |
| `/about` | About | `site.ts` |
| `/services` | Services index | `site.ts` `services` |
| `/services/:slug` | Service detail | `site.ts` `services` |
| `/pricing` | Pricing | `site.ts` `packages`, `addOns`, `alwaysIncluded`, `paymentTerms`, `faqs` |
| `/sectors` | Sectors | `site.ts` `sectors` |
| `/work` | Work | `site.ts` `work` |
| `/resources` | Resources index | `site.ts` `insights` plus live blog |
| `/resources/:slug` | Resource detail | `site.ts` plus live blog |
| `/contact` | Contact | `site.ts`, posts to `contact.php` |
| `/privacy`, `/terms`, `/cookies` | Legal | `Legal.tsx` |
| `/verify/:id` | Certificate check | `verify.php` |
| `/p/:token` | Read-only shared proposal | `proposals.php` share token |
| `/login` | Staff and client login | `auth.php` |
| `/set-password` | Invite and reset completion | `auth.php` |

## 6. Deliberate scope boundaries

Recorded so an agent does not treat an absence as an oversight.

- **No accounting sync.** The brief asks for it under Invoicing. Xero and QuickBooks are not
  built. Each needs a full OAuth application and a sandbox account.
- **No third-party storage backend.** Files are stored on the server under
  `server/uploads/`. Drive, Box and Dropbox are not built.
- **No meeting creation.** Zoom and Google Meet are not built. Calendly is wired as a link
  only, through `server/book.php`.
- **Not a Progressive Web App.** There is no manifest and no service worker in `public/`.
- **No migration runner.** Schema changes are commented SQL at the foot of
  `server/schema.sql`, applied by hand.
