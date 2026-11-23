import { createMockRecordStore } from '@lacuna/host-mock'
import type { Task, TaskData } from './types'

const TASKS_KEY = 'lacuna.daily-planner.tasks'

export const taskStore = createMockRecordStore<Task>({
  key: TASKS_KEY,
})

export function listTasks(): Task[] {
  return taskStore.list()
}

export function addTask(input: TaskData): Task {
  const now = Date.now()
  const task: Task = { ...input, id: `task-${now}`, createdAt: now }
  taskStore.add(task)
  return task
}

export function updateTask(id: string, patch: Partial<Task>): void {
  taskStore.update(id, patch)
}

export function removeTask(id: string): void {
  taskStore.remove(id)
}

export function clearDone(tasks: Task[]): void {
  for (const task of tasks) {
    if (task.done) taskStore.remove(task.id)
  }
}
