import { createMockRecordStore } from '@lacuna/host-mock'

export interface MaintenanceRecord {
  id: string
  title: string
  date: string
  mileage: number
  cost: number
  type: string
  createdAt: string
}

export interface UpcomingTask {
  id: string
  task: string
  dueMileage: number
  interval: number
  createdAt: string
}

const RECORDS_KEY = 'lacuna.car-maintenance-log.records'
const TASKS_KEY = 'lacuna.car-maintenance-log.tasks'

function isMaintenanceRecord(value: unknown): value is MaintenanceRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Partial<MaintenanceRecord>
  return (
    typeof record.id === 'string' &&
    typeof record.title === 'string' &&
    typeof record.date === 'string' &&
    typeof record.mileage === 'number' &&
    typeof record.cost === 'number' &&
    typeof record.type === 'string' &&
    typeof record.createdAt === 'string'
  )
}

function isUpcomingTask(value: unknown): value is UpcomingTask {
  if (typeof value !== 'object' || value === null) return false
  const task = value as Partial<UpcomingTask>
  return (
    typeof task.id === 'string' &&
    typeof task.task === 'string' &&
    typeof task.dueMileage === 'number' &&
    typeof task.interval === 'number' &&
    typeof task.createdAt === 'string'
  )
}

const recordsStore = createMockRecordStore<MaintenanceRecord>({
  key: RECORDS_KEY,
  validate: isMaintenanceRecord,
  idPrefix: 'rec-',
})

const tasksStore = createMockRecordStore<UpcomingTask>({
  key: TASKS_KEY,
  validate: isUpcomingTask,
  idPrefix: 'task-',
})

export const host = {
  listRecords(): MaintenanceRecord[] {
    return recordsStore.list()
  },

  addRecord(record: Omit<MaintenanceRecord, 'id' | 'createdAt'>): MaintenanceRecord {
    return recordsStore.add({ ...record, createdAt: new Date().toISOString() })
  },

  deleteRecord(id: string): void {
    recordsStore.remove(id)
  },

  listTasks(): UpcomingTask[] {
    return tasksStore.list()
  },

  addTask(task: Omit<UpcomingTask, 'id' | 'createdAt'>): UpcomingTask {
    return tasksStore.add({ ...task, createdAt: new Date().toISOString() })
  },

  deleteTask(id: string): void {
    tasksStore.remove(id)
  },
}

export function formatMileage(value: number): string {
  return `${value.toLocaleString('en-US')} mi`
}

export function formatCost(value: number): string {
  return `$${value.toFixed(2)}`
}
