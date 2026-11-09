import { describe, expect, it } from "vitest"
import type { Task } from "@/lib/api"
import { taskFormFrom, taskFormProblem, taskPatch } from "./taskEditModel"

const task: Task = { id: 4, project_id: 1, title: "Wireframes", status: "todo", assignee: "Ann", due_date: "2026-12-01", created_at: "2026-11-01 09:00:00" }

describe("taskFormFrom", () => {
  it("fills the form from the task, with empty text for a missing assignee or date", () => {
    expect(taskFormFrom(task)).toEqual({ title: "Wireframes", assignee: "Ann", due_date: "2026-12-01" })
    expect(taskFormFrom({ ...task, assignee: null, due_date: null })).toEqual({ title: "Wireframes", assignee: "", due_date: "" })
  })
  it("cuts a date-time down to the date", () => {
    expect(taskFormFrom({ ...task, due_date: "2026-12-01 00:00:00" }).due_date).toBe("2026-12-01")
  })
})

describe("taskFormProblem", () => {
  it("needs a title", () => {
    expect(taskFormProblem({ title: "  ", assignee: "", due_date: "" })).toMatch(/title/i)
    expect(taskFormProblem({ title: "x", assignee: "", due_date: "" })).toBeNull()
  })
})

describe("taskPatch", () => {
  it("sends only what changed, trimmed", () => {
    expect(taskPatch(task, { title: "Wireframes", assignee: " Bo ", due_date: "2026-12-01" })).toEqual({ assignee: "Bo" })
    expect(taskPatch(task, { title: " New ", assignee: "Ann", due_date: "2026-12-24" })).toEqual({ title: "New", due_date: "2026-12-24" })
  })
  it("sends an empty string to clear the assignee or the date", () => {
    expect(taskPatch(task, { title: "Wireframes", assignee: "", due_date: "" })).toEqual({ assignee: "", due_date: "" })
  })
  it("sends nothing when nothing changed", () => {
    expect(taskPatch(task, taskFormFrom(task))).toEqual({})
  })
})
