import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export interface QuizQuestion {
  id: string
  prompt: string
  correct: string
  wrong: string[]
}

export interface SessionRecord {
  id: string
  startedAt: number
  total: number
  correct: number
  items: { prompt: string; correct: string; given: string; right: boolean }[]
}

const QUESTIONS_KEY = 'lacuna.quiz.questions.v1'
const SESSIONS_KEY = 'lacuna.quiz.sessions.v1'
const SETTINGS_KEY = 'lacuna.quiz.settings.v1'

function isQuizQuestion(value: unknown): value is QuizQuestion {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (typeof v.id !== 'string') return false
  if (typeof v.prompt !== 'string' || v.prompt.trim() === '') return false
  if (typeof v.correct !== 'string' || v.correct.trim() === '') return false
  if (!Array.isArray(v.wrong)) return false
  return v.wrong.every((w) => typeof w === 'string' && w.trim() !== '')
}

function isSessionRecord(value: unknown): value is SessionRecord {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (typeof v.id !== 'string') return false
  if (typeof v.startedAt !== 'number' || !Number.isFinite(v.startedAt)) return false
  if (typeof v.total !== 'number' || v.total < 0) return false
  if (typeof v.correct !== 'number' || v.correct < 0 || v.correct > v.total) return false
  if (!Array.isArray(v.items)) return false
  return v.items.every((item) => {
    if (typeof item !== 'object' || item === null) return false
    const i = item as Record<string, unknown>
    return typeof i.prompt === 'string' && typeof i.correct === 'string' && typeof i.given === 'string' && typeof i.right === 'boolean'
  })
}

export interface QuizSettings {
  shuffleAnswers: boolean
}

function isQuizSettings(value: unknown): value is QuizSettings {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.shuffleAnswers === 'boolean'
}

const questionStore = createMockRecordStore<QuizQuestion>({
  key: QUESTIONS_KEY,
  validate: isQuizQuestion,
  idPrefix: 'q',
})

const sessionStore = createMockRecordStore<SessionRecord>({
  key: SESSIONS_KEY,
  validate: isSessionRecord,
  idPrefix: 's',
})

const settingsStore = createMockValue<QuizSettings>({
  key: SETTINGS_KEY,
  fallback: { shuffleAnswers: true },
  validate: isQuizSettings,
})

export const mockQuestionStore = {
  list(): QuizQuestion[] {
    return questionStore.list()
  },
  add(question: Omit<QuizQuestion, 'id'> & { id?: string }): QuizQuestion {
    return questionStore.add(question)
  },
  remove(id: string): boolean {
    return questionStore.remove(id)
  },
  importAll(questions: Omit<QuizQuestion, 'id'>[]): QuizQuestion[] {
    const added: QuizQuestion[] = []
    for (const q of questions) added.push(questionStore.add(q))
    return added
  },
  clear(): void {
    questionStore.clear()
  },
}

export const mockSessionStore = {
  list(): SessionRecord[] {
    return sessionStore.list()
  },
  add(record: Omit<SessionRecord, 'id'> & { id?: string }): SessionRecord {
    const created = sessionStore.add(record)
    const all = sessionStore.list()
    while (all.length > 12) sessionStore.remove(all[0].id)
    return created
  },
}

export const mockSettings = {
  get(): QuizSettings {
    return settingsStore.get()
  },
  set(settings: QuizSettings): void {
    settingsStore.set(settings)
  },
}
