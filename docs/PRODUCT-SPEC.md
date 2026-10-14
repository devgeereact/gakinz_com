# Product specification: GAkinz and GAkinzOS

**Status:** current. The owner approved the 2026 production plan on 2026-10-10, and this file
is now the authority on product scope (`docs/DECISIONS.md` D-043). It replaces the original
`GAkinzOS.html` brief as the scope authority; that brief is retired, and every one of its 175
features is kept with a disposition in Appendix B.

The file records three things, and keeps them apart: what the repository **contains today**,
what the approved scope **requires**, and what is **deliberately not built**. A requirement in
this file is not a claim that it works. Current evidence lives in `docs/STATUS.md`, open
defects in `docs/KNOWN-ISSUES.md`, and the acceptance scenarios in `qa/TEST-PLAN.md`.

Phase numbers used below are the delivery phases in `docs/STATUS.md` section 2.

---

## 1. Purpose and scope

### 1.1 What GAkinz is

GAkinz is a small business run by one owner, Gideon Akinlotan, who does the work himself. It
offers six services (D-038):

| Group | Service |
|---|---|
| Websites | Web design |
| Websites | Web development |
| Websites | Ecommerce |
| Websites | Website care |
| IT | General IT support |
| IT | IT consultancy |

**Networking installation and hardware repair are not offered and must not be advertised.**

The public identity is GAkinz, with Gideon clearly named as the owner doing the work (D-039).

### 1.2 What the system is for

One Vite application serves two surfaces from one domain and one build:

| Surface | Path | Source | Audience |
|---|---|---|---|
| Public website | `/` | `src/marketing/` | Small businesses deciding whether to enquire |
| GAkinzOS CMS | `/app/*` | `src/app/` | The owner, and clients through a small portal |

GAkinz should become a dependable website and a small private workspace for one owner:
attract suitable companies, receive enquiries, arrange calls, quote work, keep client
records, track delivery, talk to clients clearly and collect payment.

It should **not** become a website generator, a large agency operating system or a general
IT marketplace. The existing React, Vite, PHP and MySQL application is the foundation and is
kept; there is no framework migration. The priority is completing and proving the business
journeys, protecting records and reducing the number of decisions on each screen. Fewer
functions are finished well; optional modules stay available but quiet, and hiding a
module's navigation does not remove its endpoint access or its stored data (D-040).

Company facts used across the public site live in `src/marketing/data/site.ts` under
`company`. A value that does not exist yet is `null` there (the phone number and the company
registration are both `null` today), so treat that file as the authority and check it before
quoting a contact detail anywhere.

### 1.3 Definition of a working system

A visitor understands the service, sends an enquiry and receives an honest acknowledgement.
The owner sees the enquiry once, records the next action, arranges a call, issues an accurate
quote, records acceptance and creates one client and one project. The client signs in to see
only their own agreed work, invoices and shared material, sends a message, requests an update
and leaves delivery feedback. These customer actions are completion work, not existing
capabilities. Payment totals match everywhere. The owner publishes an approved portfolio
record or article without a developer, and can recover the records after a failure.

Success is measured by completed journeys, not by module or AI-feature counts.

### 1.4 Operating targets

Proposed, and awaiting the owner's confirmation (`docs/STATUS.md` section 5):

- Acknowledge enquiries within the stated working-day window.
- Keep every active enquiry assigned a next action.
- Keep every active project attached to a client.
- Review overdue money weekly.

No current online revenue or audience size has been established.

## 2. Users and roles

Seven roles exist, defined in `server/_bootstrap.php` as `VALID_ROLES` and mirrored for the
interface in `src/lib/access.ts`. The access model is kept for safety; the interface defaults
to the owner and the client, and there is no role-engine rewrite.

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

## 3. Audience, positioning and voice

**Audience.** First, a prospective client: a founder, marketing lead or practice manager at a
small UK business, arriving from a referral or a search, and deciding quickly whether this
person is credible enough to contact. They want evidence, not adjectives, and do not care
about the stack. Second, a peer or collaborator who judges the work and the writing. Both
read on a laptop first and a phone second.

**Positioning.** GAkinz, websites and everyday IT support for small businesses, run by
Gideon Akinlotan. Use "I" when Gideon delivers personally; use the company name in business
terms and profile headings. Do not claim a team unless a specific job genuinely involves one.

**Draft copy, not yet approved:**

- Main message: "A clear, dependable website for your business, with one person to call
  afterwards."
- Supporting copy: "I'm Gideon, the owner of GAkinz. I design and build business websites and
  online shops, then help keep them working. Tell me what your business needs and I'll
  suggest a sensible next step."
- Primary call to action "Discuss your project"; secondary "See my work".

Use actual work, realistic scopes and plain explanations. Remove public prose that argues
against templates, counts modules, names private source files or explains why a photograph
is missing. That does not justify fake proof: leave absent material unpublished and write a
complete page around what can be stated honestly (D-027 still applies).

Never promise "more sales", a search ranking or a security certification without evidence
and an appropriate scope. A case study may explain why a change should help without claiming
an unmeasured revenue increase.

## 4. Public website

### 4.1 Routes as built

Defined in `src/routes/index.tsx`. Public copy lives in `src/marketing/data/site.ts`; blog
content and work records are fetched from the API through `src/marketing/data/blog.ts` and
`src/marketing/data/work.ts`. Since 2026-10-10 a successful API answer, empty included,
decides what shows, and the static fallback is used only when the request fails (K-036). The
public surface is styled on the D-037 system (`docs/DESIGN-SYSTEM.md`). None of the 2026-10-10
changes is deployed yet.

| Route | Page | Content source |
|---|---|---|
| `/` | Home | `site.ts`, live blog and work |
| `/about` | About | `site.ts` |
| `/services`, `/services/:slug` | Services index and detail | `site.ts` `services` (four today; six approved, D-038) |
| `/pricing` | Pricing | `site.ts` `packages`, `addOns`, `alwaysIncluded`, `paymentTerms`, `faqs` |
| `/sectors` | Sectors | `site.ts` `sectors` |
| `/work`, `/work/:slug` | Work index and detail | `work.php`, static fallback in `work.ts` |
| `/resources`, `/resources/:slug` | Resources index and article | `site.ts` `insights` plus live blog |
| `/contact` | Contact | `site.ts`, posts to `contact.php` |
| `/privacy`, `/terms`, `/cookies` | Legal | `Legal.tsx` |
| `/verify/:id` | Certificate check | `verify.php` |
| `/p/:token` | Read-only shared proposal | `proposals.php` share token |
| `/login`, `/set-password` | Owner, staff and client sign-in; invite and reset completion | `auth.php` |

### 4.2 Page requirements

| Page | Role and content | Acceptance |
|---|---|---|
| Home | Service-led introduction, owner photograph if supplied, concise six-service overview grouped as "Websites" and "IT support", real work, delivery steps, permitted testimonial, enquiry call to action | A company buyer can identify offer, fit, proof and next step quickly on a phone; no missing-content panels |
| Services | Six offers in two groups, typical business needs, deliverables and exclusions, links to scope, pricing and work | Networking and hardware repair never appear; IT pages state remote or on-site coverage and area as confirmed by the owner |
| Service detail | Buyer problem, who it suits, scope, client responsibilities, process, indicative price if approved, one relevant project or FAQ, and a call to action | Content unique to the service; no invented turnaround or guaranteed commercial outcome |
| Pricing | Approved starting prices, inclusions, VAT treatment, extras, revisions, ongoing costs and payment schedule | Matches quotes and agreements; custom work clearly needs a scoped quote |
| Work | Published, approved client case studies first; own products and experiments separately and honestly labelled | No empty client-work row presented as evidence; filters only where useful |
| Work detail | Client and context with consent, problem, work performed, real screenshots, measured or qualitative outcome, services, year and link | Consent and alt text required; confidential details absent; truthful outcome |
| About | Named owner, real portrait, approach, relevant supported experience, location or service area, and the working relationship | No invented certifications, team size or biography |
| Sectors | Keep only genuine expertise with distinct useful examples; otherwise fold into Services and redirect the old route | No unsupported expertise or thin repeated search pages |
| Resources | Practical website and IT advice, categories based on actual articles, buyer guides where useful | Readable index, accessible links, latest published records, clear affiliate disclosure where it applies |
| Article | Summary, author and date, headings and lists, safe links, evidence, recommendations if relevant, a discreet service call to action | Body edit survives; affiliate links clickable; no raw unsafe HTML; route metadata correct |
| Contact | Name, email and message required; optional company, service and budget; privacy notice, response intent and working hours; booking link if configured | Clear errors and save state; keeps typed data after a failure; double submit guarded; no live sends in QA |
| Privacy, Terms, Cookies | Accurate trading identity, actual processing and providers, lawful basis, retention, rights, contact and genuine review dates | Owner reviewed, with professional review as appropriate; the notice matches the actual trackers and terms |
| Shared proposal | Recipient-friendly scope, exact total, version, expiry and acceptance route | No public indexing, no unrelated client data, revoked or expired link handled |
| Certificate verification | Keep only if certificates are actually issued; disclose minimum verification data | No searchable private information or implied accreditation |
| Login and reset | Clear owner and client sign-in, reset guidance, accessible errors, brand-compatible styling | Valid, expired and used reset cases tested; no demo credentials or staff-only wording for clients |
| Not found and errors | Useful explanation, return links, no technical paths or stack detail | A genuine HTTP status strategy for missing public records; private error pages stay private |

