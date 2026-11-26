// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/spaced-repetition 0.1.0: snapshot of lacuna-components spacedRepetition at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { addDays, fromISODate, toISODate } from '@lacuna/date-math'

export type Grade = 0 | 1 | 2 | 3 | 4 | 5

export interface CardState {
  id: string
  easeFactor: number
  interval: number
  repetitions: number
  dueDate: string
}

export interface ReviewResult {
  card: CardState
  nextDueDate: string
}

const EASE_FLOOR = 1.3
const DEFAULT_EASE_FACTOR = 2.5

export function newCard(id: string, today: string): CardState {
  return {
    id,
    easeFactor: DEFAULT_EASE_FACTOR,
    interval: 0,
    repetitions: 0,
    dueDate: today,
  }
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100
}

function computeInterval(previousInterval: number, easeFactor: number): number {
  if (previousInterval <= 1) return 6
  return Math.round(previousInterval * easeFactor)
}

function easeFactorDelta(grade: Grade): number {
  switch (grade) {
    case 5:
    case 4:
      return 0.1
    case 3:
      return 0
    case 2:
      return -0.1
    case 1:
      return -0.2
    case 0:
      return -0.4
  }
}

export function reviewCard(card: CardState, grade: Grade, today: string): ReviewResult {
  let easeFactor = roundToTwo(card.easeFactor + easeFactorDelta(grade))
  if (easeFactor < EASE_FLOOR) easeFactor = EASE_FLOOR

  let repetitions: number
  let interval: number
  let nextDueDate: string

  if (grade < 3) {
    repetitions = 0
    interval = 0
    nextDueDate = today
  } else {
    if (card.repetitions === 0) {
      repetitions = 1
      interval = 1
    } else if (card.repetitions === 1) {
      repetitions = 2
      interval = 6
    } else {
      repetitions = card.repetitions + 1
      interval = computeInterval(card.interval, easeFactor)
    }
    const base = fromISODate(today)
    nextDueDate = base ? toISODate(addDays(base, interval)) : today
  }

  return {
    card: { id: card.id, easeFactor, interval, repetitions, dueDate: nextDueDate },
    nextDueDate,
  }
}

export function getDueQueue(cards: CardState[], today: string): CardState[] {
  return cards.filter((card) => card.dueDate <= today)
}

export function getStats(cards: CardState[], today: string): { total: number; due: number; learning: number; mature: number } {
  let due = 0
  let learning = 0
  let mature = 0
  for (const card of cards) {
    const isDue = card.dueDate <= today
    const isLearning = card.repetitions === 0
    const isMature = card.repetitions >= 3
    if (isLearning) learning += 1
    else if (isDue) due += 1
    else if (isMature) mature += 1
  }
  return { total: cards.length, due, learning, mature }
}
