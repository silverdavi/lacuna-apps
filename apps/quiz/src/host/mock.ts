import { createMockRecordStore } from '@lacuna/host-mock'

export interface QuizQuestion {
  id: string
  prompt: string
  correct: string
  wrong: string[]
}

const KEY = 'lacuna.quiz.questions.v1'

function isQuizQuestion(value: unknown): value is QuizQuestion {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (typeof v.id !== 'string') return false
  if (typeof v.prompt !== 'string' || v.prompt.trim() === '') return false
  if (typeof v.correct !== 'string' || v.correct.trim() === '') return false
  if (!Array.isArray(v.wrong)) return false
  return v.wrong.every((w) => typeof w === 'string' && w.trim() !== '')
}

const store = createMockRecordStore<QuizQuestion>({
  key: KEY,
  validate: isQuizQuestion,
  idPrefix: 'q',
})

export const mockQuestionStore = {
  list(): QuizQuestion[] {
    return store.list()
  },
  add(question: Omit<QuizQuestion, 'id'> & { id?: string }): QuizQuestion {
    return store.add(question)
  },
  remove(id: string): boolean {
    return store.remove(id)
  },
}
