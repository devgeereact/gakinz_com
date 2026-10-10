# A small workspace for running GAkinz

Status: proposed. The owner manages the business; clients use their own portal. No website generation, public sign-up, multi-company tenancy, workflow builder or accounting platform is required.

## Navigation and everyday use

| Main destination | Contents | Default view |
|---|---|---|
| Today | Follow-ups, calls, deadlines, waiting approvals, overdue invoices | Actions requiring attention, then a few accurate totals |
| Enquiries | Enquiry list/detail and simple booking records | New and overdue follow-ups |
| Clients | Contact details, history, conversations and portal preview | Searchable client list |
| Projects | Tasks, milestones, requests, approved files and notes | Active projects; archived records available through a filter |
| Money | Quotes/proposals, agreements and invoices | Outstanding invoices and draft quotes |
| Website | Portfolio, articles, testimonials and profile links | Draft/published lists with preview |
| Settings | Business defaults, account, enabled integrations, audit and operations | Business details and My account |

Today the sidebar is one flat list of 24 entries (`src/components/app-sidebar.tsx:49-72`), filtered by role. The change is grouping and relabelling, not removing modules. Keep existing URLs while changing labels and grouping. Supporting tabs are shallow. Search finds client/project records as well as navigation once safe search endpoints exist; do not call a menu search a business-record search. Client navigation is a separate small menu: Overview, My projects, Messages/support, Shared files, Invoices and My account, only as each destination is actually delivered.

Owner's morning: open Today, reply to outstanding enquiries, check the next call, update one project, check due money. No weather, AI prompt or unused chart should displace these actions. Provide one obvious next action from an enquiry or client record.

## Complete journeys and their checks

| Journey | Required behaviour | Evidence to gather |
|---|---|---|
| Enquiry | Validated form, abuse control, durable save, honest acknowledgement, owner next action | Synthetic submit appears once; retry cannot create unnoticed duplicates; failure preserves typed data |
| Discovery call | Booking link or requested time, timezone, status and associated enquiry | Request clearly differs from confirmed call; timezone/DST cases and reschedule tested |
| Quote | Scope, inclusions/exclusions, GBP total, VAT decision, expiry and agreed schedule | Saved quote equals preview/PDF/share view; expired/revoked link fails appropriately |
| Acceptance | Record who accepted, when and which version; create one project and agreed invoice records | Double-click and concurrent requests do not duplicate client/project/invoices |
| Delivery | Tasks, due date, next milestone, client-visible update and requested assets | Internal note stays private; client sees intended public status only |
| Payment | Accurate invoice, hosted provider or verified manual receipt, recorded reference | Correct total/currency, mismatch rejected, retries safe, receipt reconciled |
| Support | Client-owned issue/reply, clear status and owner reply | Client A cannot read or reply to B's ticket/file/invoice through altered IDs |
| Publish | Draft, preview, permission, publish/unpublish and metadata | Unpublished content absent from public routes/sitemap; refresh reflects current content |
| Recover | Backup, isolated restoration and owner access recovery | Restored database/files agree, permissions still enforced, incident procedure usable |

Do not introduce an “orders” table automatically. For bespoke services, the accepted quote, client and project form the order record. Add a separate order entity only if a defined fixed-price checkout journey later demands it.

## Module-by-module treatment

### Dashboard to Today

Retain the useful totals, replace chart-heavy emphasis with an attention list: new enquiries, follow-ups due, scheduled calls, overdue tasks, waiting client material and unpaid invoices. Each item opens its record. A failed data source displays “Unavailable, retry” rather than zero. Show the last successful refresh. Revenue periods must be labelled; cash received and work invoiced are different measures.

Acceptance: an offline invoice source cannot display “all on time”; no active record requires manual cross-checking of six screens to find the next action. AI brief is optional and not needed to open the page.

### Leads to Enquiries

Keep current stages: New, Contacted, Proposal, Won, Lost. Show a default list on phones and optional board on larger screens. Add next-action date and short owner note to an enquiry. Keep source, budget and service interest optional. Preserve lost reason and history. Use simple owner-selected priority instead of AI scores.

