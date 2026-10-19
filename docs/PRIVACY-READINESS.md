# Privacy readiness

**As at:** 2026-10-17, branch `audit/readiness-2026-10-17`. **Status: a technical record and a
draft for the owner and a qualified adviser. Nothing here is legal advice, and nothing here is
approved for publication.**

This file holds the evidence an adviser needs: what the system collects, where it goes, how
long it stays, which browser storage it uses, and what the public notices say. It was built from
the source code and from a browser run of the production build on 2026-10-17. No live server,
database, mailbox or vendor account was inspected, so anything about the deployed system or
vendor configuration is UNVERIFIED.

Issues found are recorded in `docs/KNOWN-ISSUES.md` (K-021, K-059 to K-065). This file does not
repeat their status.

---

## 1. Scope and what is known

| Item | Known | Source |
|---|---|---|
| Project | gakinz.com: public site plus GAkinzOS, the studio's CMS and client portal | `README.md` |
| Business | Web design, build and care, run by Gideon Akinlotan, London | `src/marketing/data/site.ts` |
| Public contact | hello@gakinz.com. Phone not published (`null`) | `site.ts` |
| Legal entity | **Unknown.** Sole trader or limited company not confirmed; `registration` is `null` | `docs/STATUS.md` section 5 |
| ICO registration (data protection fee) | **Unknown** | none |
| Jurisdiction | UK operator, so UK GDPR, the Data Protection Act 2018 and PECR are the working assumption. Whether any client or visitor is in the EU, which would bring EU GDPR in, is **unknown** | inferred from the London address only, so treat as unconfirmed |
| Children | No feature is aimed at children; no age check exists | source search |
| Analytics, advertising, tracking | **None.** No analytics, tag manager, pixel, session replay, error monitoring or third-party embed | source search and browser run, section 4 |
| Marketing email | **None.** No newsletter, subscription or unsubscribe exists | source search |

## 2. Data inventory

Confidence is high for everything read from code. "Recipients" lists only vendors the code can
call; whether each key is set in production is UNVERIFIED.

| Activity | Data | Subject | Collected at | Purpose | Stored in | Recipients | Retention and deletion today | Disclosed? |
|---|---|---|---|---|---|---|---|---|
| Enquiry form | name, email, company (optional), budget (optional), message, IP address, time | prospects | `/contact` (`Contact.tsx`, `contact.php`) | reply, spam control | `enquiries`; `audit_log` copy of email and IP | hosting | kept indefinitely; no delete | partly (fixed 2026-10-17, K-063) |
| Staff and client sign-in | email, password hash, 2FA secret and recovery hashes, sessions with IP and user agent | staff, clients | `/login`, `/set-password`, My account | access control, security | `users`, `auth_tokens`, `magic_links`, `password_resets`, `audit_log` | Google (if Google sign-in used); mail provider for invites and magic links | sessions 30 days, but expired rows are never pruned; users are suspended, never deleted | no |
| Client records | contact name, email, phone, company, notes, retainer; since 2026-10-19 which files were shared to the client's portal and when (`files.client_visible`, `files.shared_at`, SQL 18) and the IT support time logged from their tickets (`time_entries.ticket_id`, SQL 17) | clients | CMS, staff entry | delivering work, billing | `clients`, `projects`, `tasks`, `files`, `time_entries` | hosting; a shared file is visible to the client's own portal users | indefinite; no delete; soft-deleted files stay on disk; hiding a file clears `shared_at` | no |
| Invoices and payments | client email, amounts, payment events | clients | CMS, Stripe or PayPal checkout | billing, tax records | `invoices`, `payment_events` | Stripe; PayPal (switched off, K-026) | indefinite | no |
| Proposals | client company, scope, prices; view count and last view time | clients | CMS; `/p/:token` | selling work | `proposals` | anyone holding the link (K-060) | indefinite; link never expires | no |
| Portal messages and feedback | message text, rating, comments, permission to quote | clients | client portal | support, service quality | `tickets`, `ticket_replies`, `client_feedback` | hosting | indefinite | no |
| Calls (bookings) | time, place (may be a phone number), notes, outcome, notify email | prospects, clients | CMS staff entry | arranging calls | `bookings`, `booking_events` | mail provider when a change is emailed | indefinite | no |
| Communications | email and SMS text, recipient address or number | clients, prospects | CMS Comms, Mailbox | correspondence | `comm_threads`, `comm_messages`; the owner's mailbox | mail provider (SMTP, IMAP); Twilio for SMS and WhatsApp | indefinite | no |
| AI drafting | any text a staff member sends: enquiry, client and message text | prospects, clients | CMS AI actions (`ai.php`) | drafting replies and content | not stored by the site | OpenRouter and the model provider it routes to (K-064) | vendor terms unknown | no |
| Contracts | signer name, email, typed name, staff IP | clients | CMS | agreements | `contracts` | hosting | soft delete | no |
| Certificates | recipient name, programme, date | trainees | public `/verify/:id` | public verification | `certificates` | anyone with the ID (K-061) | indefinite | no |
| Testimonials | author, role, company, quote, rating | clients | CMS | marketing | `testimonials` | public site | soft delete; no source or consent stored (K-065) | no |
| Staff HR | cost rate, leave type and note (sickness is health data) | staff | CMS | resourcing | `users`, `leave_entries` | hosting | indefinite | no staff notice found |
| Audit trail | user id, action, free text (emails, recipients, subjects), IP | everyone | every mutation | security, accountability | `audit_log` | hosting | indefinite | no |
| Uptime and weather | site URLs, configured location | none personal | CMS | operations | `_monitor.php`, `weather.php` | OpenWeather | n/a | n/a |
| Slack announcements | announcement text | staff | CMS | internal notices | not stored | Slack | vendor terms | no |

