import type { Mark, Question } from './deck'
import type { Mode } from './host'

export interface Session {
  title: string
  cards: Question[]
  idx: number
  marks: Record<number, Mark>
  shown: Record<number, true>
  /** Quizmaster: team indexes that took a point on each card. */
  awards: Record<number, number[]>
  mode: Mode
  teams: string[]
  /** The matching pool a deck was drawn from, so Play again can reshuffle; null for fixed rounds. */
  pool: Question[] | null
  size: number
  finished: boolean
}

export const isRevealed = (s: Session) => !!s.shown[s.idx] || !!s.marks[s.idx]
