// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Host access for the to-do app. Data is persisted locally through the mock record store.

export type { TaskRecord } from './mock'
export { isTask, loadTasks, saveTasks } from './mock'