The homepage establishes service value before any studio philosophy. On a phone, keep the
headline and standfirst concise and let the hero support the service message. Show service
summaries above a long portfolio list. Pricing belongs in the main navigation if it is meant
to qualify buyers, not only in the footer.

**Content order for the home page:** a clear service-led hero; service choices; selected
complete work; how a project runs; the named owner and working approach; practical answers
about scope, timing and support; useful IT resources; the enquiry call to action. The page
should answer what GAkinz does, who does the work, who it helps, how engagement works and what
to do next, using real service details and permitted project evidence rather than
engineering counts or invented success claims.

Service pages cover suitable customers, deliverables, exclusions, process, evidence,
questions and the next step.

### 4.3 Services and buyer hooks

| Service | Draft hook | Proof to attach |
|---|---|---|
| Web design | "Help customers understand what you do and how to enquire." | Real page hierarchy and screens, and an explanation of a solved usability problem |
| Web development | "A website you can keep using and updating after launch." | Working handover, editing examples, agreed ownership and care options |
| Ecommerce | "Make products easier to find and the buying process easier to follow." | Real catalogue or checkout work, with private order and customer data removed |
| Website care | "A named person to contact when your website needs attention." | Defined coverage, working hours and the actual support process |
| General IT support | "Everyday IT problems sorted by someone who explains what went wrong." | Typical jobs (email and account set-up, device and software set-up, backups, Microsoft 365 or Google Workspace help), remote or on-site coverage, response expectation, price basis (hourly or block). Excludes networking installation and hardware repair |
| IT consultancy | "Straight answers before you spend money on technology." | A fixed-scope session or short written review; typical questions (which tools, what to replace, how to organise accounts and files); the deliverable is a written recommendation; price basis |

`site.ts` holds four services today and no prices for the two IT services. Those pages render
a price only once the owner supplies one; until then they say "Priced per job, ask for a
quote". Existing prices in `site.ts` (Starter £1,500, Business £3,500, Ecommerce £6,000,
Bespoke quoted, £180 per extra page, £350 copywriting, £600 brand mark, care £90 and £450 per
month, 40/30/30 terms) await the owner's confirmation and a stated VAT basis.

### 4.4 One published source for the website

| Information | Canonical home | Rule |
|---|---|---|
| Identity, contact, social links | `site.ts` today; a small public settings record later | Header, footer, About, legal pages and structured data read an allowlisted public projection; private configuration is never exposed |
| Service and pricing copy | `site.ts` | A controlled source until frequent changes justify a small editor; no page builder |
| Portfolio | Existing `work` records | Published and approved only; a private project produces a reviewed draft, never an automatic publication |
| Blog | Existing posts | Published list, detail and sitemap; drafts stay private; Content Hub is not a second authority |
| Testimonials | Existing records | Approved, attributed content only, with consent evidence |
| Booking URL | `book.php` response | Contact page and owner view share the value; hidden if missing; no fake live availability |
| Forms | Shared service labels and `contact.php` | Enquiry service and source fields align with the website; no second unlinked lead form |
| Social publication | Approved article or case-study URL plus a manual platform post | Store the destination URL and date if useful; never claim automatic cross-posting |

Static fallback content must be an intentional policy, not invisible resurrection of
unpublished records. Built 2026-10-10 (K-036): fallback only on failure. Still to build: the
owner's private API and content-health warning.
Private project records need a separate approved publication record: changing a private
milestone never publishes client information. Public forms create an enquiry once, with a
clear acknowledgement and abuse controls. Marketing subscriptions need consent separate from
an enquiry.

### 4.5 Search, sharing and performance

Use route-specific public HTML and metadata for service, work and article URLs, with accurate
canonical URLs and Open Graph previews (K-018). The static Vite build and `dist/` deploy stay;
the rendering choice is a later focused design decision, not grounds for a Next.js rewrite.

Static service pages can be prerendered. Work records and articles need a publication-aware
path, such as a narrow PHP metadata or rendered response, or an approved regeneration step. A
build-only solution must say that new content gets no fresh HTML until regeneration; it
cannot silently contradict "publish without deploy". Test hydration, links, real 404s and the
exclusion of private routes.

Generate sitemap entries from published public records with reliable change dates (K-019).
Private proposals and the portal never enter the sitemap, and robots directives do not
enforce privacy. Limit article and case-study images, use responsive sizes, reserve image and
ad space and lazy-load below the fold. Measure representative public pages on a mobile
connection before and after any ads. Targets follow Google's Core Web Vitals: LCP at most 2.5
seconds, INP at most 200ms and CLS at most 0.1 at the 75th percentile, with field evidence
once traffic supports it. A local unthrottled result does not prove them.

### 4.6 Customer access and the publication boundary

Public entry wording: "Already working with us? Access your project." It sits in the
navigation and footer and does not compete with the enquiry, which stays the main action on
service pages. Public work and testimonials are explicitly approved publication records,
never live views of private briefs, messages, measurements or feedback. Customer access rules
are in section 6.

## 5. The CMS

### 5.1 Modules as built

`src/app/modules/` holds the module components below, each wired into
`src/routes/index.tsx`, `src/lib/access.ts`, the sidebar and global search. The count of routed
screens is in `docs/STATUS.md` section 0.

| Module key | Route | Component | In the original brief? |
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
| `mailbox` | `/app/mailbox` | `Mailbox.tsx` | No. IMAP and SMTP mailbox |
| `design` | `/app/design` | `Design.tsx` | No. Figma review rounds |
| `devpipeline` | `/app/devpipeline` | `DevPipeline.tsx` | No. Repository, environments, deploy log |
| `resourcing` | `/app/resourcing` | `Resourcing.tsx` | No. Capacity and leave |
| `contracts` | `/app/contracts` | `Contracts.tsx` | No. Contracts and a staff-typed acknowledgement (K-034) |
| `knowledge` | `/app/knowledge` | `Knowledge.tsx` | No. Internal procedures and wiki |
| `content` | `/app/content` | `Content.tsx` | No. AI content hub |
| `blog` | `/app/blog` | `Blog.tsx` | No. Public blog authoring |
| `testimonials` | `/app/testimonials` | `Testimonials.tsx` | No. Public testimonials |
| `work` | `/app/work` | `Work.tsx` | No. The public work ledger, and which records lead the homepage hero (2026-10-14) |
| `site` | `/app/site` | `Site.tsx` | No. Site content: the public site's hero, services, process, pricing, FAQs and contact copy, saved as drafts and published (2026-10-14, D-046) |
| `files` | `/app/files` | `Files.tsx` | No. Per-project and per-client file storage |
| `careplan` | `/app/careplan` | `CarePlan.tsx` | No. Uptime, TLS expiry, care-plan revenue |
| `account` | `/app/account` | `Account.tsx` | No. My account for every role, client included: profile, two-factor, own sessions (2026-10-10) |

Module presence is verified. Feature completeness inside each module is **NOT TESTED** except
where `docs/STATUS.md` records a test.

### 5.2 Navigation: seven destinations

Decided in D-040. **As built on 2026-10-10 (not deployed):** the sidebar groups its entries
under these seven headings, relabels Dashboard, Leads, Proposals and Platform as Today,
Enquiries, Quotes and Settings, hides a group the role cannot use, and keeps every URL
(K-032). A client sees Client Portal and My account. Moving supporting tools inside their
records, and record search, are not built.

