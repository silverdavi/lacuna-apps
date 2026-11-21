// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createMockRecordStore } from '@lacuna/host-mock'

export type Poll = {
  id: string
  question: string
  choices: string[]
  votes: Record<string, number>
}

function isPoll(v: unknown): v is Poll {
  if (typeof v !== 'object' || v === null) return false
  const c = v as Poll
  return (
    typeof c.id === 'string' &&
    typeof c.question === 'string' &&
    Array.isArray(c.choices) &&
    c.choices.every((x) => typeof x === 'string') &&
    typeof c.votes === 'object' &&
    c.votes !== null
  )
}

export const store = createMockRecordStore<Poll>({
  key: 'lacuna.poll-maker.mock.v1',
  validate: isPoll,
  idPrefix: 'poll',
})
