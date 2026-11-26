import { createMockRecordStore } from '@lacuna/host-mock'

export interface Application {
  id: string
  company: string
  role: string
  status: string
  interviewDate: string
}

const KEY = 'lacuna.job-tracker.applications'

function isApplication(value: unknown): value is Application {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.company === 'string' &&
    typeof v.role === 'string' &&
    typeof v.status === 'string' &&
    typeof v.interviewDate === 'string'
  )
}

export const store = createMockRecordStore<Application>({
  key: KEY,
  validate: isApplication,
})
