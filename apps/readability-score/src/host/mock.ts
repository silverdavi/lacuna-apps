import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export interface Analysis {
  id: string
  text: string
  flesch: number
  at: number
}

export interface EditorState {
  text: string
  gunningFog: boolean
}

const ANALYSES_KEY = 'lacuna.readability-score.analyses'
const EDITOR_KEY = 'lacuna.readability-score.editor'

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

const isValidAnalysis = (v: unknown): v is Analysis => {
  const r = v as Analysis
  return (
    typeof r?.text === 'string' &&
    isFiniteNumber(r.flesch) &&
    typeof r.at === 'number'
  )
}

const isValidEditor = (v: unknown): v is EditorState => {
  const s = v as EditorState
  return typeof s?.text === 'string' && typeof s.gunningFog === 'boolean'
}

export const store = {
  analyses: createMockRecordStore<Analysis>({
    key: ANALYSES_KEY,
    validate: isValidAnalysis,
    idPrefix: 'rs',
  }),
  editor: createMockValue<EditorState>({
    key: EDITOR_KEY,
    fallback: { text: '', gunningFog: false },
    validate: isValidEditor,
  }),
}