**As restyled on 2026-10-14 (D-046, not deployed):** My account and Sign out sit in the
sidebar footer rather than under Settings, and the Website group opens with Site content
(`/app/site`, `site` in `src/lib/access.ts`). Group headers fold and remember their state;
Enquiries and Support show counts of new enquiries and open tickets.

| Destination | Contents | Default view |
|---|---|---|
| Today | Follow-ups, calls, deadlines, waiting approvals, overdue invoices | Actions needing attention, then a few accurate totals |
| Enquiries | Enquiry list and detail, and simple booking records | New and overdue follow-ups |
| Clients | Contact details, history, conversations and portal preview | Searchable client list |
| Projects | Tasks, milestones, requests, approved files and notes | Active projects; archived records through a filter |
| Money | Quotes, agreements and invoices | Outstanding invoices and draft quotes |
| Website | Portfolio, articles, testimonials and profile links | Draft and published lists with preview |
| Settings | Business defaults, account, enabled integrations, audit and operations | Business details and My account |

The change is grouping and relabelling, not removing modules. Existing URLs stay while labels
and grouping change. Supporting tabs are shallow. Within a client record, show Overview, Work,
Messages, Files and Money only when relevant; a project holds its brief, milestones and
evidence without new top-level modules. Search finds client and project records as well as
navigation once safe search endpoints exist; a menu search is not a business-record search.

Client navigation is a separate small menu: Overview, My projects, Messages and support,
Shared files, Invoices and My account, each shown only once it is actually delivered.

A phone must support the essential daily actions. Complex invoice editing may use a
deliberate compact layout, but cannot require horizontal page scrolling.

### 5.3 The owner's routine

| Moment | Owner action | Information required |
|---|---|---|
| Start of the working day | Review Today and choose next actions | Unanswered enquiries and messages, confirmed calls, due milestones and overdue invoices; unavailable sources labelled |
| New enquiry | Read, clarify, qualify and set the next action | Contact, service interest, short brief, source and permission to reply |
| Discovery call | Offer or confirm a time, record the outcome | Time zone, date, duration, contact method, scope and next step |
| Accepted work | Convert once and create the project | Client ID, accepted quote version, agreement reference, dates and deliverables |
| During delivery | Update a milestone, share a message or request an asset | Visible next step, responsible person, due date and the shared or private distinction |
| End of the week | Review money and stalled work | Due invoices, verified receipts, overdue decisions and unsent drafts |
| Completion | Record the handover, ask for feedback, request publication permission separately | Delivered items, support terms, acknowledgement and feedback |

No weather, AI prompt or unused chart displaces these actions. An enquiry or client record
offers one obvious next action.

### 5.4 Complete journeys and their checks

| Journey | Required behaviour | Evidence to gather |
|---|---|---|
| Enquiry | Validated form, abuse control, durable save, honest acknowledgement, owner next action | A synthetic submission appears once; a retry cannot create unnoticed duplicates; a failure keeps typed data |
| Discovery call | Booking link or requested time, time zone, status and linked enquiry | A request is clearly different from a confirmed call; time zone and daylight-saving cases and reschedule tested |
| Quote | Scope, inclusions and exclusions, GBP total, VAT decision, expiry and agreed schedule | Saved quote equals the preview, PDF and shared view; an expired or revoked link fails appropriately |
| Acceptance | Record who accepted, when and which version; create one project and the agreed invoices | Double-click and concurrent requests do not duplicate client, project or invoices |
| Delivery | Tasks, due date, next milestone, client-visible update and requested assets | An internal note stays private; the client sees only the intended status |
| Payment | Accurate invoice, hosted provider or verified manual receipt, recorded reference | Correct total and currency, mismatch rejected, retries safe, receipt reconciled |
| Support | Client-owned issue and reply, clear status and owner reply | Client A cannot read or reply to B's ticket, file or invoice through altered IDs |
| Publish | Draft, preview, permission, publish and unpublish, metadata | Unpublished content is absent from public routes and the sitemap; a refresh shows current content |
| Recover | Backup, isolated restoration and owner access recovery | Restored database and files agree, permissions still enforced, incident procedure usable |

Do not add an "orders" table automatically. For bespoke services the accepted quote, client
and project form the order record. A separate order entity is added only if a defined
fixed-price checkout journey later needs it.

### 5.5 Module-by-module treatment

#### Dashboard to Today

Keep the useful totals and replace chart-heavy emphasis with an attention list: new
enquiries, follow-ups due, scheduled calls, overdue tasks, waiting client material and unpaid
invoices. Each item opens its record. A failed data source shows "Unavailable, retry", never
zero; the zero-on-failure defect is fixed in source (K-031). Show the last successful
refresh. Label revenue periods; cash received and work invoiced are different measures.

Acceptance: an offline invoice source cannot display "all on time"; no active record needs
cross-checking across six screens to find the next action. The AI brief is optional and not
needed to open the page.

#### Leads to Enquiries

Keep the stages New, Contacted, Proposal, Won, Lost. A list by default on phones, an optional
board on larger screens. Add a next-action date and a short owner note to each enquiry. Keep
source, budget and service interest optional. Preserve the lost reason and history. Use a
simple owner-set priority instead of AI scores.

Conversion links an enquiry to an existing client or creates one, keeps source and history,
and returns the linked record. Confirm duplicate email or company matches rather than
silently creating another client. Conversion exists today; its multi-step integrity and
concurrent behaviour need testing.

Acceptance: the full message is readable, one next action is visible, a status change rolls
back honestly on failure, and repeated conversion creates no duplicate.

**As built on 2026-10-10 (not deployed):** each enquiry carries a next-action date, a short
note and an owner priority (0 none to 3 high, separate from the AI score). The board marks
overdue and due-today items and filters to follow-ups due; Today has a follow-ups card that
shows unavailable, never zero, on failure. Needs the enquiries `ALTER` in `docs/DEPLOYMENT.md`
section 5.2. Conversion integrity is still untested.

#### Bookings, inside Enquiries

`book.php` only returns a configured Calendly URL; there is no booking table. Start with
manual recording: enquiry or client, start time, time zone, duration, meeting link or
location, a status of requested, confirmed, completed or cancelled, and notes. Confirm a slot
manually; link to the chosen scheduler if one is already used. An optional ICS download
avoids calendar OAuth.

Booking starts as a request with owner confirmation, never an instant purchase or a
guaranteed appointment. Reschedule the existing record and keep its history. Record
cancellation and rescheduling and notify the customer through the approved transport, with
retries visible to the owner. No custom availability engine, round-robin scheduling,
reminder service, SMS automation, recurring booking engine or paid booking checkout.
Automatic scheduler import is a later decision needing a sandbox.

Acceptance: no request is labelled confirmed too early; local time is clear; a cancellation
is visible; the owner can record a phone booking without a public form.

#### Clients

One record holds company or trading name, main contact, email and phone, active projects,
invoices, quote links, conversations and shared files. Main contact first; extra contacts
only when a real account needs them. Keep tags light. Separate confidential owner notes from
client-visible information. Provide archive and an export path for lawful data requests
instead of automatic deletion of financial history.

Acceptance: the owner can answer "what happened with this client?" from one timeline, and
changing a contact updates future communications without altering issued documents.

#### Projects and tasks

Keep stage and status apart only where it helps: stage describes the work, status says
active, on hold or complete. Default to a task list with due date, checklist and owner; the
board stays optional. Add one client-visible progress note, one next milestone and an asset
request checklist. Start with a manual template for common delivery, not a template designer.

Files and signed agreements sit inside the project view. Completion shows unresolved tasks
and requests and allows a deliberate owner decision. A completed internal project never
becomes a public portfolio record automatically.

Acceptance: long names and lists work on phones, edits keep entered content after errors, and
completing a task never publishes internal notes.

#### IT support and consultancy jobs

Neither service needs a new module. An IT support job is a support ticket against the client
plus time recorded in Time, then an invoice line when billable. Time entries require a
`project_id` and carry the `billable` flag (`server/time.php`, `server/schema.sql`); tickets
have no billable flag. So each support client gets one standing "IT support" project that
holds its tickets' time, rather than a new ticket-billing field. A consultancy engagement is a
small project with a brief, the agreed questions as tasks and a written recommendation as the
deliverable file. The enquiry form gains the two service options, with the same labels as the
website.

Acceptance: a remote support session can be logged, timed, resolved with a note and invoiced
from one client record; a consultancy project closes with its recommendation file shared to
the client portal.

#### Proposals to Quotes