Sensitive data: `leave_entries` can record sickness, which is health data under UK GDPR
Article 9. REQUIRES LEGAL REVIEW for the condition relied on and staff-facing information.

## 3. Vendors and recipients

| Vendor | What it receives | Evidence | Production status | Transfer outside the UK |
|---|---|---|---|---|
| Web host (cPanel) and database | everything | `server/README.md` | in use; provider and data location **owner to confirm** | unknown |
| Cloudflare | all traffic, IP addresses | `.htaccess` origin lock | in use | likely; REQUIRES LEGAL REVIEW |
| Mail provider (SMTP, IMAP) | outgoing mail, the inbox | `_smtp.php`, `mail.php` | **owner to confirm** | unknown |
| Stripe | invoice id, amount, client email | `payments.php` | **owner to confirm** | likely |
| PayPal | payment data | `payments.php` | switched off in code (K-026) | likely |
| Twilio | phone number and message text | `_sms.php`, `comms.php` | **owner to confirm** | likely |
| OpenRouter | free text from staff | `ai.php` | **owner to confirm** (K-064) | likely |
| Google (sign-in) | sign-in email | `oauth.php` | **owner to confirm** | likely |
| Slack | announcement text | `_slack.php` | **owner to confirm** | likely |
| Calendly | nothing from the site; the visitor follows a link | `book.php` | link only | n/a |
| OpenWeather, GitHub, Figma | no personal data expected | `weather.php`, `github.php`, `figma.php` | **owner to confirm** | n/a |

Fonts are self-hosted (`@fontsource-variable`), so no font request leaves the site.

## 4. Cookies and browser storage

Runtime evidence: the production build was crawled on 2026-10-17 at 320, 390, 768 and 1440px
across all 30 prerendered pages and the 404, with every non-local request blocked and logged.
`document.cookie`, `localStorage` and `sessionStorage` were empty on every public page, and no
request left for another domain. The CMS rows come from source, not from a signed-in run.

