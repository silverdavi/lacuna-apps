export interface Task {
  id: string
  text: string
  done: boolean
}

const STORAGE_KEY = 'lacuna.to-do.tasks.v1'

function read(): Task[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (t): t is Task =>
        t && typeof t.id === 'string' && typeof t.text === 'string' && typeof t.done === 'boolean',
    )
  } catch {
    return []
  }
}

function write(tasks: Task[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  } catch {
    // Storage full or unavailable; the in-memory copy still works for this session.
  }
}

function nextId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export const host = {
  listTasks(): Task[] {
    return read()
  },

  addTask(text: string): Task {
    const task: Task = { id: nextId(), text, done: false }
    write([...read(), task])
    return task
  },

  updateTask(id: string, text: string): void {
    write(read().map((t) => (t.id === id ? { ...t, text } : t)))
  },

  setDone(id: string, done: boolean): void {
    write(read().map((t) => (t.id === id ? { ...t, done } : t)))
  },

  removeTask(id: string): Task | undefined {
    const tasks = read()
    const removed = tasks.find((t) => t.id === id)
    write(tasks.filter((t) => t.id !== id))
    return removed
  },

  restoreTask(task: Task, index: number): void {
    const tasks = read()
    const at = Math.max(0, Math.min(index, tasks.length))
    tasks.splice(at, 0, task)
    write(tasks)
  },

  moveTask(id: string, direction: 'up' | 'down'): void {
    const tasks = read()
    const from = tasks.findIndex((t) => t.id === id)
    if (from < 0) return
    const to = direction === 'up' ? from - 1 : from + 1
    if (to < 0 || to >= tasks.length) return
    const [moved] = tasks.splice(from, 1)
    tasks.splice(to, 0, moved)
    write(tasks)
  },
}

export type Host = typeof host
