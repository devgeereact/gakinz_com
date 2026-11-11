/**
 * Realistic, synthetic data for the CMS layout test (V1.1 item 4): enough rows to wrap and scroll, long names, every
 * status an invoice, enquiry, ticket or project can be in, and tables left empty on purpose so the empty states
 * are drawn too. Everything is invented and every address ends in .test. Only ever written to the throwaway
 * *_test database (tests/server/env.ts refuses anything else).
 */
import { q, sql } from "../server/helpers"

const LONG_CLIENT = "Whitmore, Featherstonehaugh & Partners Chartered Accountants and Business Advisers (Holdings) Limited"
const LONG_MESSAGE =
  "We are a family-run firm with four offices across the south west and about sixty staff. Our current website was built in 2014, is not mobile friendly and the booking form emails a PDF that nobody reads. We would like a redesign, a client portal for sharing documents, and someone who will still pick up the phone in two years' time. Budget is flexible for the right team. " .repeat(1)

const COMPANIES = [
  "Priya's Kitchen", "Okafor Joinery", "Harni Muharami", "Dhemmyn Food", "Volume Press", "RitaGreen Services", "Vitalcare Training Hub",
  "Herit Clothing", "MimmyCare", "EGO Limited", "Bristol & Bath Fitted Furniture Co", "The Little Nursery Company", LONG_CLIENT,
  "Ashby Dental Practice", "Greenway Physiotherapy", "Northgate Florists", "Kestrel Ceramics", "Tidewater Deli", "Marlow & Sons Plumbing",
  "Juniper Yoga Studio", "Lantern Books", "Copperfield Accountants", "Brightside Childcare", "Hollis Bakery", "Fenwick Cycles",
]

const rep = (n: number) => Array.from({ length: n }, (_, i) => i)