Reuse the line-item builder and sharing. Show deliverables, exclusions, revision allowance,
costs, expiry and payment schedule in plain language. Warn before acceptance creates a project
and staged invoices. Acceptance splits the **ex-VAT** subtotal 40/30/30, due at acceptance, +30
and +60 days, and stores the quote's VAT rate on each invoice (`server/proposals.php`). This is
existing behaviour awaiting the owner's review, not a universal business rule, and it does not
change silently into milestone billing. The confirmation previews each instalment with VAT.

Two acceptance guards are required before any real quote is accepted: accept only from the
sent state, and make conversion single-use. Both are in source since 2026-10-10 and not yet
uploaded (K-028, D-035).

The first release records explicit acceptance received by email, with reference and date. If
clients later accept in the portal, bind acceptance to the authenticated client, the quote
version and the exact terms. Staff clicking Accept is not proof the client agreed. Revoke
share links and limit their exposure.

Acceptance: changing an agreed quote needs a revision rather than rewriting accepted terms;
repeated and concurrent acceptance is safe; expired or declined records cannot convert.

#### Contracts and agreements

Keep an approved service agreement attachment and reference against the quote or project.
Templates must reflect the actual terms and be professionally reviewed as appropriate. The
existing typed-name signing is staff-only (K-034), so its label and evidence must not imply a
verified client signature. Use an externally signed document or a manual acknowledgement at
first. A full signing product, certificate chain or bespoke legal assurance system is not
needed. Never destroy the signed version through later template edits.

Acceptance: the owner can identify the exact agreed version and acceptance evidence, and the
interface says whether an acknowledgement is recorded or the client has independently signed.

#### Invoicing and payments

Keep line items, numbered invoices, GBP, due date, status and PDF. Confirm VAT registration and
rate before any default. Show subtotal, tax and payable total consistently. Add a verified
manual payment reference, date and amount. Keep bank-transfer reconciliation simple. Do not
build bookkeeping, tax filing or reconciliation feeds.

One tested hosted provider first: Stripe, because it already has a signed webhook (D-034).
Stripe now charges the VAT-inclusive total and its webhook checks amount and currency (K-025,
fixed in source); invoices already paid through Stripe must be checked against their
VAT-inclusive totals. PayPal stays hidden until it has a verified webhook or a manual
reconciliation step (K-026). Client-facing success and cancel destinations return to that
client's invoice or portal, not the owner's staff screen. A browser return alone does not
prove payment.

Keep enough payment audit data for duplicate events and disputed receipts, not a full ledger.
Record refunds and credits safely if used; "paid" never means refunded. Partial payments are
handled through separate agreed instalment invoices rather than a payment allocation engine,
subject to the owner's confirmation.

Acceptance: invoice, PDF, portal and provider totals agree; 0% and approved positive VAT cases
pass; rounding is defined; mismatch, retry, partial and cancelled cases do not mark the wrong
invoice paid. Real payment tests are prohibited.

#### Portal

Start with a clear project summary, owner contact, next step, outstanding invoice and support
access. Progress percentages from task counts need context: many small tasks done must not
imply a major milestone is approved. Add only client-approved shared files and a simple
acknowledgement record when needed.

Clients must not see global search results, other client selectors, internal estimates, staff
notes, all-client notifications or owner Settings. Serve the minimum fields rather than
trusting hidden interface. Tie identity to the authenticated client in every child endpoint.

Acceptance: two unrelated synthetic clients are tested across GET, POST, downloads and guessed
or shared identifiers, and each sees only its own permitted data. Staff preview is labelled and
restricted.

#### Support

Reuse the existing ticket and reply model and statuses. `support.php` requires STAFF for
create and reply, so customer messaging needs a new ownership-checked client branch, not just
a portal button (K-039). The owner can classify urgency, reply and close with a resolution
note. The client branch permits creation and replies only within the verified client account.
Put "Need help?" inside the project and portal. Do not promise response times unless owner
capacity and a service agreement support them.

Acceptance: a reply keeps its draft on failure, status and priority changes are audited, and
client ownership is checked on create, list, detail and reply. SLA engines, AI triage and
omnichannel bots are deferred.

**As built on 2026-10-10 (not deployed or uploaded):** the client branch exists (K-039). A
client lists, reads, starts and replies to its own tickets from the portal's Messages area,
which keeps typed text on a failed send and guards double submits. Ownership is checked on
list, detail, create and reply with two synthetic clients. Attachments, project linking and
"Need help?" inside a project are not built.

#### Comms and Mailbox

Keep one project and client conversation history. Distinguish "Record note", "Record call" and
"Send email" clearly. Several Comms channel labels are records rather than deliveries (D-014):
show "Recorded" against "Sent" with failure status, and never imply WhatsApp delivery from an
internal note.

At first, use the owner's existing mailbox externally and log important decisions. Keep the
in-app IMAP and SMTP only if it reduces daily work and is safely configured. No full email
client, scheduled sender, social inbox or chat infrastructure. Client portal messaging reuses
ticket threads before any second conversation system.

Acceptance: internal notes never leave the application; a failed send is never shown as
delivered; tests use a mail sink; no real message is sent during QA.

#### Files

Reuse server storage with client and project association. Surface uploads where they are
needed rather than leading with a global file browser. Separate private client material from
approved portfolio media. Explain formats and the size limit before upload. File names and alt
text are readable; share permission, link expiry and revocation, and download auditing need
review.

Portfolio images may use permanent public share tokens (D-029). Private project files are never
reused as public images without a deliberate, reviewed publication copy and consent. Check old
uploads and download headers separately from the newer allowlist code.

Acceptance: upload and download ownership, MIME and extension mismatch, an oversized file, a
missing file and a revoked link are tested with synthetic material; the uploads path is
inaccessible in the target host configuration.

#### Website: Blog, Work, Testimonials and Content Hub

Group these as Portfolio, Articles, Testimonials and Draft ideas. The destructive blog edit is
fixed in source (K-016). Add a safe preview and explicit draft, publish and unpublish. Articles
support headings, paragraphs, lists and safe links (K-037), plus optional recommendation
blocks (`docs/CONTENT-AND-GROWTH.md`), never a general page builder.

Work starts with a short case-study form and optional details, rather than forcing every field
on a phone. Keep the client-permission and alt-text checks. Testimonials need attribution and
consent and a visible approved state. Public excerpts never expose private client emails.

Content Hub becomes optional drafting help, not a second canonical blog. Approved content
belongs in posts; social drafts can reference its URL. AI cannot publish or send by itself. No
confidential record goes to a model without a defined purpose and reviewed provider and data
terms.

Acceptance: a save and edit round trip keeps the body, a duplicate slug is rejected, preview
cannot expose another client's data, unpublish removes discovery links, and a website refresh
shows the latest published record.

**As built on 2026-10-10 (not deployed):** the blog edit keeps the body (K-016); unpublishing
removes a post or work record from the public site (K-036); articles support `##` and `###`
headings, bullet and numbered lists, bold and safe links, with `{sponsored}` for affiliate
links (K-037). Preview, recommendation blocks and the grouping into Portfolio, Articles,
Testimonials and Draft ideas are not built.

#### Platform to Settings and My account

Separate owner business settings from user account settings. Business: trading identity,
invoice defaults, contact and social links, enabled integrations and operational status. My
account: name, password and reset, own sessions, and two-factor with a recovery path (K-023,
K-024). Keep the seven server roles and simplify how they are presented.

No configurable automation. Disabled integrations stay quiet and explain their setup only in
Settings. API keys stay on the server. Audit entries answer who changed what and when, without
logging message bodies or passwords.

Acceptance: every signed-in role can manage its own sessions and security through
independently checked ownership; none can manage another user's; the owner sees no unusable
account links.

**As built on 2026-10-10 (not deployed):** My account at `/app/account` for every role, client
included, with a read-only profile, two-factor setup and recovery codes, and signed-in devices
with revoke; the user menu links there (K-023, K-024). Server tests confirm each action
touches only the caller. Name and password changes from My account, and the business-settings
split of Platform, are not built.

#### Analytics and Time

Analytics is a few labelled summaries: collected revenue, overdue money, enquiry sources,
conversion and active projects, calculated from real data with the date period and definition
stated. No predictive growth dashboard or custom report builder.

Time stays optional, with manual entry and a simple timer if already used. Keep billable and
non-billable and the project link; hide staff approvals and rate complexity for a sole owner.
No payroll. Add profitability only once cost and time data is dependable.