Conversion should link enquiry to an existing client or create one, retain source/history and return the linked record. Confirm duplicate-email/company matches rather than silently creating another client. Current conversion is present, but multi-step integrity and concurrent behaviour require testing.

Acceptance: the full message is readable, one next action is visible, changing status rolls back honestly on failure, and repeated conversion creates no duplicate.

### Bookings, a small addition within Enquiries

Current `book.php` only returns a configured Calendly URL. It does not establish a booking record or synchronise appointment state. Start with manual recording: enquiry/client, start time, timezone, duration, meeting link/location, requested/confirmed/completed/cancelled and notes. Confirm a slot manually; link to the chosen scheduler if already used. An optional ICS download avoids calendar OAuth.

Reschedule the existing record and retain its history. No custom availability engine, round-robin scheduling, reminders service or paid booking checkout. Automatic scheduler import is a later decision requiring a sandbox.

Acceptance: no request is labelled confirmed prematurely; local time is clear; cancellation is visible; owner can record a phone booking without a public form.

### Clients

One record holds company/trading name, main contact, email/phone, active projects, invoices, quote links, conversations and shared files. Use main contact first; add extra contacts only when a real account needs them. Keep tags light. Separate confidential owner notes from client-visible information. Provide archive and an export/review path for lawful data requests rather than automatic deletion of financial history.

Acceptance: owner can answer “what happened with this client?” from one timeline, and changing a contact updates future communications without altering historic issued documents.

### Projects and tasks

Retain stage/status distinctions only where helpful: stage describes work, status says active/on hold/complete. Default to a task list with due date, checklist and owner. Optional board remains. Add one client-visible progress note, one next milestone and an asset request checklist. Start with a manual template for common delivery, not a template designer.

Put files and signed agreements inside the project view. Completion should show unresolved tasks/requests and allow an intentional owner decision. A completed internal project does not automatically become a public portfolio record.

Acceptance: long names and lists work on phones, changes retain entered content after errors, and task completion never accidentally publishes internal notes.

### IT support and consultancy jobs

The owner added general IT support and IT consultancy on 10 October 2026. Neither needs a new module. An IT support job is a support ticket against the client plus time recorded in Time, then an invoice line when billable. Verified constraint: time entries require a `project_id` and carry the `billable` flag (`server/time.php:49-56`, `schema.sql:212`); tickets have no billable flag. So each support client gets one standing "IT support" project that holds its tickets' time, rather than a new ticket-billing field. A consultancy engagement is a small project with a brief, the agreed questions as tasks and a written recommendation as the deliverable file. The enquiry form gains the two service options, using the same service labels as the website.

Acceptance: a remote support session can be logged, timed, resolved with a note and invoiced from one client record; a consultancy project closes with its recommendation file shared to the client portal.

### Proposals to Quotes

Reuse line-item builder and sharing. Show deliverables, exclusions, revision allowance, costs, expiry and payment schedule in plain language. Warn before acceptance creates a project and staged invoices. Source currently splits the **ex-VAT** subtotal 40/30/30, due at acceptance, +30 and +60 days, and stores the quote's VAT rate on each invoice (`server/proposals.php:176,198-210`): treat this as existing behaviour requiring owner review, not a universal business rule. The acceptance preview shows each instalment with VAT. Do not replace it silently with milestone billing.

Two acceptance guards are required before any real quote is accepted. First, accept only from the sent state: the current code reads `status` but never checks it, so a draft or declined quote can convert (A27). Second, make the conversion single-use: the `project_id` check sits outside the transaction and the UPDATE has no `AND project_id IS NULL`, so two clicks can create two projects and six invoices (A12).

First release can record explicit acceptance received by email with reference and date. If clients accept in the portal later, bind acceptance to authenticated client, quote version and exact terms. Staff clicking Accept is not proof the client agreed. Revoke share links and limit their exposure.

Acceptance: changing an agreed quote requires a revision rather than rewriting accepted terms; repeated/concurrent acceptance is safe; expired or declined records cannot convert unintentionally.

### Contracts and agreements

