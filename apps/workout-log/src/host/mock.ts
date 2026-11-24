// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createMockRecordStore } from '@lacuna/host-mock'

export interface Exercise {
  id: string
  name: string
  reps: number
  weight: number
  sets: number
}

export interface Workout {
  id: string
  date: string
  exercises: Exercise[]
}

function isExercise(value: unknown): value is Exercise {
  const v = value as Record<string, unknown>
  return (
    typeof v?.id === 'string' &&
    typeof v?.name === 'string' &&
    typeof v?.reps === 'number' &&
    typeof v?.weight === 'number' &&
    typeof v?.sets === 'number'
  )
}

function isWorkout(value: unknown): value is Workout {
  const v = value as Record<string, unknown>
  return (
    typeof v?.id === 'string' &&
    typeof v?.date === 'string' &&
    Array.isArray(v?.exercises) &&
    v.exercises.every(isExercise)
  )
}

export const workouts = createMockRecordStore<Workout>({
  key: 'workout-log.workouts',
  validate: isWorkout,
  idPrefix: 'wk',
})
