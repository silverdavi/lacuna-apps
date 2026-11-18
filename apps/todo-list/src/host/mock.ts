export interface TodoTask {
  id: string
  title: string
  dueDate: string | null
  completed: boolean
}

export interface TodoStore {
  list(): TodoTask[]
  save(tasks: TodoTask[]): void
}

const KEY = 'lacuna.todo-list.tasks'

let seq = 0
function nextId(): string {
  seq += 1
  return `todo-${Date.now().toString(36)}-${seq}`
}

export function makeId(): string {
  return nextId()
}

function isTask(value: unknown): value is TodoTask {
  if (typeof value !== 'object' || value === null) return false
  const t = value as Record<string, unknown>
  return (
    typeof t.id === 'string' &&
    typeof t.title === 'string' &&
    typeof t.completed === 'boolean' &&
    (t.dueDate === null || typeof t.dueDate === 'string')
  )
}

export function createMockTodoStore(): TodoStore {
  return {
    list(): TodoTask[] {
      try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return []
        const parsed: unknown = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed.filter(isTask)
      } catch {
        return []
      }
    },
    save(tasks: TodoTask[]): void {
      localStorage.setItem(KEY, JSON.stringify(tasks))
    },
  }
}