Keep an approved service agreement attachment and reference against the quote/project. Templates must reflect actual terms and be professionally reviewed as appropriate. Existing typed-name signing is staff-only, so its label and evidence must not imply a verified client signature.

Use an externally signed document/manual acknowledgement initially. A full signing product, certificate chain or bespoke legal assurance system is unnecessary. Never destroy the signed version through later template edits.

Acceptance: owner can identify the exact agreed version and acceptance evidence; the interface says whether acknowledgement is recorded or a client has independently signed.

### Invoicing and payments

Keep line items, numbered invoice, GBP, due date, status and PDF. Confirm VAT registration and rate before any default. Display subtotal, tax and payable total consistently. Add verified manual payment reference, date and amount. Keep bank-transfer reconciliation simple. Avoid building bookkeeping, tax filing or reconciliation feeds.

Resolve A04, A05 and A25 before enabling online payments. Today Stripe charges the ex-VAT total and its webhook then marks the whole invoice paid, so VAT is silently lost. Use one tested hosted provider first: Stripe is recommended because it already has a signed webhook. Keep PayPal hidden until it has a verified webhook or a manual reconciliation step, because today it records payment only when the browser returns (A26). Before going live, check any invoice already paid through Stripe against its VAT-inclusive total. Client-facing success/cancel destinations must return to that client's invoice/portal, not the owner's staff screen. Browser return alone does not prove payment.

Add enough payment audit data for duplicate events and disputed receipts, not a full ledger. Record refunds/credits safely if used; do not reuse “paid” to mean refunded. Confirm whether partial payments are handled through separate agreed instalment invoices rather than a new payment allocation engine.

Acceptance: invoice/PDF/portal/provider totals agree; 0% and approved positive VAT cases pass; rounding is defined; mismatch, retry, partial and cancelled cases do not mark the wrong invoice paid. Real payment tests remain prohibited.

### Portal

Start with clear project summary, owner contact, next step, outstanding invoice and support access. Progress percentages based on task counts need context; completing many small tasks must not imply a major milestone is approved. Add only client-approved shared files and a simple acknowledgement record when needed.

Clients must not see global search results, other client selectors, internal estimates, staff notes, all-client notifications or owner Settings. Serve minimum fields rather than trusting hidden UI. Tie identity to authenticated client in every child endpoint.

Acceptance: two unrelated synthetic clients are tested across GET, POST, downloads and guessed/share identifiers; each sees only its own permitted data. Staff preview is labelled and restricted.

### Support

Reuse the existing ticket/reply data model and statuses. The reviewed support endpoint currently requires STAFF for creation and replies, so customer messaging needs a new, ownership-checked client branch, not just a portal button. Owner can classify urgency, reply and close with a resolution note. The proposed client branch permits creation/replies only within the verified client account. Put “Need help?” inside the project/portal. Do not promise response guarantees unless owner capacity and service agreement support them.

Acceptance: reply retains draft on failure, status/priority changes are audited, and client ownership is checked on create, list, detail and reply. SLA engines, AI triage and omnichannel bots are deferred.

### Comms and Mailbox

Keep one project/client conversation history. Clearly distinguish “Record note”, “Record call” and “Send email”. Current Comms includes multiple channel labels but several are records rather than delivery. Show “Recorded” versus “Sent” with failure status; never imply WhatsApp delivery from an internal note.

Initially use the owner's existing mailbox externally and log important decisions. Retain in-app IMAP/SMTP only if it reduces daily work and is safely configured. No full email-client replacement, scheduled sender, social inbox or chat infrastructure. Client portal messaging can reuse ticket threads before inventing a second conversation system.

Acceptance: internal notes never leave the application; failed send is not shown as delivered; tests use a mail sink; no real message is sent during QA.

### Files

Reuse server storage with client/project association. Surface uploads where needed rather than a separate global file browser first. Distinguish private client material from approved portfolio media. Explain formats/size limit before upload. File names and alt text are readable; share permission, link expiry/revocation and download auditing must be reviewed.

Existing portfolio images can use permanent public share tokens. Do not reuse private project files as public images without a deliberate reviewed publication copy and consent. Verify old uploads and download header behaviour separately from new allowlist code.

