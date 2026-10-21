# GAkinz production plan, 2026

Prepared 10 October 2026, re-verified against the source the same day. Status: **PROPOSED, awaiting owner approval section by section**.

GAkinz should become a dependable website and a small private workspace for one owner: attract suitable companies, receive enquiries, arrange calls, quote work, keep client records, track delivery, talk to clients clearly and collect payment. It should not become a website generator, a large agency operating system or a general IT marketplace.

The existing React, Vite, PHP and MySQL application is a useful foundation. Keep it. The priority is completing and proving the business journeys, protecting records and reducing the number of decisions on each screen. There is no evidence yet to describe the whole system as ready to accept company orders confidently. Three confirmed payment and sign-in defects (A22, A25, A27 in document 01) must be closed first.

## Read this folder in order

| Document | What it answers |
|---|---|
| [01-AUDIT.md](01-AUDIT.md) | What exists, what has drifted, verified checks, defects with file and line evidence |
| [02-APP-PLAN.md](02-APP-PLAN.md) | Every CMS module, the simpler navigation, useful additions and acceptance criteria |
| [03-WEBSITE-AND-UI.md](03-WEBSITE-AND-UI.md) | Every public page, the six services, the shared design contract, motion, mobile and publishing |
| [04-MONETISATION-AND-SOCIAL.md](04-MONETISATION-AND-SOCIAL.md) | AdSense, Amazon, content niche and ready-to-edit profiles for all five channels |
| [05-DELIVERY-AND-HOUSEKEEPING.md](05-DELIVERY-AND-HOUSEKEEPING.md) | Ordered delivery, launch gates, file destinations and the approval-to-documentation process |
| [06-ORIGINAL-FEATURE-REGISTER.md](06-ORIGINAL-FEATURE-REGISTER.md) | Each feature in the original brief and its place in the smaller product |
| [07-MASTERCARD-DESIGN-REFERENCE.md](07-MASTERCARD-DESIGN-REFERENCE.md) | The full imported design reference selected by the owner, preserved unedited |
| [08-CLIENT-JOURNEYS-AND-ACCEPTANCE.md](08-CLIENT-JOURNEYS-AND-ACCEPTANCE.md) | Everyday owner routine, customer access, feedback, client-linked planning and release scenarios |
| [09-FEATURE-LIST.md](09-FEATURE-LIST.md) | The single list of features to build or finish, with phase, size and dependency |
| [10-APPROVAL-CHECKLIST.md](10-APPROVAL-CHECKLIST.md) | Every owner decision and input, what each one unlocks, and where to sign it off |

This is one plan split by subject, with no further subfolders. Earlier plans (the root HTML brief, the September relaunch specification, the approved design note, adoption records, contracts and QA documents) were reviewed as source material, not silently reinstated as requirements.

## Owner decisions recorded on 10 October 2026

1. **Design.** Use the full Mastercard-inspired GetDesign system (`npx getdesign@latest add mastercard`) for the website and the CMS, with original hero and section animations. This **withdraws** the 22 September 2026 rule that the public site must not borrow another company's design language. The evidence rule from the same date stays: no claim on the public site without a source. Only the substitutions that law or access require are made (document 03).
2. **Services.** Advertise six services: web design, web development, ecommerce, website care, **general IT support** and **IT consultancy**. Networking installation and hardware repair are not offered and must not be advertised.

## Recommended decisions still awaiting approval

1. Retain the current stack and existing records. No framework migration.
2. Centre the CMS on seven destinations: Today, Enquiries, Clients, Projects, Money, Website and Settings. Supporting tools live inside the relevant record instead of in a flat 24-item sidebar.
3. Keep a small client portal. Finish its useful functions, prove isolation and keep internal controls out of it.
4. Use GAkinz as the company-facing name, with Gideon clearly named as the owner doing the work. This changes the September "personal site first" decision and needs explicit approval.
5. Keep an editorial Resources section on practical small-business IT: websites, online shops, everyday IT and equipment. Add affiliate recommendations selectively.
6. Pilot AdSense on suitable articles only, after content, consent, performance and approval checks. Service pages stay free of ads.
7. Build a synthetic-data test path and a tested recovery procedure before expanding sensitive workflows.
8. Finish fewer functions well. Optional modules stay available but quiet. Hiding navigation does not remove endpoint access or stored data.

## What matters most now

| Priority | Result required |
|---|---|
| P0 | Owner confirms credential rotation and session revocation; deployed PHP/SQL reconciled; backup restoration proven; magic-link sign-in honours 2FA (A22); Stripe charges the VAT-inclusive total and payments reconcile (A25, A26) |
| P1 | One tested enquiry to client to quote to project to invoice journey; quotes cannot be accepted from draft or declined (A27); safe blog editing; usable mobile screens; My account for every role |
| P2 | Professional public copy for six services, authorised case studies, controlled CMS publishing, route-specific metadata and useful resources |
| P3 | Social presence and a measured affiliate/ad pilot; optional reporting only when used |

P0 is a business acceptance gate, not permission to alter production during this planning task. No current online revenue or audience size has been established.

## Definition of a working system

A visitor understands the service, sends an enquiry and receives an honest acknowledgement. The owner sees the enquiry once, records the next action, arranges a call, issues an accurate quote, records acceptance and creates one client and one project. The client signs in to see only their own agreed work, invoices and shared material, sends a message, requests an update and leaves delivery feedback. These customer actions are proposed completion work, not existing capabilities. Payment totals match everywhere. The owner publishes an approved portfolio record or article without a developer and can recover the records after a failure.

Success is measured by completed journeys, not module or AI-feature counts. Suggested operating targets, to confirm in document 10: acknowledge enquiries within the stated working-day window, keep every active enquiry assigned a next action, keep every active project attached to a client, and review overdue money weekly.

## Scope and authority

This task authorises research, local read-only inspection, local checks and planning documents in this folder. It does not authorise code changes, production contact, account creation, sending messages, payment attempts, deployment, schema changes, merges, commits, pushes or deletion. Social profiles are draft copy, not created accounts.

Canonical project documents, rules and memories stay unchanged until approval. This plan is not yet the product contract. Git conclusions use local state and cached remote refs only; no fetch was performed.

## Owner inputs

All owner inputs and decisions are collected in [document 10](10-APPROVAL-CHECKLIST.md). Approval can be section-specific: approve the safety and workflow plan first and leave branding, prices or monetisation open. Silence is not approval.

## Verification summary, re-run 10 October 2026

| Check | Command | Result |
|---|---|---|
| Unit tests | `npx vitest run` | **PASS**, 21 of 21, one file (access rules only) |
| Lint | `npx eslint .` | **FAIL**, 47 errors, 2 warnings (unchanged since 22 September) |
| PHP syntax | `php -l` over every file in `server/` | **PASS**, 45 files |
| Build | `npm run build` | **NOT RE-RUN** in this revision because it writes `dist/`; PASS in the earlier same-day audit |
| Source claims | Three read-only reviews with file and line evidence | **PARTIAL**, 14 findings confirmed at source, 4 corrected, 4 added, 6 not re-checked (document 01) |

**NOT TESTED:** real authentication, client isolation, database writes, email, bookings, payments, restoration, assistive technology, production and social accounts. Production readiness remains **BLOCKED** pending the gates in document 05.

GEE OS supports the owner's development process through a sanitised manual handoff (document 08), not an automatic website builder or deployment integration.
