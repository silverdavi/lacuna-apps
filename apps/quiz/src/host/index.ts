import { mockQuestionStore, mockSessionStore, mockSettings, type QuizQuestion, type QuizSettings, type SessionRecord } from './mock'

export type { QuizQuestion, QuizSettings, SessionRecord }

export const questionStore = mockQuestionStore
export const sessionStore = mockSessionStore
export const settingsStore = mockSettings

export type ExportBank = { format: 'lacuna-quiz-bank'; version: 1; questions: Omit<QuizQuestion, 'id'>[] }
export type ExportSession = { format: 'lacuna-quiz-session'; version: 1; startedAt: number; total: number; correct: number; items: SessionRecord['items'] }

export function bankToText(questions: QuizQuestion[]): string {
  return JSON.stringify({ format: 'lacuna-quiz-bank', version: 1, questions: questions.map(({ id, ...rest }) => rest) }, null, 2)
}

export function parseBank(text: string): Omit<QuizQuestion, 'id'>[] {
  const parsed: unknown = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null) throw new Error('Not a quiz bank file')
  const v = parsed as Record<string, unknown>
  if (v.format !== 'lacuna-quiz-bank' || !Array.isArray(v.questions)) throw new Error('Not a quiz bank file')
  const questions: Omit<QuizQuestion, 'id'>[] = []
  for (const raw of v.questions) {
    if (typeof raw !== 'object' || raw === null) throw new Error('Not a quiz bank file')
    const q = raw as Record<string, unknown>
    if (typeof q.prompt !== 'string' || q.prompt.trim() === '') throw new Error('A question has no text')
    if (typeof q.correct !== 'string' || q.correct.trim() === '') throw new Error('A question has no correct answer')
    if (!Array.isArray(q.wrong) || !q.wrong.every((w) => typeof w === 'string' && w.trim() !== '')) throw new Error('A question has no wrong answers')
    questions.push({ prompt: q.prompt.trim(), correct: q.correct.trim(), wrong: q.wrong.slice(0, 2).map((w) => (w as string).trim()) })
  }
  if (questions.length === 0) throw new Error('The bank file has no questions')
  return questions
}

export function sessionToText(record: Omit<SessionRecord, 'id'>): string {
  return JSON.stringify({ format: 'lacuna-quiz-session', version: 1, ...record }, null, 2)
}
