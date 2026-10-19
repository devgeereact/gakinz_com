import { describe, expect, it } from "vitest"
import type { ProjectTemplate } from "@/lib/api"
import { createOutcome, createPayload, dueOn, parseTemplates, templatePreview } from "./projectTemplateModel"

const care: ProjectTemplate = {
  key: "website_care",
  name: "Website care",
  summary: "An agreed fix.",
  tasks: [
    { title: "Confirm the issue", offset_days: 0 },
    { title: "Fix it", offset_days: 3 },
  ],
  assets: [{ label: "Description of the issue", note: "A screenshot helps." }],
  brief: {
    deliverables: "",
    exclusions: "",
    measurements: [
      { label: "Agreed issue resolved", target: "Gone", method: "Reproduced before and after" },
      { label: "Handover recorded", target: "Acknowledged", method: "Kept in Files" },
    ],
  },
}

describe("parseTemplates", () => {
  it("accepts the server's template list as it is", () => {
    expect(parseTemplates([care])).toEqual([care])
  })

  it("rejects the project list an older projects.php answers the route with", () => {
    const projectRow = { id: 4, name: "Bakery site", status: "planning", stage: "discover", task_count: 0, done_count: 0 }
    expect(parseTemplates([projectRow])).toBeNull()
  })

  it("rejects an empty list, a non-list, and a template with an unknown key or a broken row", () => {
    expect(parseTemplates([])).toBeNull()
    expect(parseTemplates(null)).toBeNull()
    expect(parseTemplates({ error: "Not allowed." })).toBeNull()
    expect(parseTemplates([{ ...care, key: "wordpress_theme" }])).toBeNull()
    expect(parseTemplates([{ ...care, tasks: [{ title: "x", offset_days: "3" }] }])).toBeNull()
    expect(parseTemplates([{ ...care, brief: { ...care.brief, measurements: [{ label: "x" }] } }])).toBeNull()
    // One bad entry hides the picker rather than offering a half-read template.
    expect(parseTemplates([care, { ...care, assets: "none" }])).toBeNull()
  })
})

describe("dueOn", () => {
  it("adds whole days in local time, across a month and a year end", () => {
    expect(dueOn(new Date(2026, 9, 19), 0)).toBe("2026-10-19")
    expect(dueOn(new Date(2026, 9, 19), 13)).toBe("2026-11-01")
    expect(dueOn(new Date(2026, 11, 30, 23, 30), 5)).toBe("2027-01-04")
  })
})

describe("templatePreview", () => {
  it("lists every row the server will create, with each task's date", () => {
    const p = templatePreview(care, new Date(2026, 9, 19))
    expect(p.counts).toBe("2 tasks, 1 asset item, 2 measurements")
    expect(p.tasks).toEqual([
      { title: "Confirm the issue", due: "2026-10-19", day: "Today" },
      { title: "Fix it", due: "2026-10-22", day: "Day 3" },
    ])
    expect(p.assets).toEqual(["Description of the issue"])
    expect(p.measurements).toEqual(["Agreed issue resolved", "Handover recorded"])
    expect(p.note).toContain("NOT TESTED")
  })
})

describe("createPayload", () => {
  it("sends no template key for a bare project, as before", () => {
    expect(createPayload({ name: "Site", client_id: "", due_date: "", template: "" })).toEqual({
      name: "Site",
      client_id: null,
      due_date: undefined,
    })
  })

  it("sends a known template key with the client and due date", () => {
    expect(createPayload({ name: "Site", client_id: "7", due_date: "2026-12-01", template: "ecommerce" })).toEqual({
      name: "Site",
      client_id: 7,
      due_date: "2026-12-01",
      template: "ecommerce",
    })
  })

  it("drops a value that is not a template key instead of sending it", () => {
    expect(createPayload({ name: "Site", client_id: "", due_date: "", template: "none" })).not.toHaveProperty("template")
  })
})

describe("createOutcome", () => {
  it("says only 'Project created.' without a template", () => {
    expect(createOutcome(null, { id: 1 })).toEqual({ message: "Project created.", warnings: [] })
  })

  it("names the template and what was created", () => {
    const r = createOutcome(care, { id: 2, template: "website_care", created: { tasks: 2, assets: 1, measurements: 2 }, skipped: [] })
    expect(r.message).toBe("Project created from Website care: 2 tasks, 1 asset item, 2 measurements.")
    expect(r.warnings).toEqual([])
  })

  it("passes on the server's note for each skipped table", () => {
    const note = "Asset checklist items were not added: the asset checklist needs the 2026-10-18 database update (SQL 15) first."
    const r = createOutcome(care, {
      id: 3,
      template: "website_care",
      created: { tasks: 2, assets: 0, measurements: 2 },
      skipped: [{ table: "project_assets", note }],
    })
    expect(r.message).toContain("0 asset items")
    expect(r.warnings).toEqual([note])
  })

  it("warns when an older server created a bare project and ignored the template", () => {
    const r = createOutcome(care, { id: 4 })
    expect(r.message).toBe("Project created.")
    expect(r.warnings[0]).toContain("template was not applied")
  })
})