/** Seeds the database and returns what the test needs to sign in and look around. */
export function seedRealistic(): { clientIds: number[] } {
  const stmts: string[] = []
  const clientRows = rep(40).map((i) => {
    const company = i < COMPANIES.length ? COMPANIES[i] : `Sample Client ${i + 1} Ltd`
    const contact = i % 7 === 3 ? null : ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Katherine Johnson", "Tim Berners-Lee"][i % 5]
    return `(${q(company)}, ${q(contact ?? "")}, ${q(`client${i + 1}@example.test`)}, ${q(i % 3 === 0 ? "+44 20 7946 0" + String(100 + i) : "")}, ${q(i % 4 === 0 ? "retainer" : "")}, ${i % 4 === 0 ? 250 + i * 10 : 0}, ${q(i % 6 === 0 ? "Prefers a phone call before anything is sent. Pays by bank transfer, usually on the last Friday of the month." : "")})`
  })
  stmts.push(`INSERT INTO clients (company, contact_name, email, phone, tag, retainer_amount, notes) VALUES ${clientRows.join(",")};`)

  const statuses = ["new", "new", "contacted", "contacted", "proposal", "won", "lost"]
  const enquiries = rep(40).map((i) => {
    const name = i % 9 === 4 ? "Bartholomew Featherstonehaugh-Cholmondeley" : ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Edsger Dijkstra", "Margaret Hamilton"][i % 5]
    const msg = i % 3 === 0 ? LONG_MESSAGE : "Hello, I would like a quote for a new website please."
    return `(${q(name)}, ${q(`lead${i + 1}@example.test`)}, ${q(i % 2 ? COMPANIES[i % COMPANIES.length] : "")}, ${q(["Under £1,500", "£1,500 to £3,500", "£3,500 to £6,000", "Not sure yet"][i % 4])}, ${q(["New website", "Redesign", "Online shop", "IT support"][i % 4])}, ${q(msg)}, ${q(statuses[i % statuses.length])}, NOW() - INTERVAL ${i * 5 + 1} HOUR, ${q(`GK-E-2026-${String(i + 1).padStart(4, "0")}`)})`
  })
  stmts.push(`INSERT INTO enquiries (name, email, company, budget, project_type, message, status, created_at, reference) VALUES ${enquiries.join(",")};`)

  const stages = ["discover", "design", "build", "launch", "support"]
  const projects = rep(14).map(
    (i) => `(${(i % 12) + 1}, ${q(i === 3 ? "Whitmore client portal, document sharing, e-signature and staff intranet rebuild phase two" : `Sample project ${i + 1}`)}, ${q(i % 6 === 5 ? "completed" : "in_progress")}, ${q(stages[i % 5])}, CURRENT_DATE + INTERVAL ${i * 6 - 10} DAY, ${q(`GK-P-2026-${String(i + 1).padStart(4, "0")}`)})`,
  )
  stmts.push(`INSERT INTO projects (client_id, name, status, stage, due_date, reference) VALUES ${projects.join(",")};`)
  const tasks = rep(70).map(
    (i) => `(${(i % 14) + 1}, ${q(i % 10 === 0 ? "Write the long-form accessibility statement, with the testing method and the known issues listed" : `Task ${i + 1}`)}, ${q(["todo", "in_progress", "done"][i % 3])}, ${q(["Gideon", "Sam", ""][i % 3])}, CURRENT_DATE + INTERVAL ${(i % 20) - 8} DAY)`,
  )
  stmts.push(`INSERT INTO tasks (project_id, title, status, assignee, due_date) VALUES ${tasks.join(",")};`)

  const invStatus = ["draft", "sent", "sent", "paid", "paid", "void"]
  const invoices = rep(30).map((i) => {
    const st = invStatus[i % invStatus.length]
    const overdue = st === "sent" && i % 4 === 1
    return `(${(i % 20) + 1}, ${q(`GK-INV-${String(i + 1).padStart(4, "0")}`)}, ${q(st)}, 20, CURRENT_DATE - INTERVAL ${40 + i} DAY, CURRENT_DATE ${overdue ? "- INTERVAL 10 DAY" : "+ INTERVAL 14 DAY"}, ${st === "paid" ? "CURRENT_DATE - INTERVAL 3 DAY" : "NULL"})`
  })
  stmts.push(`INSERT INTO invoices (client_id, number, status, vat_rate, issued_at, due_at, paid_at) VALUES ${invoices.join(",")};`)
  stmts.push(
    `INSERT INTO invoice_items (invoice_id, description, qty, unit_price) VALUES ${rep(30)
      .flatMap((i) => [
        `(${i + 1}, ${q("Design and build, stage one: layouts, content design and the first working pages")}, 1, ${900 + i * 40})`,
        `(${i + 1}, ${q("Hosting set-up")}, 2, 75)`,
      ])
      .join(",")};`,
  )

  const proposals = rep(8).map((i) => `(${(i % 12) + 1}, ${q(i === 2 ? "Website redesign, client portal and a year of care for a multi-office practice" : `Proposal ${i + 1}`)}, ${q(["draft", "sent", "viewed", "accepted", "declined", "sent", "draft", "accepted"][i])}, 20)`)
  stmts.push(`INSERT INTO proposals (client_id, title, status, vat_rate) VALUES ${proposals.join(",")};`)
  stmts.push(`INSERT INTO proposal_items (proposal_id, description, qty, unit_price) VALUES ${rep(8).map((i) => `(${i + 1}, ${q("Design and build")}, 1, ${1500 + i * 250})`).join(",")};`)

  const tickets = rep(14).map((i) => `(${(i % 12) + 1}, ${q(i === 1 ? "Data deletion request" : i % 5 === 0 ? "The contact form on the live site stopped sending enquiries to our shared mailbox after the weekend" : `Ticket ${i + 1}`)}, ${q("Synthetic ticket body.")}, ${q(["open", "in_progress", "resolved"][i % 3])}, ${q(["normal", "high", "urgent", "low"][i % 4])})`)
  stmts.push(`INSERT INTO tickets (client_id, subject, body, status, priority) VALUES ${tickets.join(",")};`)
  stmts.push(`INSERT INTO ticket_replies (ticket_id, body) VALUES ${rep(6).map((i) => `(${i + 1}, ${q("Thanks, looking at this now.")})`).join(",")};`)

  stmts.push(`INSERT INTO posts (slug, title, excerpt, body, category, status, published_at) VALUES ${rep(8).map((i) => `(${q(`post-${i + 1}`)}, ${q(i === 2 ? "Why one team should design and build, and what that does to the price of a small website" : `Post ${i + 1}`)}, ${q("A short excerpt.")}, ${q("Paragraph one.\n\nParagraph two.")}, ${q("Practice")}, ${q(i % 4 === 3 ? "draft" : "published")}, NOW() - INTERVAL ${i * 6} DAY)`).join(",")};`)
  stmts.push(`INSERT INTO testimonials (author, role, company, quote, rating, approved) VALUES ${rep(6).map((i) => `(${q("Reviewer " + (i + 1))}, ${q("Owner")}, ${q(COMPANIES[i])}, ${q("A synthetic quote that is long enough to wrap onto a second line on a phone screen, to see how the card copes.")}, ${(i % 2) + 4}, ${i % 3 === 0 ? 0 : 1})`).join(",")};`)
  stmts.push(`INSERT INTO certificates (public_id, recipient, programme, issued_at) VALUES ${rep(6).map((i) => `(${q(`GK-AAAA-BBBB-C${String(i).padStart(3, "0")}`)}, ${q("Recipient " + (i + 1))}, ${q("Care Certificate, mandatory training")}, CURRENT_DATE - INTERVAL ${i * 20} DAY)`).join(",")};`)
  stmts.push(`INSERT INTO bookings (client_id, starts_at, timezone, duration_min, status) VALUES ${rep(6).map((i) => `(${i + 1}, UTC_TIMESTAMP() + INTERVAL ${i * 30 - 20} HOUR, 'Europe/London', 20, ${q(["requested", "confirmed", "completed", "cancelled"][i % 4])})`).join(",")};`)
  stmts.push(`INSERT INTO time_entries (project_id, description, minutes, billable, entry_date) VALUES ${rep(30).map((i) => `(${(i % 14) + 1}, ${q("Synthetic time entry " + (i + 1))}, ${30 + (i % 8) * 15}, ${i % 3 ? 1 : 0}, CURRENT_DATE - INTERVAL ${i} DAY)`).join(",")};`)
  stmts.push(`INSERT INTO contracts (client_id, kind, title, status, body) VALUES ${rep(4).map((i) => `(${i + 1}, ${q(["agreement", "nda"][i % 2])}, ${q("Service Agreement " + (i + 1))}, ${q(["draft", "sent", "signed", "sent"][i])}, ${q("Synthetic contract body.")})`).join(",")};`)
  stmts.push(`INSERT INTO kb_articles (title, category, body) VALUES ${rep(6).map((i) => `(${q("Knowledge article " + (i + 1))}, ${q("Process")}, ${q("Steps one to five.")})`).join(",")};`)
  stmts.push(`INSERT INTO announcements (title, body, level) VALUES (${q("Bank holiday: the studio is closed on Monday")}, ${q("Replies resume on Tuesday morning.")}, 'info');`)
  sql(stmts.join("\n"))
  return { clientIds: rep(40).map((i) => i + 1) }
}
