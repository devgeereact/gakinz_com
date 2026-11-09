import type { Task } from "@/lib/api"

// The edit form for a task on the project board (Phase 7). The server decides every rule (tasks.php); these
// helpers only fill the form, save a round trip and send just what the person changed.

export type TaskForm = { title: string; assignee: string; due_date: string }
export type TaskPatch = Partial<TaskForm>

export function taskFormFrom(t: Pick<Task, "title" | "assignee" | "due_date">): TaskForm {
  return { title: t.title, assignee: t.assignee ?? "", due_date: (t.due_date ?? "").slice(0, 10) }
}

export function taskFormProblem(f: TaskForm): string | null {
  return f.title.trim() ? null : "A task title is required."
}

/** The fields that differ from the task. An empty assignee or date is sent as "" to clear it. */
export function taskPatch(t: Pick<Task, "title" | "assignee" | "due_date">, f: TaskForm): TaskPatch {
  const was = taskFormFrom(t)
  const patch: TaskPatch = {}
  const title = f.title.trim()
  const assignee = f.assignee.trim()
  if (title !== was.title) patch.title = title
  if (assignee !== was.assignee) patch.assignee = assignee
  if (f.due_date !== was.due_date) patch.due_date = f.due_date
  return patch
}