Acceptance: sample totals reconcile to the underlying invoices and time records; unavailable
sources never become zero; time records cannot be edited across owners without permission.

#### Remaining modules

| Module | Treatment | Minimum acceptance if kept |
|---|---|---|
| Design | Optional project review notes and links, no Figma markup product | Real review version and client visibility recorded |
| Dev Pipeline | Owner-only project links and launch checklist; no client-site generator or deploy automation | Links and status are factual; no deploy button exposed without explicit authority |
| Resourcing | Hidden by default for sole-owner operation | Existing records preserved; no leave or capacity engine built |
| Care Plan | Optional support agreement, renewal and next service date | Price and coverage correct; monitoring off unless approved and tested |
| Knowledge | Short reusable checklists and help notes inside Settings or Support | Owner notes kept apart from deliberately published help |

### 5.6 Small additions worth making

These are additions or completion work, not claims of current support. Most appear with phase,
size and dependency in section 7.

- **First:** enquiry next-action date; linked call record; unified client timeline; asset
  checklist; quote acceptance reference and version; verified manual payment reference;
  own-account security access; unavailable-data states; draft protection; archive and safe
  export.
- **Next:** approved portfolio publication checklist; safe article links and recommendation
  blocks; business and social-link settings; a published sitemap; simple source reporting.
- **Optional later:** ICS export, one project template, an occasional recurring care reminder.

Every addition must either reduce repeated owner work or help a client complete an action.
Reject a feature that needs another service or account without a measured need.

## 6. Customer access and client journeys

### 6.1 Customer reference and verified identity

Give an enquiry or project a stable, human-readable reference, shown in the acknowledgement,
agreed documents and portal. A reference identifies work; it is not a password and never
authorises access by itself. Never reveal a name, invoice, project existence or message
because a visitor knows or guesses a reference.

**Phase 1 uses the existing client password sign-in only** (D-043). The reference plus email
link comes later, and only after scenario J03 passes (`qa/TEST-PLAN.md`). When it does: ask
for the reference and the registered email, return the same neutral response whether they
match or not, and send a verified email link into the existing client-role portal. No second
account platform. The final owner and client sign-in policy is confirmed before that work
starts.

Owner access honours two-factor on every route, and customer-only links never become owner
sign-in or account recovery. The magic-link and Google sign-in bypass is fixed in source
(K-027, D-033). Existing sign-in availability is not evidence that a new flow is safe.

Use securely generated tokens, store their hashes, limit expiry and attempts, consume once
atomically and revoke sessions when appropriate. Keep tokens out of analytics, logs and shared
URLs. Private access pages carry no advertising, affiliate scripts or public indexing. A lost
email or reference follows a controlled recovery process, never a public search by company
name. OWASP's forgot-password and multi-factor guidance informs token handling and neutral
responses; it is a pattern reference, not a ready-made implementation.

The server derives client identity from authenticated membership; the browser cannot choose
another client ID (D-010). Each authorised company contact has its own identity linked to the
client. A project reference cannot widen membership. Keep company-level portal access unless a
real need for project-level restriction appears. No permission matrices in advance.

### 6.2 What a customer can do

| Action | Permission and result |
|---|---|
| Check progress | Read explicitly shared milestones, next step, agreed dates and shared documents for their client |
| Send a message | Create a project-linked conversation or reply to an owned ticket; see submitted, sending and failed states |
| Request an update | Send a clear question to the owner; internal tasks and estimates stay hidden |
| Supply details and assets | Update permitted brief fields or upload approved file types into the owned project |
| Change contact details | Edit permitted details; re-verify a changed email and notify the previous address |
| Request another call | Submit proposed availability and await owner confirmation |
| See invoices | Read own invoices and the approved payment route; never change totals, tax or paid status |
| Give feedback | Submit private delivery feedback; publication permission is a separate choice |

Extend the support ownership checks and reuse its records rather than introduce a competing
messaging system (K-039). Test list, detail, create, reply and attachments separately. Private
owner notes never travel in client responses. Customer edits never alter agreements, financial
records, audit history or another contact's identity.

**Notifications.** One route at first, preferably email plus an in-app unread marker. Notify
without putting confidential contents into subjects or broad previews. Show delivery failures
to the owner and avoid duplicate sends on retry. WhatsApp stays an optional business contact
link, not an API integration or the record store. Record important decisions against the
client or project.

### 6.3 Feedback and publication permission

At handover, offer a short form: an optional rating, what worked, what could improve and
whether follow-up is welcome. Support never depends on a public review. No automated sentiment
scoring, reward schemes or review gating.

A private feedback record holds the client and project link, submission date, text and
follow-up state. A separate public-testimonial request names the proposed excerpt, attribution
and publication permission. The default is private. The existing approved-testimonial list
does not replace evidence of consent. Only approved, permitted content reaches the website;
keep the withdrawal process clear and record what was published. The ASA's testimonial
guidance supports keeping evidence of genuine statements and permission, and a testimonial
does not by itself substantiate a technical or revenue claim. The privacy notice explains
retention and customer rights.

### 6.4 Project brief and measurements under a client ID

"Measurement" means agreed scope and delivery or quality evidence for now; a different meaning
needs the owner's confirmation before implementation. Keep a small brief inside the existing
project, linked to its client ID and project ID:

- Problem, intended users and agreed outcome.
- Deliverables, exclusions, required client assets and the approved quote reference.
- Milestones, dates, next action and outstanding decisions.
- A few meaningful measurements with dated evidence.
- Handover checklist, support boundaries and completion acknowledgement.

No field is required to open a project. Start with a useful brief and complete it
progressively. One reusable template is enough. No specification editor, dependency graph,
project-management suite or custom-field builder.

| Work type | Example measurement | Evidence and limitation |
|---|---|---|
| Business website | Agreed pages, working enquiry route, phone and keyboard usability | Page inventory and synthetic acceptance checks; delivered pages do not prove conversion |
| Ecommerce | Agreed catalogue scope and tested checkout cases | Sandbox outcomes and record references; never real orders as test fixtures |
| Website care | Agreed issue resolved and handover recorded | Reproduction, result, client acknowledgement and next review date |
| General IT support | Reported issue resolved, cause explained, time spent | Ticket with reproduction, fix note, client confirmation and a time entry on the client's IT support project; no networking or hardware repair |
| IT consultancy | Agreed questions answered | Written recommendation delivered as a shared file, client acknowledgement, follow-up date if any |

Each measurement records target, baseline where available, actual result, date, environment,
method and evidence location. Technical checks use PASS, FAIL, PARTIAL or NOT TESTED. Business
outcomes such as enquiries or sales are separate observations with a time window and caveats.
No dashboard score without an intelligible basis.

### 6.5 GEE OS handoff

Development work uses the installed GEE OS existing-application workflow on the owner's
computer. The CMS supplies a small, owner-approved brief and checklist, never agent execution.
A manual sanitised export is enough at first: project reference, approved scope, acceptance
criteria, decisions and non-sensitive evidence links.

Client personal data, secrets, live sessions and confidential documents stay out of exported
agent context by default. No CMS shell execution, remote development agents, automatic
deployments, repository provisioning or generated client websites. Machine details stay in GEE
OS local context and project facts stay with the project. A client ID connects business
records; it never becomes a global memory namespace for confidential content.

Record the approved implementation batch and its evidence back into the project by hand.
Customers see a plain delivery update, never internal hooks, agent prompts or development
logs.

## 7. Planned features

The single list of what to build or finish. It adds no scope beyond sections 4 to 6. "Today"
records the repository state on 2026-10-10; "exists" means the code is there, not that it is
tested. **Phase** is the delivery phase in `docs/STATUS.md` section 2. **Size**: S is about a
day or less of focused work, M is a few days; both are rough planning guides, not estimates.

### Daily work

| Feature | Why it helps | Today | Phase | Size | Depends on |
|---|---|---|---|---|---|
| Today screen: replies due, calls, deadlines, waiting client material, overdue invoices | One place to start the day; each item opens its record | Dashboard exists, chart-led | 3 | M | Unavailable states |
| "Unavailable, retry" instead of £0 when a source fails | Stops false reassurance such as "All on time" | Fixed in source 2026-10-10 (K-031) | 1 | S | None |
| Seven-item navigation | Fewer decisions; other tools sit inside records | Grouped into seven, 2026-10-10 (K-032); tools not yet inside records | 3 | M | None; URLs kept |
| Record search across clients and projects | Find a client quickly from a phone | Menu search only | 3 | M | Safe search endpoint |
| My account for every role: profile, password, two-factor, own sessions | Fixes two dead links and admin-only security (K-023, K-024) | Built 2026-10-10 without name or password change | 2 | M | Ownership checks |

