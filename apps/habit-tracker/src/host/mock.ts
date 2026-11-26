import { createMockRecordStore } from '@lacuna/host-mock'

export interface Habit {
  id: string
  name: string
  done: string[]
}

const KEY = 'lacuna.habit-tracker.mock.v1'

function isHabit(v: unknown): v is Habit {
  const h = v as { id?: unknown; name?: unknown; done?: unknown }
  return (
    typeof h.id === 'string' &&
    typeof h.name === 'string' &&
    Array.isArray(h.done) &&
    h.done.every((d) => typeof d === 'string')
  )
}

export const store = createMockRecordStore<Habit>({
  key: KEY,
  validate: isHabit,
})
