// Mock host stores for Quiz App, backed by @lacuna/host-mock so the
// question bank and session history survive a reload. All host calls
// live behind src/host/.
import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export type QuestionType = 'multiple-choice' | 'text' | 'number'

export type Question = {
  id: string
  text: string
  type: QuestionType
  options: [string, string, string, string]
  correct: string
  createdAt: number
}

export type AnswerRecord = {
  questionId: string
  given: string
  correct: string
  ok: boolean
}

export type Session = {
  id: string
  date: string
  score: number
  total: number
  answers: AnswerRecord[]
}

export type Settings = {
  shuffleOptions: boolean
}

const isQuestion = (v: unknown): v is Question => {
  const q = v as Partial<Question> | null
  return (
    !!q &&
    typeof q.id === 'string' &&
    typeof q.text === 'string' &&
    (q.type === 'multiple-choice' || q.type === 'text' || q.type === 'number') &&
    Array.isArray(q.options) &&
    q.options.length === 4 &&
    q.options.every((o) => typeof o === 'string') &&
    typeof q.correct === 'string' &&
    typeof q.createdAt === 'number'
  )
}

const isSession = (v: unknown): v is Session => {
  const s = v as Partial<Session> | null
  return (
    !!s &&
    typeof s.id === 'string' &&
    typeof s.date === 'string' &&
    typeof s.score === 'number' &&
    typeof s.total === 'number' &&
    Array.isArray(s.answers) &&
    s.answers.every(
      (a) =>
        typeof (a as Partial<AnswerRecord>).questionId === 'string' &&
        typeof (a as Partial<AnswerRecord>).given === 'string' &&
        typeof (a as Partial<AnswerRecord>).correct === 'string' &&
        typeof (a as Partial<AnswerRecord>).ok === 'boolean',
    )
  )
}

const isSettings = (v: unknown): v is Settings => {
  const s = v as Partial<Settings> | null
  return !!s && typeof s.shuffleOptions === 'boolean'
}

export const questionStore = createMockRecordStore<Question>({
  key: 'lacuna.quiz-app.questions',
  idPrefix: 'q',
  validate: isQuestion,
})

export const sessionStore = createMockRecordStore<Session>({
  key: 'lacuna.quiz-app.sessions',
  idPrefix: 's',
  validate: isSession,
})

export const settingsStore = createMockValue<Settings>({
  key: 'lacuna.quiz-app.settings',
  fallback: { shuffleOptions: false },
  validate: isSettings,
})