### Enquiries and bookings

| Feature | Why it helps | Today | Phase | Size | Depends on |
|---|---|---|---|---|---|
| Next-action date and short note on each enquiry | Nothing goes cold unnoticed | Built 2026-10-10; needs the SQL step | 2 | S | None |
| Simple priority set by the owner | Replaces AI scoring | Built 2026-10-10; needs the SQL step | 2 | S | None |
| Call record: requested or confirmed time, time zone, link, outcome | Bookings tracked against the enquiry | `book.php` returns a Calendly link only | 2 | M | None |
| Optional calendar file (ICS) for a confirmed call | Adds to any calendar without OAuth | Missing | Later | S | Call record |
| Convert enquiry to client once, matching existing email or company | No duplicate clients | Exists, untested for duplicates | 2 | S | Synthetic tests |
| Six service options on the enquiry form with the website's labels; budget bands that fit small IT jobs | Clean source data | Five project types that do not match service names; lowest budget band "Under £5k" (`Contact.tsx`) | 4 | S | Services and prices approved |

### Clients and portal

| Feature | Why it helps | Today | Phase | Size | Depends on |
|---|---|---|---|---|---|
| One client timeline: enquiries, calls, quotes, projects, invoices, messages | Answers "what happened with this client?" | Spread across modules | 2 | M | None |
| Private owner notes kept apart from client-visible information | Nothing internal leaks | Partly | 2 | S | None |
| Client portal: project summary, next step, invoices, shared files | Clients help themselves | Read-only portal exists | 2 | M | Isolation tests |
| Client messages through support tickets | Two-way conversation without a new chat system | Built 2026-10-10 (K-039) | 2 | M | Client branch in `support.php` |
| Request an update, request a call, supply assets | Fewer chasing emails | Missing | 2 | M | Client messages |
| Private delivery feedback, with separate permission to publish | Honest feedback and lawful testimonials | Missing | 2 | S | Client messages |
| Project reference on documents; reference plus email link sign-in | Access without another password | Missing | After J03 | M | K-027 fixed and J03 passing |

### Quotes and money

| Feature | Why it helps | Today | Phase | Size | Depends on |
|---|---|---|---|---|---|
| Accept only from sent; convert exactly once | Prevents wrong or duplicate projects and invoices | Fixed in source 2026-10-10 (K-028) | 1 | S | None |
| Schedule preview with VAT before acceptance | No surprise invoices | Built 2026-10-10 (D-035) | 2 | S | None |
| Acceptance evidence: who, when, which version | Proof of the agreed scope | Staff click only | 2 | S | None |
| Stripe charges the VAT-inclusive total; webhook checks amount and currency | Stops silent VAT loss | Fixed in source 2026-10-10 (K-025) | 1 | M | Sandbox fixtures |
| PayPal hidden until it has a webhook | Avoids unrecorded payments | Switched off 2026-10-10 (K-026) | 1 | S | None |
| Manual payment record: reference, date, amount | Bank transfers reconciled simply | Missing | 2 | S | None |
| Owner-triggered payment reminder | Chase money without automation | Partly | 2 | S | Mail sink for tests |
| Safe CSV export with formula prefixes neutralised | Spreadsheet safety | Fixed 2026-10-10 (K-030) | 2 | S | None |

### Projects and IT jobs

| Feature | Why it helps | Today | Phase | Size | Depends on |
|---|---|---|---|---|---|
| Task list with due dates, one next milestone, one client-visible progress note | Clear delivery without a project suite | Tasks exist | 2 | S | None |
| Asset request checklist | Clients know what to send | Missing | 2 | S | Portal |
| Project brief and agreed measurements under the client ID | Scope and evidence in one place (section 6.4) | Missing | 2 | M | None |
| Standing "IT support" project per support client; tickets plus billable time | Bill IT support without a new module | Time requires a project | 2 | S | None |
| Consultancy project closes with a shared recommendation file | A clear consultancy deliverable | Files exist | 2 | S | Portal files |
| Manual sanitised GEE OS handoff export | Plan development safely on the owner's computer | Missing | 3 | S | Project brief |
| One reusable project template | Faster set-up | Missing | Later | S | None |

### Website and content

| Feature | Why it helps | Today | Phase | Size | Depends on |
|---|---|---|---|---|---|
| Target design on both surfaces (D-037), Sofia Sans, one light and one dark CMS theme | One consistent look (`docs/DESIGN-SYSTEM.md` section 10) | Public surface built 2026-10-10; CMS not started | 3 to 4 | M | Font licence confirmed |
| Hero and section motion with a reduced-motion fallback | An original feel without hurting speed | Built on the public surface 2026-10-10 | 4 | M | Design tokens |
| Six service pages with buyer hooks, scope, exclusions and price basis | Services up front for companies | Four pages | 4 | M | Prices approved |
| Blog edit that keeps the body | Safe content editing | Fixed in source 2026-10-10 (K-016) | 1 | S | None |
| Safe article format: links, lists, recommendation blocks | Needed for affiliate links | Links, lists and bold built 2026-10-10 (K-037); recommendation blocks not built | 4 | S | None |
| Publish and unpublish that really removes content | Fallback no longer resurrects posts | Fixed 2026-10-10 (K-036) | 4 | S | None |
| Route-specific metadata and a sitemap from published records | Search and share previews | Static (K-018, K-019) | 4 | M | Rendering choice |
| Replace "to supply" gaps and engineering counts with real content | A professional public site | Engineering counts removed 2026-10-10; "to supply" gaps remain (K-038) | 4 | M | Owner content |
| Business and social links held in one settings record | Header, footer and structured data stay consistent | Hard-coded in `site.ts` | 4 | S | Profiles created |
| "Already working with us?" link in header and footer | Client access without competing with the enquiry | Missing | 4 | S | Portal |

### Monetisation and social

| Feature | Why it helps | Today | Phase | Size | Depends on |
|---|---|---|---|---|---|
| Amazon disclosure statement and labelled recommendation blocks | Compliant affiliate income | None | 5 | S | Safe article format |
| Certified consent platform (CMP) | Required before AdSense in the UK | None | 6 | M | AdSense approval |
| One or two reserved ad slots on articles only | Secondary income without hurting enquiries | None | 6 | S | CMP |
| Five profiles from the profile kit | A consistent company presence | Not created | 5 | S | Owner checks handles |

Policies for the last group are in `docs/CONTENT-AND-GROWTH.md`.

## 8. Deliberately not doing

**Not built, by decision:** a website or page builder; a drag-and-drop or block editor;
multi-company tenancy; payroll, leave or capacity planning; full accounting or accounting
sync (Xero and QuickBooks would each need a full OAuth application and a sandbox); multi-currency;
a custom calendar or availability engine; SMS or WhatsApp API messaging; social scheduling or
auto-posting; AI scoring, forecasting or auto-replies; a client e-signature product; Gantt
charts and task dependencies; a custom report builder; Zapier or Make automations; Amazon
price scraping or a product API; a second messaging system beside support tickets; autonomous
agents; custom analytics platforms; complex permissions; networking or hardware repair
services.

**Existing boundaries, kept:**

- **No third-party storage backend.** Files are stored on the server under `server/uploads/`.
  Drive, Box and Dropbox are not built.
- **No meeting creation.** Zoom and Google Meet are not built. Calendly is a link only, through
  `server/book.php`.
- **Not a Progressive Web App.** There is no manifest and no service worker in `public/`.
- **No migration runner.** Schema changes are commented SQL at the foot of
  `server/schema.sql`, applied by hand (D-008).

Existing records and modules are preserved until an exact retirement proposal is approved.
Anything here can be reconsidered only through a dated decision that names the repeated need
and the maintenance cost.

---

## Appendix A. The original brief's modules

The retired `GAkinzOS.html` brief described 12 modules. Its cover stated 168 features, of
which 52 were AI features, across 8 core asks and 1 platform. Read from its `MODULES` array:

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

The full brief, with its per-feature descriptions, remains in git history
(`git show c57eb4a:GAkinzOS.html`).

## Appendix B. Original brief feature register

Extracted from the brief's `MODULES` array on 2026-10-10. **The cover's 168 features and 52
AI features do not match the array, which holds 175 feature entries, 55 of them marked
`ai:true`** (re-counted on 2026-10-10). Counts refer to entries, not distinct capabilities;
repeated concepts such as profitability or accounting appear in more than one module.

