// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/host-mock bridge: a single hook that owns tasks and events so the screen stays thin.
import { useState } from 'react'
import { useTasks } from '../lib/useTasks'
import { useEvents } from '../lib/useEvents'
import type { EventData, EventItem, Task, TaskData } from '../lib/types'

export type AddTaskResult = { error: string | null }
export type AddEventResult = { error: string | null }

export function useHostMock() {
  const tasksHook = useTasks()
  const eventsHook = useEvents()
  const [error, setError] = useState<string | null>(null)

  function addTask(data: TaskData): AddTaskResult {
    tasksHook.add(data)
    setError(null)
    return { error: null }
  }

  function addEvent(data: EventData): AddEventResult {
    eventsHook.add(data)
    setError(null)
    return { error: null }
  }

  function toggleTask(id: string): void {
    const task = tasksHook.tasks.find((t: Task) => t.id === id)
    if (!task) return
    tasksHook.check(id)
  }

  function removeTask(id: string): void {
    tasksHook.remove(id)
  }

  function removeEvent(id: string): void {
    eventsHook.remove(id)
  }

  function reset(): void {
    setError(null)
  }

  return {
    tasks: tasksHook.tasks,
    events: eventsHook.events,
    addTask,
    addEvent,
    toggleTask,
    removeTask,
    removeEvent,
    error,
    reset,
  }
}

export type { EventItem, Task }