| Name | Type | Provider | Purpose | Set when | Lasts | Category (provisional) | Consent likely needed? |
|---|---|---|---|---|---|---|---|
| `gk-auth` | localStorage | first party | sign-in token and basic account details | sign-in | until sign-out; token valid 30 days | strictly necessary | no |
| `gk-locked` | sessionStorage | first party | inactivity lock | CMS lock screen | tab session | strictly necessary (security) | no |
| `gk_oauth_state` | cookie, HttpOnly, Secure, Lax | first party | forgery protection for Google sign-in | Google sign-in starts | 10 minutes, deleted at the end | strictly necessary (security) | no |
| `sidebar_state` | cookie, set by script | first party | side menu open or closed | CMS menu toggled | 7 days | preference (appearance) | REQUIRES LEGAL REVIEW |
| `gkos-groups` | localStorage | first party | which menu groups are open | CMS menu used | until cleared | preference (appearance) | REQUIRES LEGAL REVIEW |
| `theme` | localStorage | first party (`next-themes`) | light or dark | theme changed | until cleared | preference (appearance) | REQUIRES LEGAL REVIEW |
| `ui-theme` | localStorage | first party | retired; removed on load | never written now | n/a | n/a | no |

The ICO says the strictly necessary exception covers storage essential to the service the user
asked for, not storage that is "useful" or "convenient", and it describes separate exceptions
for statistics and appearance that require a simple, free way to object. The three preference
items sit only inside the signed-in CMS and are set by the user's own action. Whether they fall
under an appearance exception, and what "means of objecting" they need, is a legal question.

**Consent banner: not built, on purpose.** The public site stores nothing and loads no
optional script, so there is nothing for a banner to control. A banner would add friction and
imply tracking that does not exist. This must be revisited before any analytics, advertising
(AdSense is planned in `docs/CONTENT-AND-GROWTH.md`), embed or affiliate script is added: at
that point a consent tool that blocks the script until the visitor chooses is required.

## 5. Marketing and analytics

- No marketing email, newsletter, subscription, list import or unsubscribe exists. The contact
  form does not subscribe anyone. Transactional mail (invites, magic links, invoice reminders,
  call changes) is the only outbound mail.
- No analytics, conversion tracking, heatmap, session replay or error monitoring exists, client
  or server side. The CMS "Analytics" module is internal business reporting over the site's own
  database.
- Nothing to fix here. Adding any of these needs the consent work in section 4 and an update to
  the privacy notice first.

## 6. Proposed retention schedule

**Every period below is a proposal for the owner to decide and an adviser to confirm. None is
implemented: nothing deletes or anonymises by any of them.** The proposals follow data minimisation; tax-record periods depend on whether the
business is a sole trader or a company, so they are left blank on purpose.

| Data | Purpose | System of record | Proposed period | Starts from | Then | Backups | Needs |
|---|---|---|---|---|---|---|---|
| Enquiry that did not become a client | reply | `enquiries` | 12 to 24 months | last contact | delete row and audit copies | age out with backup rotation | OWNER DECISION, LEGAL REVIEW |
| Client, project, contract records | delivery, claims | `clients`, `projects`, `contracts` | owner to set | end of engagement | delete or anonymise | as above | LEGAL REVIEW (limitation periods) |
| Invoices and payments | tax | `invoices`, `payment_events` | **set by HMRC rules for the trading form** | end of the relevant tax year | delete | as above | OWNER INPUT, LEGAL REVIEW |
| Sessions, magic links, reset tokens | access | `auth_tokens`, `magic_links`, `password_resets` | one day after expiry | expiry | delete | n/a | **built 2026-10-17** (`cron.php` `prune`), not uploaded |
| Audit log | security | `audit_log` | 12 months | entry date | delete, or strip email and IP | as above | OWNER DECISION |
| Portal messages, feedback | support | `tickets`, `client_feedback` | with the client record | end of engagement | delete | as above | OWNER DECISION |
| Comms, Mailbox | correspondence | database, mailbox | owner to set | last message | delete | mailbox provider's own | OWNER DECISION |
| Staff records, leave | employment | `users`, `leave_entries` | owner to set | end of employment | delete | as above | LEGAL REVIEW (employment and health data) |
| Certificates | verification | `certificates` | owner to set | issue date | delete or unpublish | as above | OWNER DECISION, recipient consent |
| Soft-deleted files | none once deleted | `uploads/` | 30 days | deletion | remove the file | as above | OWNER DECISION |

