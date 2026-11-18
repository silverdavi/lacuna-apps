import { createMockTodoStore, makeId } from './mock'
import type { TodoStore, TodoTask } from './mock'

export type { TodoStore, TodoTask }
export { makeId }

export const store: TodoStore = createMockTodoStore()

export function addTask(title: string, dueDate: string | null): { task: TodoTask; duplicate: boolean } {
  const tasks = store.list()
  if (tasks.some((t) => t.title === title)) {
    return { task: tasks.find((t) => t.title === title)!, duplicate: true }
  }
  const task: TodoTask = { id: makeId(), title, dueDate, completed: false }
  store.save([...tasks, task])
  return { task, duplicate: false }
}

export function toggleTask(id: string): TodoTask[] {
  const tasks = store.list()
  const next = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
  store.save(next)
  return next
}

export function deleteTask(id: string): TodoTask[] {
  const tasks = store.list()
  const next = tasks.filter((t) => t.id !== id)
  store.save(next)
  return next
}

export function reorderTasks(fromId: string, toId: string): TodoTask[] {
  const tasks = store.list()
  const from = tasks.findIndex((t) => t.id === fromId)
  const to = tasks.findIndex((t) => t.id === toId)
  if (from === -1 || to === -1 || from === to) return tasks
  const next = [...tasks]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  store.save(next)
  return next
}
