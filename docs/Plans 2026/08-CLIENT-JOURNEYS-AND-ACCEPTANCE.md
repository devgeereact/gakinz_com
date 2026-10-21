# Everyday ownership, customer access and project evidence

Proposed 10 October 2026. This refines the full plan for a self-employed owner. It is not implementation authority. Source review is PARTIAL; customer journeys below are NOT TESTED.

## The smallest useful working system

The owner should open Today and know who needs a reply, what is booked, what is due and what needs payment. Every item opens its actual record. A normal enquiry becomes one client and one project without copying details between modules. The customer gets clear next steps and a safe way to contact the owner.

Seven owner destinations remain enough: Today, Enquiries, Clients, Projects, Money, Website and Settings. Within a client record, show Overview, Work, Messages, Files and Money only when relevant. Project details can contain brief, milestones and evidence without adding top-level modules. A phone must support the essential daily actions; complex invoice editing may use a deliberate compact layout, but cannot require inaccessible horizontal page scrolling.

| Moment | Owner action | Information required |
|---|---|---|
| Start of working day | Review Today and choose next actions | Unanswered enquiries/messages, confirmed calls, due milestones and overdue invoices; unavailable sources labelled |
| New enquiry | Read, clarify, qualify and set next action | Contact, service interest, short brief, source and permission to reply |
| Discovery call | Offer or confirm a time, record outcome | Time zone, date, duration, contact method, scope and next step |
| Accepted work | Convert once and create the project | Client ID, accepted quote version, agreement reference, dates and deliverables |
| During delivery | Update milestone, share a message or request an asset | Visible next step, responsible person, due date and shared/private distinction |
| End of week | Review money and stalled work | Due invoices, verified receipts, overdue decisions and unsent drafts |
| Completion | Record handover, ask for feedback, request publication permission separately | Delivered items, support terms, acknowledgement and feedback |

Booking starts as a request with owner confirmation. It is not an instant purchase or guaranteed appointment. Avoid calendar synchronisation, round-robin scheduling, SMS automation and recurring booking engines until a repeated need justifies them. Record cancellation/rescheduling and notify the customer through the approved transport, with retries visible to the owner.

## Customer reference and verified identity

Give an enquiry or project a stable, human-readable reference. Display it in the acknowledgement, agreed documents and portal. A reference is an identifier, not a password. Never reveal a name, invoice, project existence or message solely because a visitor knows or guesses it.

Public entry wording: “Already working with us? Access your project.” **Phase 1 uses the existing client password login only.** The reference plus email link comes later, only after J03 passes. When it does, ask for reference and registered email, then return the same neutral response whether they match or not, and send a verified email link into the existing client-role portal. Do not build a second account platform. Decide the final owner/client login policy before implementation (document 10).

The reviewed magic-link handler currently issues a full session without checking enabled TOTP, including privileged users. Correct that policy first. Owner access should honour MFA across every route; customer-only links must not silently become owner login or account recovery. Link consumption also needs atomic single-use enforcement. Existing login availability is not evidence that the new flow is safe.

Use securely generated tokens, store their hashes, limit expiry and attempts, consume once atomically, and revoke sessions when appropriate. Keep tokens out of analytics, logs and shared URLs. Private access pages carry no advertising, affiliate scripts or public indexing. A lost email/reference follows a controlled recovery process, not a public search by company name.

The OWASP [recovery-token guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) informs token handling and neutral responses; it is a pattern reference, not a ready-made login implementation. Apply the approved policy to every alternative login path using the [MFA guidance](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html).

The server derives client identity from authenticated membership. The browser cannot choose another client ID. Each authorised company contact has its own identity linked to that client. A project reference cannot expand membership. Keep company-level portal access unless a real need emerges for project-specific restrictions. Do not add complicated permission matrices in advance.

## What a customer can do

| Action | Proposed permission and result |
|---|---|
| Check progress | Read explicitly shared milestones, next step, agreed dates and shared documents for their client |
| Send a message | Create a project-linked conversation or reply to an owned ticket; see submitted/sending/failed states |
| Request an update | Send a clear question to the owner; do not expose internal tasks or estimates |
| Supply details/assets | Update permitted brief fields or upload approved file types into the owned project |
| Change contact details | Edit permitted details; reverify changed email and notify the previous address |
| Request another call | Submit proposed availability, await owner confirmation |
| See invoices | Read own invoice and approved payment route; no ability to change totals, tax or paid status |
| Give feedback | Submit private delivery feedback; publication permission is a separate choice |