**Dry run, built 2026-10-19, not uploaded.** `server/_retention.php` counts, with `SELECT
COUNT(*)` only, the rows each rule above (other than the token row, which `prune` already
handles) would affect if a period were set. Each period is a `config.php` key, all `null` in
`config.php.example`: `$RETENTION_ENQUIRY_MONTHS`, `$RETENTION_CLIENT_MONTHS`,
`$RETENTION_INVOICE_MONTHS`, `$RETENTION_AUDIT_MONTHS`, `$RETENTION_SUPPORT_MONTHS`,
`$RETENTION_COMMS_MONTHS`, `$RETENTION_STAFF_MONTHS`, `$RETENTION_CERTIFICATE_MONTHS` and
`$RETENTION_DELETED_FILE_DAYS`. `null` or a missing key means "period not set, nothing
happens"; anything but a positive whole number is reported as invalid and counts nothing. The
super admin sees the report in Settings, Privacy (`privacy.php?action=retention_report`), and
`php cron.php job=retention_report` prints it on the command line (`docs/OPERATIONS.md`
section 2). The client rule counts a client only when neither it nor any of its projects,
invoices or portal messages changed within the period, a reading of "end of engagement" for
the owner to confirm. Tested against a local database (`tests/server/privacy.test.ts`); NOT
TESTED on the live host.

Still to build, once periods are agreed: the job that deletes or anonymises by these rules,
reusing the dry run's counts, with tests against the local `*_test` database and an entry in
`docs/DEPLOYMENT.md`. Expired-token pruning, which carries no business judgement, is already
built as the `prune` job, together with running `cron.php` from the command line (K-061).

## 7. Rights and account deletion

| Right | Pathway today | Gap |
|---|---|---|
| Access, portability | email hello@gakinz.com, then the owner exports | **export built 2026-10-19, not uploaded**: a super admin or admin downloads a JSON file of every row held about one client (client record, "Export data") or one enquirer email (Settings, Privacy). Secrets and token values are left out; staff notes are included (K-079). Since 2026-10-19 each file row carries `client_visible` and `shared_at`, so the export shows what was shared to the portal and when (before SQL 18 the rows come without them). A written procedure for checking identity and replying is still needed |
| Correction | staff edit client records; My account says "contact GAkinz" for name and email | none for staff-held data; fine as a manual route |
| Erasure | email | no delete for enquiries, clients, users, tickets or messages; audit log keeps emails. **Not built**, by design, until periods and the procedure are agreed |
| Restriction, objection | not mentioned | not offered on the privacy page |
| Complaint to the ICO | not mentioned | must be stated |

Self-service account deletion was **not built**. Client accounts hold invoices and contracts the
business may have to keep, so deletion means a mix of deletion, anonymisation and retention
that the owner and an adviser must define first. The safe interim route is the one that already
exists: a request by email to hello@gakinz.com, handled by the owner. A written procedure is
needed: how identity is checked (reply from the address on file, never an ID document by
email), what is deleted, what is kept and why, and how the requester is told. Response
deadline: REQUIRES LEGAL REVIEW, not stated here.

## 8. Legal documents

| Document | State | Evidence used | Missing owner information | Publication |
|---|---|---|---|---|
| Privacy policy (`/privacy`) | exists; **facts corrected and section 9 structure applied 2026-10-17**, owner facts as labelled placeholders | `contact.php`, this file | entity, ICO number, bases, processors, transfers, periods | not publishable until placeholders are filled and reviewed |
| Cookie policy (`/cookies`) | exists; **rewritten to name every item, 2026-10-17**; now linked from the footer | section 4 | none for the facts; classification needs review | ready for review |
| Terms of use (`/terms`) | exists; covers browsing only; governing law is a placeholder | `Legal.tsx` | governing law; the warranty sentence (K-021 item 5) | needs review |
| Client terms (projects, payment, cancellation) | **missing on the site**; project terms are said to live in each proposal | `docs/STATUS.md` section 5 | payment schedule, cancellation, revision terms | blocked on owner |
| Review dates | shown as a labelled gap on all three pages | K-021 | a real review date | blocked on owner |

## 9. Draft privacy notice (not for publication)

DRAFT, 2026-10-17. Text in [square brackets] is a required owner input. Clauses marked
(REVIEW) need a qualified adviser. Do not publish until both are done.