Acceptance: upload/download ownership, MIME/extension mismatch, oversized file, missing file and revoked link tested with synthetic material; direct uploads path is inaccessible in the target host configuration.

### Website: Blog, Work, Testimonials and Content Hub

Group these as Portfolio, Articles, Testimonials and Draft ideas. Fix destructive blog edit before anyone maintains real content. Add safe preview and explicit draft/publish/unpublish. For articles, support headings, paragraphs, lists and safe links rather than a general page builder. Add optional recommendation blocks described in document 04.

Work should start with a short case-study form and optional details, not force every field on a phone. Preserve client permission and image alt-text checks. Testimonials need attribution/consent and visible approved state. Public excerpts cannot expose private client emails.

Content Hub becomes optional drafting assistance, not a second canonical blog. Approved blog content belongs in posts; social drafts can reference its URL. AI cannot publish or send automatically. Do not pass confidential records to a model without a defined purpose and reviewed provider/data terms.

Acceptance: save/edit round-trip preserves the body, duplicate slug is rejected, preview cannot expose another client's data, unpublish removes discovery links, and a website refresh uses the latest published record.

### Platform to Settings and My account

Separate owner business settings from user account settings. Business: trading identity, invoice defaults, contact/social links, enabled integrations and operational status. My account: name, password/reset, own sessions and 2FA with recovery path. Preserve existing seven server roles; simplify presentation rather than collapsing permissions.

Do not build configurable automation. Disabled integrations stay quiet, showing a setup explanation only in Settings. API keys stay server-side. Audit entries should answer who changed what and when without logging sensitive bodies/passwords.

Acceptance: all signed-in roles can manage their own sessions/security through independently checked ownership; none can manage another user; owner sees no unusable account links.

### Analytics and Time

Analytics is a few labelled summaries: collected revenue, overdue money, enquiry sources, conversion and active projects. Calculate from real data and state date period/definition. No predictive growth dashboard or custom report builder.

Time stays optional, with manual entry and a simple timer if already used. Keep billable/non-billable and project association; hide staff approvals/rate complexity for a sole owner. Do not build payroll. Add profitability only after cost and time data is dependable.

Acceptance: sample totals reconcile to underlying invoices/time records; unavailable sources do not become zero; time records cannot be edited across owners without permission.

### Remaining modules

| Existing module | Proposed treatment | Minimum acceptance if retained |
|---|---|---|
| Design | Optional project review notes/links, no Figma markup product | Real review version and client visibility recorded |
| Dev Pipeline | Owner-only project links and launch checklist; no client-site generator or deploy automation | Links/status are factual; no deploy button exposed without explicit authority |
| Resourcing | Hide by default for sole-owner operation | Existing records preserved; no leave/capacity engine built |
| Care Plan | Optional support agreement, renewal and next service date | Price/coverage correct; monitoring disabled unless approved and tested |
| Knowledge | Short reusable checklist/help notes inside Settings or Support | Owner notes separated from deliberately published help |

## Small additions worth making

These are additions or completion work, not claims of current support. P1: enquiry next-action date; linked call record; unified client timeline; asset checklist; quote acceptance reference/version; verified manual payment reference; own-account security access; unavailable-data states; draft protection; archive and safe export. P2: approved portfolio publication checklist; safe article links/recommendation blocks; business/social-link settings; published sitemap; simple source reporting. Optional later: ICS export, one project template, occasional recurring care reminder.

Every addition must either reduce repeated owner work or help a client complete an action. Reject features that require another service/account without a measured need. No new chat platform, social scheduler, AI sales scoring, custom calendar, accounting sync, multi-currency engine, visual workflow builder or client website builder.

## Customer references and client-linked planning

Apply [document 08](08-CLIENT-JOURNEYS-AND-ACCEPTANCE.md) to portal, support, feedback and project records. A reference identifies work; it never authorises access by itself. Keep one identity boundary and test every new client action against two unrelated clients. Add a small project brief, agreed measurements and a manual sanitised GEE OS handoff inside Projects. Keep internal notes separate from explicitly shared milestones. Feedback submission is distinct from consent to publish a testimonial.