Disposition is the approved product scope, not a completed-feature scorecard:

- **CORE** completes or verifies a required simple journey.
- **OPTIONAL** keeps a useful existing function quietly, adding to it only after demand.
- **DEFER** is outside the release.

**AI rule:** every AI row is DEFER for launch. Any later use needs owner review, data and
privacy controls and a demonstrated benefit; AI may later help with owner-reviewed drafting,
never sending or publishing. No row claims runtime support.

The modules added beyond the original twelve are treated individually in section 5.5:
Mailbox, Design, Dev Pipeline, Resourcing, Contracts, Knowledge, Content Hub, Blog,
Testimonials, Work, Files and Care Plan.

Review CORE first, then any OPTIONAL feature the owner uses today. Keep DEFER out of launch
estimates and navigation. Reclassify only through a dated decision that explains the user
journey and the maintenance cost. At implementation, record the actual endpoint or component
and a suitable test for each core capability, rather than ticking it off because a module
exists. The register does not mandate 175 tasks: several rows collapse into one usable screen
or one tested journey.

### Studio Dashboard

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Pipeline value board | CORE | Required journey. Acceptance: section 5.5, “Dashboard to Today”. |
| Active projects status | CORE | Required journey. Acceptance: section 5.5, “Dashboard to Today”. |
| Money owed counter | CORE | Required journey. Acceptance: section 5.5, “Dashboard to Today”. |
| Hours this week | OPTIONAL | Keep if already used; no new build without repeated need. |
| Deadlines this week | CORE | Required journey. Acceptance: section 5.5, “Dashboard to Today”. |
| Needs attention list | CORE | Required journey. Acceptance: section 5.5, “Dashboard to Today”. |
| AI morning briefing | DEFER | AI deferred (rule above). |
| AI revenue forecast | DEFER | AI deferred (rule above). |
| AI capacity warning | DEFER | AI deferred (rule above). |
| AI at-risk project flag | DEFER | AI deferred (rule above). |
| AI cash-flow alert | DEFER | AI deferred (rule above). |

### Leads & Enquiries

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Website enquiry capture | CORE | Required journey. Acceptance: section 5.5, “Leads to Enquiries”. |
| Visual pipeline board | OPTIONAL | Keep if already used; no new build without repeated need. |
| Lead profile | CORE | Required journey. Acceptance: section 5.5, “Leads to Enquiries”. |
| Source tracking | CORE | Required journey. Acceptance: section 5.5, “Leads to Enquiries”. |
| Follow-up reminders | CORE | Required journey. Acceptance: section 5.5, “Leads to Enquiries”. |
| Lead-to-client conversion | CORE | Required journey. Acceptance: section 5.5, “Leads to Enquiries”. |
| Activity timeline | CORE | Required journey. Acceptance: section 5.5, “Leads to Enquiries”. |
| Discovery call booker | CORE | Existing endpoint is a link only. Add a small manual call record; no calendar engine. |
| Intake questionnaire | OPTIONAL | Keep if already used; no new build without repeated need. |
| Lead value estimator | OPTIONAL | Keep if already used; no new build without repeated need. |
| Referral source report | OPTIONAL | Keep if already used; no new build without repeated need. |
| AI lead scoring | DEFER | AI deferred (rule above). |
| AI enquiry responder | DEFER | AI deferred (rule above). |
| AI project brief from chat | DEFER | AI deferred (rule above). |
| AI follow-up writer | DEFER | AI deferred (rule above). |
| AI spam / tyre-kicker filter | DEFER | AI deferred (rule above). |
| AI budget detector | DEFER | AI deferred (rule above). |

### Clients (CRM)

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Client profile | CORE | Required journey. Acceptance: section 5.5, “Clients”. |
| Multiple contacts per client | OPTIONAL | Keep if already used; no new build without repeated need. |
| Project history | CORE | Required journey. Acceptance: section 5.5, “Clients”. |
| Communication log | CORE | Required journey. Acceptance: section 5.5, “Clients”. |
| Client files & brand assets | CORE | Required journey. Acceptance: section 5.5, “Clients”. |
| Client tags | CORE | Required journey. Acceptance: section 5.5, “Clients”. |
| Quick links to portal | CORE | Required journey. Acceptance: section 5.5, “Clients”. |
| Retainer tracking | OPTIONAL | Keep if already used; no new build without repeated need. |
| Renewal & check-in reminders | OPTIONAL | Keep if already used; no new build without repeated need. |
| Client health score | DEFER | Do not replace a next-action date with an invented score. |
| Birthday / milestone nudges | DEFER | Unnecessary contact-data collection and maintenance for this scope. |
| AI upsell suggester | DEFER | AI deferred (rule above). |
| AI re-engagement drafts | DEFER | AI deferred (rule above). |
| AI client summary | DEFER | AI deferred (rule above). |
| AI churn risk | DEFER | AI deferred (rule above). |

### Projects & Tasks

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Project workspace | CORE | Required journey. Acceptance: section 5.5, “Projects and tasks”. |
| Milestones | CORE | Required journey. Acceptance: section 5.5, “Projects and tasks”. |
| Task lists with assignees | CORE | Required journey. Acceptance: section 5.5, “Projects and tasks”. |
| Deadlines & due dates | CORE | Required journey. Acceptance: section 5.5, “Projects and tasks”. |
| Kanban board | OPTIONAL | Keep if already used; no new build without repeated need. |
| Project status | CORE | Required journey. Acceptance: section 5.5, “Projects and tasks”. |
| File attachments per task | OPTIONAL | Keep if already used; no new build without repeated need. |
| Project templates | OPTIONAL | Keep if already used; no new build without repeated need. |
| Gantt timeline view | DEFER | Dates and next milestone first. |
| Design-to-dev handoff checklist | OPTIONAL | Keep if already used; no new build without repeated need. |
| Dependencies | DEFER | Simple task checklist first; no dependency scheduling engine. |
| Launch checklist | CORE | Required journey. Acceptance: section 5.5, “Projects and tasks”. |
| Recurring tasks | DEFER | Outside the simple owner/client release; do not add a new tool or subsystem. |
| AI task breakdown | DEFER | AI deferred (rule above). |
| AI deadline predictor | DEFER | AI deferred (rule above). |
| AI scope-creep alert | DEFER | AI deferred (rule above). |
| AI status update writer | DEFER | AI deferred (rule above). |
| AI workload balancer | DEFER | AI deferred (rule above). |
| AI standup summary | DEFER | AI deferred (rule above). |

### Proposals & Quotes

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Branded proposal builder | CORE | Required journey. Acceptance: section 5.5, “Proposals to Quotes”. |
| Line-item quotes | CORE | Required journey. Acceptance: section 5.5, “Proposals to Quotes”. |
| E-signature sign-off | DEFER | Defer bespoke signing. Record genuine acceptance and approved signed document first. |
| Sign-off tracking | CORE | Required journey. Acceptance: section 5.5, “Proposals to Quotes”. |
| Auto-convert to project | CORE | Existing branch creates project and three invoices. Sent-state check and single-use guard added in source 2026-10-10 (K-028); consequences previewed. |
| Proposal templates | OPTIONAL | Keep if already used; no new build without repeated need. |
| Tiered packages | OPTIONAL | Keep if already used; no new build without repeated need. |
| Optional add-ons | OPTIONAL | Keep if already used; no new build without repeated need. |
| Expiry & follow-up | CORE | Required journey. Acceptance: section 5.5, “Proposals to Quotes”. |
| Deposit on sign-off | DEFER | Outside the simple owner/client release; do not add a new tool or subsystem. |
| AI proposal drafter | DEFER | AI deferred (rule above). |
| AI scope writer | DEFER | AI deferred (rule above). |
| AI pricing helper | DEFER | AI deferred (rule above). |
| AI win-rate predictor | DEFER | AI deferred (rule above). |
| AI objection responder | DEFER | AI deferred (rule above). |

