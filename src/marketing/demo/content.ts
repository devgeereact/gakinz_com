import type { Testimonial } from "@/lib/api"
import type { WorkRecord } from "@/marketing/data/work"

/**
 * DEMO CONTENT. DEVELOPMENT ONLY. EVERYTHING HERE IS FICTIONAL.
 *
 * Loaded by ../data/useDemo.ts through a dynamic import that only exists in a
 * development build (see ./flag.ts). It fills the empty slots of the home page
 * so a developer can see the populated layout: the hero's featured projects,
 * extra work records and the testimonial band.
 *
 * Rules for editing this file:
 *   - Keep every name obviously fictional. Never use a real business, a real
 *     person or a real client of the studio, even with permission: real
 *     material belongs in the CMS, where server/work.php checks consent.
 *   - Every record carries `demo: true`, which renders a visible "Demo" tag.
 *   - Slugs start with `demo-`, which is how useWorkRecord finds them.
 */

import type { MockKind } from "./ScreenMock"

export type { MockKind }

export type DemoWork = WorkRecord & { demo: true; mock: MockKind; tags: string[] }

export const demoWork: DemoWork[] = [
  {
    slug: "demo-harbour-and-reed",
    demo: true,
    mock: "storefront",
    tags: ["Web design", "Build", "Content"],
    kind: "case_study",
    title: "Harbour & Reed",
    clientName: null,
    sector: "Joinery, fictional",
    year: "2026",
    summary:
      "A fictional workshop's site, rebuilt so a commission enquiry arrives with the drawings and the budget already attached.",
    rows: [
      "Enquiries came in as one-line emails, and every one needed three replies before a quote could start.",
      "A portfolio led by finished rooms, and an enquiry form that asks for the room, the rough size and a budget band.",
      "Demo outcome. A real record states only a measured result, or leaves this row as a labelled gap.",
    ],
    liveUrl: null,
    repoUrl: null,
    cover: null,
    images: [],
    awaiting: null,
  },
  {
    slug: "demo-ledgerline",
    demo: true,
    mock: "dashboard",
    tags: ["Product design", "Client portal", "Payments"],
    kind: "product",
    title: "Ledgerline",
    clientName: null,
    sector: "Bookkeeping, fictional",
    year: "2026",
    summary:
      "A fictional bookkeeping practice's client portal: documents in, questions answered, invoices paid in one place.",
    rows: [
      "Clients sent receipts by email, WhatsApp and post, and month end meant a week of chasing.",
      "A portal where each client sees only their own requests, uploads and invoices, with card payment through the provider.",
      null,
    ],
    liveUrl: null,
    repoUrl: null,
    cover: null,
    images: [],
    awaiting: "Demo gap. This is how a record looks while a figure is still being measured.",
  },
  {
    slug: "demo-kiln-street",
    demo: true,
    mock: "booking",
    tags: ["Web design", "Booking", "SEO"],
    kind: "case_study",
    title: "Kiln Street Studio",
    clientName: null,
    sector: "Ceramics classes, fictional",
    year: "2025",
    summary:
      "A fictional pottery studio's booking site, where a class can be found, booked and paid for in under a minute.",
    rows: [
      "Classes were booked by phone, so evening sessions sold out to whoever happened to call first.",
      "A class calendar with live places left, deposits at booking and a reminder the day before.",
      "Demo outcome. Replace with a measured figure, or leave the gap.",
    ],
    liveUrl: null,
    repoUrl: null,
    cover: null,
    images: [],
    awaiting: null,
  },
]

export const demoTestimonials: (Testimonial & { demo: true })[] = [
  {
    id: -1,
    demo: true,
    author: "Amara Okafor",
    role: "Owner",
    company: "Harbour & Reed (fictional)",
    quote:
      "Demo quote. The enquiries now arrive with what we need to price the job, so we reply once instead of three times.",
    rating: 5,
  },
  {
    id: -2,
    demo: true,
    author: "Tom Whitfield",
    role: "Partner",
    company: "Ledgerline (fictional)",
    quote: "Demo quote. Month end used to be a week of chasing. Now the clients upload before we have to ask.",
    rating: 5,
  },
  {
    id: -3,
    demo: true,
    author: "Priya Shah",
    role: "Founder",
    company: "Kiln Street Studio (fictional)",
    quote: "Demo quote. The evening classes fill from the site now, and nobody has to sit by the phone.",
    rating: 4,
  },
]
