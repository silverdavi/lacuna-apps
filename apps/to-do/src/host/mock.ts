// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Backs the task list with a localStorage record store via @lacuna/host-mock.

import { createMockRecordStore } from '@lacuna/host-mock'

export interface TaskRecord {
  id: string
  text: string
  done: boolean
}

const KEY = 'lacuna.to-do.tasks'

export function isTask(value: unknown): value is TaskRecord {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    typeof v.text === 'string' &&
    typeof v.done === 'boolean'
  )
}

export const store = createMockRecordStore<TaskRecord>({
  key: KEY,
  validate: isTask,
})

export function loadTasks(): TaskRecord[] {
  return store.list()
}

export function saveTasks(tasks: TaskRecord[]): void {
  store.replaceAll(tasks)
}