### Invoicing & Payments

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Auto-invoice | OPTIONAL | Keep if already used; no new build without repeated need. |
| Branded invoice PDF | CORE | Required journey. Acceptance: section 5.5, “Invoicing and payments”. |
| Online payment link | CORE | Stripe undercharged VAT (K-025, fixed in source 2026-10-10) and PayPal has no webhook (K-026). Stripe first after sandbox tests; PayPal hidden. |
| Payment reminders | CORE | Owner-controlled reminder first; no unreviewed real cron/send in QA. |
| Invoice status tracking | CORE | Required journey. Acceptance: section 5.5, “Invoicing and payments”. |
| Aged debt report | CORE | Required journey. Acceptance: section 5.5, “Invoicing and payments”. |
| Accounting sync | DEFER | Existing explicit exclusion. Manual accountant export first. |
| Milestone billing | CORE | Required journey. Acceptance: section 5.5, “Invoicing and payments”. |
| Recurring retainer invoices | OPTIONAL | Keep if already used; no new build without repeated need. |
| Deposit & instalments | CORE | Approve actual policy; existing 40/30/30 timed schedule must not change silently. |
| Multi-currency | DEFER | GBP first. Confirm current assumptions; do not build conversion/rate handling. |
| Late-payment fees | DEFER | Only agreed legally reviewed terms; no automatic penalty engine. |
| AI payment predictor | DEFER | AI deferred (rule above). |
| AI cash-flow forecast | DEFER | AI deferred (rule above). |
| AI reminder tone tuner | DEFER | AI deferred (rule above). |
| AI time-to-invoice | DEFER | AI deferred (rule above). |

### Client Portal

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Project progress view | CORE | Required journey. Acceptance: section 5.5, “Portal”. |
| Approval workflow | CORE | Simple dated acknowledgement against an exact version, not a review/markup platform. |
| Invoice & payment view | CORE | Required journey. Acceptance: section 5.5, “Portal”. |
| File sharing | CORE | Required journey. Acceptance: section 5.5, “Portal”. |
| Feedback & comments | CORE | Reuse client-owned support thread before a second messaging system. |
| Branded portal | CORE | Required journey. Acceptance: section 5.5, “Portal”. |
| Design review with markup | DEFER | Use versioned review link and notes; no annotation system. |
| Approval reminders | CORE | Required journey. Acceptance: section 5.5, “Portal”. |
| Shared project timeline | CORE | Required journey. Acceptance: section 5.5, “Portal”. |
| Document e-sign | DEFER | Defer portal signing product. Existing staff typed name is not verified client sign-off. |
| Asset request checklist | CORE | Required journey. Acceptance: section 5.5, “Portal”. |
| AI feedback summariser | DEFER | AI deferred (rule above). |
| AI approval chaser | DEFER | AI deferred (rule above). |
| AI client FAQ assistant | DEFER | AI deferred (rule above). |
| AI update digest | DEFER | AI deferred (rule above). |

### Time Tracking

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Timer & manual entry | OPTIONAL | Keep if already used; no new build without repeated need. |
| Time against project & task | OPTIONAL | Keep if already used; no new build without repeated need. |
| Billable vs non-billable | OPTIONAL | Keep if already used; no new build without repeated need. |
| Per-person timesheets | DEFER | Not needed for a sole owner; preserve current records. |
| Rate cards | OPTIONAL | Keep if already used; no new build without repeated need. |
| Time-to-invoice link | OPTIONAL | Keep if already used; no new build without repeated need. |
| Budget vs actual hours | OPTIONAL | Keep if already used; no new build without repeated need. |
| Project profitability | OPTIONAL | Keep if already used; no new build without repeated need. |
| Weekly time reminders | OPTIONAL | Keep if already used; no new build without repeated need. |
| Utilisation report | DEFER | Outside the simple owner/client release; do not add a new tool or subsystem. |
| AI auto-time suggestions | DEFER | AI deferred (rule above). |
| AI timesheet cleaner | DEFER | AI deferred (rule above). |
| AI estimate accuracy | DEFER | AI deferred (rule above). |
| AI profitability insight | DEFER | AI deferred (rule above). |

### Support Tickets

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Client ticket raising | CORE | Required journey. Acceptance: section 5.5, “Support”. |
| Ticket status pipeline | CORE | Required journey. Acceptance: section 5.5, “Support”. |
| Priority levels | CORE | Required journey. Acceptance: section 5.5, “Support”. |
| Assign to team member | OPTIONAL | Keep if already used; no new build without repeated need. |
| Ticket history | CORE | Required journey. Acceptance: section 5.5, “Support”. |
| Resolution notes | CORE | Required journey. Acceptance: section 5.5, “Support”. |
| SLA timers | DEFER | No promise/engine before a confirmed support agreement and capacity. |
| Billable ticket flag | OPTIONAL | Not a ticket field today. IT support time is billed through time entries on the client's standing IT support project (section 5.5). |
| Maintenance plan link | OPTIONAL | Keep if already used; no new build without repeated need. |
| Knowledge base | OPTIONAL | Keep if already used; no new build without repeated need. |
| AI ticket triage | DEFER | AI deferred (rule above). |
| AI reply drafting | DEFER | AI deferred (rule above). |
| AI duplicate detection | DEFER | AI deferred (rule above). |
| AI sentiment flag | DEFER | AI deferred (rule above). |
| AI knowledge article writer | DEFER | AI deferred (rule above). |

### Communication Hub

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Project-linked messaging | CORE | Required journey. Acceptance: section 5.5, “Comms and Mailbox”. |
| Email integration | OPTIONAL | Existing mailbox optional. Use external mailbox plus recorded decisions initially. |
| Internal team notes | CORE | Required journey. Acceptance: section 5.5, “Comms and Mailbox”. |
| Notifications | CORE | Required journey. Acceptance: section 5.5, “Comms and Mailbox”. |
| Email templates | CORE | Required journey. Acceptance: section 5.5, “Comms and Mailbox”. |
| Mentions & assignments | DEFER | Outside the simple owner/client release; do not add a new tool or subsystem. |
| Scheduled send | DEFER | Defer scheduling/delivery complexity; explicit send or external mailbox. |
| Communication log | CORE | Required journey. Acceptance: section 5.5, “Comms and Mailbox”. |
| AI reply drafting | DEFER | AI deferred (rule above). |
| AI thread summary | DEFER | AI deferred (rule above). |
| AI tone check | DEFER | AI deferred (rule above). |
| AI meeting notes | DEFER | AI deferred (rule above). |

### Analytics & Reporting

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Revenue by month | CORE | Required journey. Acceptance: section 5.5, “Analytics and Time”. |
| Pipeline report | CORE | Required journey. Acceptance: section 5.5, “Analytics and Time”. |
| Project profitability | OPTIONAL | Keep if already used; no new build without repeated need. |
| Team utilisation | DEFER | Outside the simple owner/client release; do not add a new tool or subsystem. |
| Proposal win rate | CORE | Required journey. Acceptance: section 5.5, “Analytics and Time”. |
| Client lifetime value | OPTIONAL | Label actual received totals; no speculative score. |
| Lead source ROI | OPTIONAL | Simple source counts first; ROI needs reliable cost attribution. |
| Custom report builder | DEFER | A few reconciled fixed summaries first. |
| AI weekly insight | DEFER | AI deferred (rule above). |
| AI growth suggestions | DEFER | AI deferred (rule above). |
| AI pricing insight | DEFER | AI deferred (rule above). |
| AI bottleneck finder | DEFER | AI deferred (rule above). |
| AI forecast | DEFER | AI deferred (rule above). |

### Platform & Settings

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Team & roles | CORE | Keep existing security roles. Hide workforce complexity in sole-owner UI. |
| Brand kit | CORE | Required journey. Acceptance: section 5.5, “Platform to Settings and My account”. |
| Email & PDF branding | CORE | Required journey. Acceptance: section 5.5, “Platform to Settings and My account”. |
| Audit trail | CORE | Required journey. Acceptance: section 5.5, “Platform to Settings and My account”. |
| Role-based access | CORE | Required journey. Acceptance: section 5.5, “Platform to Settings and My account”. |
| Calendar integration | OPTIONAL | Manual call record plus optional ICS/scheduler link first; no OAuth calendar sync. |
| Accounting integration | DEFER | Same accounting-sync exclusion; no second integration backlog. |
| Stripe / GoCardless setup | OPTIONAL | Existing Stripe can remain after testing. No new GoCardless integration proposed. |
| Zapier / Make automations | DEFER | No new automation service without repeated need and sandbox. |
| Webhooks & API | OPTIONAL | Retain existing necessary API/payment hooks; no public integration platform. |
| AI setup assistant | DEFER | AI deferred (rule above). |
| AI automation suggester | DEFER | AI deferred (rule above). |
| AI process improver | DEFER | AI deferred (rule above). |
