# Original feature register

Status: proposed scope reconciliation, not a completed-feature scorecard. Source: `GAkinzOS.html`, the `MODULES` array. Extracted 10 October 2026.

The cover (`GAkinzOS.html:203-207`) says 168 features and 52 AI features. The `MODULES` array (line 238) contains 12 modules and **175 feature entries**, including **55 entries marked `ai:true`**; re-counted on 10 October 2026. Counts refer to entries, not distinct capabilities; repeated concepts such as profitability or accounting appear in more than one module. Keep the original source for traceability until the approved specification replaces its authority.

Disposition means recommended product scope: **CORE** completes or verifies a required simple journey; **OPTIONAL** retains a useful existing function quietly, adding only after demand; **DEFER** is outside the proposed release. **AI rule:** every AI row is DEFER for launch. It is not required, and any later use needs owner review, data and privacy controls and a demonstrated benefit. AI may later be used for owner-reviewed drafting without sending or publishing. No row claims runtime support. Current source evidence and actual module treatment are in documents 01 and 02.

The original twelve modules are mapped below. The extra implemented modules are covered individually in document 02: Mailbox, Design, Dev Pipeline, Resourcing, Contracts, Knowledge, Content Hub, Blog, Testimonials, Work, Files and Care Plan.

## Studio Dashboard

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Pipeline value board | CORE | Required journey. Acceptance: document 02, “Dashboard to Today”. |
| Active projects status | CORE | Required journey. Acceptance: document 02, “Dashboard to Today”. |
| Money owed counter | CORE | Required journey. Acceptance: document 02, “Dashboard to Today”. |
| Hours this week | OPTIONAL | Keep if already used; no new build without repeated need. |
| Deadlines this week | CORE | Required journey. Acceptance: document 02, “Dashboard to Today”. |
| Needs attention list | CORE | Required journey. Acceptance: document 02, “Dashboard to Today”. |
| AI morning briefing | DEFER | AI deferred (rule above). |
| AI revenue forecast | DEFER | AI deferred (rule above). |
| AI capacity warning | DEFER | AI deferred (rule above). |
| AI at-risk project flag | DEFER | AI deferred (rule above). |
| AI cash-flow alert | DEFER | AI deferred (rule above). |
## Leads & Enquiries

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Website enquiry capture | CORE | Required journey. Acceptance: document 02, “Leads to Enquiries”. |
| Visual pipeline board | OPTIONAL | Keep if already used; no new build without repeated need. |
| Lead profile | CORE | Required journey. Acceptance: document 02, “Leads to Enquiries”. |
| Source tracking | CORE | Required journey. Acceptance: document 02, “Leads to Enquiries”. |
| Follow-up reminders | CORE | Required journey. Acceptance: document 02, “Leads to Enquiries”. |
| Lead-to-client conversion | CORE | Required journey. Acceptance: document 02, “Leads to Enquiries”. |
| Activity timeline | CORE | Required journey. Acceptance: document 02, “Leads to Enquiries”. |
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
## Clients (CRM)

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Client profile | CORE | Required journey. Acceptance: document 02, “Clients”. |
| Multiple contacts per client | OPTIONAL | Keep if already used; no new build without repeated need. |
| Project history | CORE | Required journey. Acceptance: document 02, “Clients”. |
| Communication log | CORE | Required journey. Acceptance: document 02, “Clients”. |
| Client files & brand assets | CORE | Required journey. Acceptance: document 02, “Clients”. |
| Client tags | CORE | Required journey. Acceptance: document 02, “Clients”. |
| Quick links to portal | CORE | Required journey. Acceptance: document 02, “Clients”. |
| Retainer tracking | OPTIONAL | Keep if already used; no new build without repeated need. |
| Renewal & check-in reminders | OPTIONAL | Keep if already used; no new build without repeated need. |
| Client health score | DEFER | Do not replace a next-action date with an invented score. |
| Birthday / milestone nudges | DEFER | Unnecessary contact-data collection and maintenance for this scope. |
| AI upsell suggester | DEFER | AI deferred (rule above). |
| AI re-engagement drafts | DEFER | AI deferred (rule above). |
| AI client summary | DEFER | AI deferred (rule above). |
| AI churn risk | DEFER | AI deferred (rule above). |
## Projects & Tasks

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Project workspace | CORE | Required journey. Acceptance: document 02, “Projects and tasks”. |
| Milestones | CORE | Required journey. Acceptance: document 02, “Projects and tasks”. |
| Task lists with assignees | CORE | Required journey. Acceptance: document 02, “Projects and tasks”. |
| Deadlines & due dates | CORE | Required journey. Acceptance: document 02, “Projects and tasks”. |
| Kanban board | OPTIONAL | Keep if already used; no new build without repeated need. |
| Project status | CORE | Required journey. Acceptance: document 02, “Projects and tasks”. |
| File attachments per task | OPTIONAL | Keep if already used; no new build without repeated need. |
| Project templates | OPTIONAL | Keep if already used; no new build without repeated need. |
| Gantt timeline view | DEFER | Dates and next milestone first. |
| Design-to-dev handoff checklist | OPTIONAL | Keep if already used; no new build without repeated need. |
| Dependencies | DEFER | Simple task checklist first; no dependency scheduling engine. |
| Launch checklist | CORE | Required journey. Acceptance: document 02, “Projects and tasks”. |
| Recurring tasks | DEFER | Outside the simple owner/client release; do not add a new tool or subsystem. |
| AI task breakdown | DEFER | AI deferred (rule above). |
| AI deadline predictor | DEFER | AI deferred (rule above). |
| AI scope-creep alert | DEFER | AI deferred (rule above). |
| AI status update writer | DEFER | AI deferred (rule above). |
| AI workload balancer | DEFER | AI deferred (rule above). |
| AI standup summary | DEFER | AI deferred (rule above). |
## Proposals & Quotes

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Branded proposal builder | CORE | Required journey. Acceptance: document 02, “Proposals to Quotes”. |
| Line-item quotes | CORE | Required journey. Acceptance: document 02, “Proposals to Quotes”. |
| E-signature sign-off | DEFER | Defer bespoke signing. Record genuine acceptance and approved signed document first. |
| Sign-off tracking | CORE | Required journey. Acceptance: document 02, “Proposals to Quotes”. |
| Auto-convert to project | CORE | Existing branch creates project and three invoices. Add sent-state check (A27) and single-use guard (A12); preview consequences. |
| Proposal templates | OPTIONAL | Keep if already used; no new build without repeated need. |
| Tiered packages | OPTIONAL | Keep if already used; no new build without repeated need. |
| Optional add-ons | OPTIONAL | Keep if already used; no new build without repeated need. |
| Expiry & follow-up | CORE | Required journey. Acceptance: document 02, “Proposals to Quotes”. |
| Deposit on sign-off | DEFER | Outside the simple owner/client release; do not add a new tool or subsystem. |
| AI proposal drafter | DEFER | AI deferred (rule above). |
| AI scope writer | DEFER | AI deferred (rule above). |
| AI pricing helper | DEFER | AI deferred (rule above). |
| AI win-rate predictor | DEFER | AI deferred (rule above). |
| AI objection responder | DEFER | AI deferred (rule above). |
## Invoicing & Payments

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Auto-invoice | OPTIONAL | Keep if already used; no new build without repeated need. |
| Branded invoice PDF | CORE | Required journey. Acceptance: document 02, “Invoicing and payments”. |
| Online payment link | CORE | Stripe undercharges VAT and PayPal has no webhook (A25, A26). Stripe first after fixes and sandbox tests; PayPal hidden. |
| Payment reminders | CORE | Owner-controlled reminder first; no unreviewed real cron/send in QA. |
| Invoice status tracking | CORE | Required journey. Acceptance: document 02, “Invoicing and payments”. |
| Aged debt report | CORE | Required journey. Acceptance: document 02, “Invoicing and payments”. |
| Accounting sync | DEFER | Existing explicit exclusion. Manual accountant export first. |
| Milestone billing | CORE | Required journey. Acceptance: document 02, “Invoicing and payments”. |
| Recurring retainer invoices | OPTIONAL | Keep if already used; no new build without repeated need. |
| Deposit & instalments | CORE | Approve actual policy; existing 40/30/30 timed schedule must not change silently. |
| Multi-currency | DEFER | GBP first. Confirm current assumptions; do not build conversion/rate handling. |
| Late-payment fees | DEFER | Only agreed legally reviewed terms; no automatic penalty engine. |
| AI payment predictor | DEFER | AI deferred (rule above). |
| AI cash-flow forecast | DEFER | AI deferred (rule above). |
| AI reminder tone tuner | DEFER | AI deferred (rule above). |
| AI time-to-invoice | DEFER | AI deferred (rule above). |
## Client Portal

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Project progress view | CORE | Required journey. Acceptance: document 02, “Portal”. |
| Approval workflow | CORE | Simple dated acknowledgement against an exact version, not a review/markup platform. |
| Invoice & payment view | CORE | Required journey. Acceptance: document 02, “Portal”. |
| File sharing | CORE | Required journey. Acceptance: document 02, “Portal”. |
| Feedback & comments | CORE | Reuse client-owned support thread before a second messaging system. |
| Branded portal | CORE | Required journey. Acceptance: document 02, “Portal”. |
| Design review with markup | DEFER | Use versioned review link and notes; no annotation system. |
| Approval reminders | CORE | Required journey. Acceptance: document 02, “Portal”. |
| Shared project timeline | CORE | Required journey. Acceptance: document 02, “Portal”. |
| Document e-sign | DEFER | Defer portal signing product. Existing staff typed name is not verified client sign-off. |
| Asset request checklist | CORE | Required journey. Acceptance: document 02, “Portal”. |
| AI feedback summariser | DEFER | AI deferred (rule above). |
| AI approval chaser | DEFER | AI deferred (rule above). |
| AI client FAQ assistant | DEFER | AI deferred (rule above). |
| AI update digest | DEFER | AI deferred (rule above). |
## Time Tracking

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
## Support Tickets

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Client ticket raising | CORE | Required journey. Acceptance: document 02, “Support”. |
| Ticket status pipeline | CORE | Required journey. Acceptance: document 02, “Support”. |
| Priority levels | CORE | Required journey. Acceptance: document 02, “Support”. |
| Assign to team member | OPTIONAL | Keep if already used; no new build without repeated need. |
| Ticket history | CORE | Required journey. Acceptance: document 02, “Support”. |
| Resolution notes | CORE | Required journey. Acceptance: document 02, “Support”. |
| SLA timers | DEFER | No promise/engine before a confirmed support agreement and capacity. |
| Billable ticket flag | OPTIONAL | Not a ticket field today. IT support time is billed through time entries on the client's standing IT support project (document 02). |
| Maintenance plan link | OPTIONAL | Keep if already used; no new build without repeated need. |
| Knowledge base | OPTIONAL | Keep if already used; no new build without repeated need. |
| AI ticket triage | DEFER | AI deferred (rule above). |
| AI reply drafting | DEFER | AI deferred (rule above). |
| AI duplicate detection | DEFER | AI deferred (rule above). |
| AI sentiment flag | DEFER | AI deferred (rule above). |
| AI knowledge article writer | DEFER | AI deferred (rule above). |
## Communication Hub

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Project-linked messaging | CORE | Required journey. Acceptance: document 02, “Comms and Mailbox”. |
| Email integration | OPTIONAL | Existing mailbox optional. Use external mailbox plus recorded decisions initially. |
| Internal team notes | CORE | Required journey. Acceptance: document 02, “Comms and Mailbox”. |
| Notifications | CORE | Required journey. Acceptance: document 02, “Comms and Mailbox”. |
| Email templates | CORE | Required journey. Acceptance: document 02, “Comms and Mailbox”. |
| Mentions & assignments | DEFER | Outside the simple owner/client release; do not add a new tool or subsystem. |
| Scheduled send | DEFER | Defer scheduling/delivery complexity; explicit send or external mailbox. |
| Communication log | CORE | Required journey. Acceptance: document 02, “Comms and Mailbox”. |
| AI reply drafting | DEFER | AI deferred (rule above). |
| AI thread summary | DEFER | AI deferred (rule above). |
| AI tone check | DEFER | AI deferred (rule above). |
| AI meeting notes | DEFER | AI deferred (rule above). |
## Analytics & Reporting

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Revenue by month | CORE | Required journey. Acceptance: document 02, “Analytics and Time”. |
| Pipeline report | CORE | Required journey. Acceptance: document 02, “Analytics and Time”. |
| Project profitability | OPTIONAL | Keep if already used; no new build without repeated need. |
| Team utilisation | DEFER | Outside the simple owner/client release; do not add a new tool or subsystem. |
| Proposal win rate | CORE | Required journey. Acceptance: document 02, “Analytics and Time”. |
| Client lifetime value | OPTIONAL | Label actual received totals; no speculative score. |
| Lead source ROI | OPTIONAL | Simple source counts first; ROI needs reliable cost attribution. |
| Custom report builder | DEFER | A few reconciled fixed summaries first. |
| AI weekly insight | DEFER | AI deferred (rule above). |
| AI growth suggestions | DEFER | AI deferred (rule above). |
| AI pricing insight | DEFER | AI deferred (rule above). |
| AI bottleneck finder | DEFER | AI deferred (rule above). |
| AI forecast | DEFER | AI deferred (rule above). |
## Platform & Settings

