export type Recurrence = 'none' | 'Daily' | 'Weekly' | 'Monthly'

export interface Task {
  id: string
  title: string
  due: string
  done: boolean
  recurrence: Recurrence
  createdAt: number
}

export type TaskData = Omit<Task, 'id' | 'createdAt'>

export interface EventItem {
  id: string
  title: string
  date: string
  time: string
  recurrence: Recurrence
  createdAt: number
}

export type EventData = Omit<EventItem, 'id' | 'createdAt'>
