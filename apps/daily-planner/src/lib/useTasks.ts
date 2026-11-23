import { useEffect, useState } from 'react'
import { addTask, clearDone, listTasks, removeTask, updateTask } from './persistence'
import type { Task, TaskData } from './types'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => listTasks())

  useEffect(() => {
    setTasks(listTasks())
  }, [])

  function add(input: TaskData): void {
    addTask(input)
    setTasks(listTasks())
  }

  function check(id: string): void {
    updateTask(id, { done: true })
    setTasks(listTasks())
  }

  function remove(id: string): void {
    removeTask(id)
    setTasks(listTasks())
  }

  function clearFinished(): void {
    clearDone(tasks)
    setTasks(listTasks())
  }

  return { tasks, isLoading: false, add, check, remove, clearFinished }
}