> **Privacy policy**
>
> **Who I am.** gakinz.com is run by [legal name: you as a sole trader, or the company name,
> number and registered office]. I am the controller of the personal data described here.
> Contact: hello@gakinz.com. [ICO registration number, if registered.]
>
> **What I collect and why.**
> - When you use the contact form: your name, email, business name and budget if you give
>   them, your message, and the internet address it came from. I use them to reply to you and,
>   for the address, to stop spam. [Lawful basis: for example legitimate interests in answering
>   enquiries, or steps before a contract.] (REVIEW)
> - If you become a client: your contact details, project records, messages, feedback,
>   contracts, invoices and payments. I use them to deliver the work, bill for it and keep the
>   records the law requires. [Bases: contract; legal obligation for tax records.] (REVIEW)
> - If you have a client login: your sign-in details and a record of your sessions, including
>   the device and internet address, to keep your account secure.
> - If you hold a training certificate I issued: your name, the programme and the date, which
>   anyone with the certificate number can check. [Confirm recipients are told this.]
>
> **Who else handles it.** [Confirm each:] my web host and database provider [name, location];
> Cloudflare, which carries traffic to the site; my email provider [name]; Stripe [and PayPal]
> when you pay an invoice; Twilio if I text you; Google if you sign in with Google; [OpenRouter
> and the AI model provider, if kept: text I ask it to help draft]. I do not sell your data and
> I do not use it for advertising.
>
> **Outside the UK.** [List any provider that stores or accesses data outside the UK and the
> safeguard relied on.] (REVIEW)
>
> **How long I keep it.** [Insert the periods agreed from the retention schedule.] (REVIEW)
>
> **Your rights.** You can ask for a copy of your data, ask me to correct it, delete it, restrict
> or object to how I use it, or move it elsewhere. Email hello@gakinz.com; I will reply from
> that address to confirm it is you. You can also complain to the Information Commissioner's
> Office (ico.org.uk). (REVIEW for wording and timescale)
>
> **Cookies.** See the cookie policy.
>
> **Changes.** [Effective date.] I will update this page when what I collect changes.

## 10. Owner input required

1. Trading form, legal name, and company number and registered office if a company.
2. ICO data protection fee: paid or not, and the registration number.
3. Which integrations are live: mail provider, Stripe, PayPal, Twilio, Google sign-in, Slack,
   OpenRouter, Calendly. Host name and data location.
4. Whether to keep the AI drafting feature with client text, and with which provider (K-064).
5. Retention periods (section 6), and who carries out deletion.
6. Whether certificate recipients agreed to public verification by name.
7. Testimonials: the source and permission for each quote, and whether ratings are real (K-065).
8. VAT status, and whether shown prices include VAT (K-066).
9. Whether any visitors or clients are outside the UK, the EU in particular.
10. A review date for each legal page once reviewed.

## 11. Legal review required

1. Lawful basis for each activity in section 2, including the audit trail and the staff leave
   records (Article 9 for sickness).
2. International transfer safeguards for Cloudflare, Stripe, Twilio, Google, Slack and
   OpenRouter.
3. Retention periods, especially tax records, client records and contracts.
4. The classification of the three CMS preference items under PECR (section 4).
5. The erasure and access procedure, identity checks and response timescale.
6. Terms of use: the warranty sentence and governing law (K-021).
7. Client terms for projects, payment, cancellation and refunds, which do not exist on the site.
8. Testimonials and ratings against current consumer protection rules on reviews.
9. Whether a staff privacy notice is needed for staff accounts and HR records.

## 12. Sources consulted (accessed 2026-10-17)

| Source | Issuer | Used for |
|---|---|---|
| [What privacy information should we provide?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/) | Information Commissioner's Office | the list of required notice contents in sections 8 and 9 |
| [Right to be informed](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/) | Information Commissioner's Office | timing (at collection) and just-in-time notices |
| [Guidance on the use of storage and access technologies: exceptions](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/) | Information Commissioner's Office | strictly necessary, statistical and appearance exceptions in section 4 |
| [Fact vs fiction on storage and access technologies](https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2025/09/fact-vs-fiction-ico-debunks-myths-on-storage-and-access-technologies/) (September 2025) | Information Commissioner's Office | "useful or convenient" is not strictly necessary |

These are regulator guidance, not statute. No conclusion here has been checked against the
legislation by a lawyer.