| Original feature | Disposition | Scope and reason |
|---|---|---|
| Team & roles | CORE | Keep existing security roles. Hide workforce complexity in sole-owner UI. |
| Brand kit | CORE | Required journey. Acceptance: document 02, “Platform to Settings and My account”. |
| Email & PDF branding | CORE | Required journey. Acceptance: document 02, “Platform to Settings and My account”. |
| Audit trail | CORE | Required journey. Acceptance: document 02, “Platform to Settings and My account”. |
| Role-based access | CORE | Required journey. Acceptance: document 02, “Platform to Settings and My account”. |
| Calendar integration | OPTIONAL | Manual call record plus optional ICS/scheduler link first; no OAuth calendar sync. |
| Accounting integration | DEFER | Same accounting-sync exclusion; no second integration backlog. |
| Stripe / GoCardless setup | OPTIONAL | Existing Stripe can remain after testing. No new GoCardless integration proposed. |
| Zapier / Make automations | DEFER | No new automation service without repeated need and sandbox. |
| Webhooks & API | OPTIONAL | Retain existing necessary API/payment hooks; no public integration platform. |
| AI setup assistant | DEFER | AI deferred (rule above). |
| AI automation suggester | DEFER | AI deferred (rule above). |
| AI process improver | DEFER | AI deferred (rule above). |

## How this becomes the approved specification

Review CORE first, then any OPTIONAL feature the owner uses today. Keep DEFER out of launch estimates and navigation. Reclassify only through a dated decision with the user journey and maintenance cost explained. At implementation, record the actual endpoint/component and a suitable test for each core capability rather than ticking it off because a module exists.

This register does not mandate 175 implementation tasks. Several rows collapse into one usable screen or one tested journey. The new scope takes precedence only after owner approval.