Support currently requires staff access for create/reply. Extend its ownership checks and reuse its records rather than introducing a competing messaging system. Test list, detail, create, reply and attachments separately. Private owner notes never travel in client responses. Customer edits must not alter agreements, financial records, audit history or another contact’s identity.

Use one notification route initially, preferably email plus an in-app unread marker. Notify without putting confidential message contents into subjects or broad previews. Show delivery failures to the owner and avoid duplicate sends on retry. WhatsApp remains an optional business contact link, not an API integration or the authoritative record store. Record important decisions back against the client/project.

## Feedback and public permission

At handover, offer a short form: optional rating, what worked, what could improve and whether follow-up is welcome. Do not require a public review to receive support. Avoid automated sentiment scoring, reward schemes or review gating.

A private feedback record contains client/project linkage, submission date, text and follow-up state. A separate public-testimonial request specifies the proposed excerpt, attribution and publication permission. Default is private. The existing approved testimonial list does not replace evidence of consent. Only approved, permitted content reaches the website. Keep the withdrawal process clear and record what was published.

The [ASA testimonial guidance](https://www.asa.org.uk/advice-online/testimonials-and-endorsements.html) supports retaining evidence of genuine statements and permission. A testimonial does not substantiate a technical or revenue claim by itself. Explain retention and customer rights in the actual privacy notice, using the [ICO sole-trader assessment](https://ico.org.uk/for-organisations/advice-for-small-organisations/getting-started-with-gdpr/assessment-for-small-business-owners-and-sole-traders/) as a preparation aid.

## Project planning and measurements under a client ID

Interpret “measurement” as agreed scope and delivery/quality evidence for now. Confirm any different meaning before implementation. Keep a small project brief inside the existing project, linked to its client ID and project ID:

- Problem, intended users and agreed outcome.
- Deliverables, exclusions, required client assets and approved quote reference.
- Milestones, dates, next action and outstanding decisions.
- A few meaningful measurements and dated evidence.
- Handover checklist, support boundaries and completion acknowledgement.

Do not require every field to open a project. Start with a useful brief and progressively complete it. One reusable template is sufficient. Avoid another specification editor, dependency graph, project-management suite or arbitrary custom-field builder.

| Work type | Example measurement | Evidence and limitation |
|---|---|---|
| Business website | Agreed pages, functioning enquiry route, phone/keyboard usability | Page inventory and synthetic acceptance checks; delivered pages alone do not prove conversion |
| Ecommerce | Agreed catalogue scope and tested checkout cases | Sandbox outcomes and record references; never use real orders as test fixtures |
| Care/support | Agreed issue resolved and handover recorded | Reproduction, result, client acknowledgement and next review date |
| General IT support (confirmed 10 Oct) | Reported issue resolved, cause explained, time spent | Ticket with reproduction, fix note, client confirmation and time entry on the client's IT support project; no networking or hardware repair |
| IT consultancy (confirmed 10 Oct) | Agreed questions answered | Written recommendation delivered as a shared file, client acknowledgement, follow-up date if any |

Each measurement records target, baseline where available, actual result, date, environment, method and evidence location. Use PASS, FAIL, PARTIAL or NOT TESTED for technical checks. Business outcomes such as enquiries or sales are separate observations, with time window and caveats. Avoid dashboard scores without an intelligible basis.

## GEE OS handoff without building a website generator

Use the installed GEE OS existing-application workflow when doing actual development. The CMS supplies a small owner-approved brief and checklist, not agent execution. A manual sanitised export or copy is enough initially: project reference, approved scope, acceptance criteria, decisions and non-sensitive evidence links.

Keep client personal data, secrets, live sessions and confidential documents out of exported agent context by default. No CMS shell execution, remote development agents, automatic deployments, repository provisioning or generated client websites. GEE OS remains the development workflow on the owner’s computer. Machine details stay in its local context; project facts stay with the project. A client ID connects business records, but should not become a global memory namespace for confidential content.

Record the approved implementation batch and resulting evidence back into the project manually. Customers see a plain delivery update, not internal hooks, agent prompts or development logs. Existing application records and canonical project documentation keep their distinct purposes.

## Rich public content that leads to a useful enquiry

Apply document 03’s full design and motion contract. The homepage should answer what GAkinz does, who does the work, who it helps, how engagement works and what to do next. Use real service details and permitted project evidence, not engineering counts or invented success claims.

Recommended content order: clear service-led hero; service choices; selected complete work; how a project runs; named owner and working approach; practical answers about scope, timing and support; useful IT resources; enquiry call to action. Put customer access in the navigation/footer without competing with the primary enquiry action. Service pages cover suitable customers, deliverables, exclusions, process, evidence, questions and next step. General IT support and IT consultancy are confirmed services; networking and hardware repair are not offered.

CMS services, approved work, articles, public testimonials and business/social links feed the website from one published source. Private project records require a separate approved publication record. Changing a private milestone must never publish client information. Public forms create an enquiry once, with clear acknowledgement and appropriate abuse controls. Marketing subscriptions have separate consent from an enquiry.

Resource content supports the IT niche and can host disclosed affiliate recommendations; service pages remain focused on earning work. Social profile copy and the modest publishing routine are in document 04. No accounts or communities have been created. WhatsApp community membership must be voluntary, with clear rules and no confidential client discussion.

## Required acceptance scenarios

| ID | Scenario | Phase and proof |
|---|---|---|
| J01 | Owner handles a new enquiry, follow-up, confirmed call and one conversion without duplicate records | Phase 2, synthetic journey plus retry |
| J02 | Reference alone and wrong email disclose no customer record or account existence | Phases 1-2, response and throttling checks |
| J03 | Link expires, re-use fails, concurrent consumption permits at most one valid redemption; privileged MFA cannot be skipped | Phase 1, isolated authentication tests |
| J04 | Client A cannot read/write Client B’s projects, tickets, messages, files, invoices or feedback using changed identifiers | Phase 2, endpoint tests with two fake clients |
| J05 | Customer message survives a failed send; retry creates no duplicate and owner sees notification failure | Phase 2, transport fixtures |
| J06 | Customer permitted updates work; financial/internal fields and unverified email changes are rejected | Phase 2, positive and negative endpoint cases |
| J07 | Private feedback stays private; publication requires recorded permission and approval | Phases 2-4, publish/unpublish and response inspection |
| J08 | Project brief stays client-linked, shared milestones exclude owner notes, export omits restricted information | Phases 2-3, record and sanitised export checks |
| J09 | Enquiry-to-handover task works on phone and desktop with keyboard, zoom and reduced motion | Phases 3-4, observable owner/client usability checks |
| J10 | Accurate quote/invoice/payment evidence, backup restoration and publish/edit checks pass | Phases 1-4, document 05 gates |
| J11 | A draft or declined quote cannot be accepted or converted; a sent quote converts exactly once under double-click and concurrent requests | Phase 1, endpoint tests (A12, A27) |
| J12 | Stripe charge equals the invoice payable total including VAT; a mismatched amount or currency is rejected and not marked paid | Phase 1, sandbox fixtures (A04, A05, A25) |

These supplement the existing module acceptance criteria. They are proposed checks, not twelve new modules or assertions that runtime testing has passed. Before coding, each approved batch identifies endpoints/screens, acceptance cases, rollback needs and remaining owner inputs. No schedule is credible until deployed-state and recovery discovery are complete.

## Necessary, optional and excluded

Necessary for the requested system: enquiry follow-up, confirmed booking requests, accurate quotes/invoices, client-linked delivery records, verified reference access, messages, controlled customer updates, private feedback, approved public content and recovery. Necessary safety work comes first.

Optional after the core works: calendar-file export, a single reusable brief template, care reminders, a simple source report and a small editorial monetisation pilot. Do not make advertising revenue a launch dependency or forecast income without traffic/account evidence.

Excluded from this plan: website generation, multi-company tenancy, payroll/leave management, full accounting, social API publishing, autonomous agents, custom analytics platforms, complex permissions, automatic Amazon price scraping and unnecessary folders. Existing records/modules are preserved until an exact retirement proposal and approval exist.
