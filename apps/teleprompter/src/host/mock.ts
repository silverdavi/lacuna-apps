import { SAMPLE_NAME, SAMPLE_TEXT } from '../sample'

const SCRIPTS = 'lacuna.teleprompter.scripts'
const PREFS = 'lacuna.teleprompter.prefs'

export type Mode = 'scroll' | 'step'

/** The record kind `teleprompter-script`: the text plus where you stopped and how you read it. */
export interface ScriptRecord {
  id: string
  name: string
  text: string
  updated: number
  /** Index of the step you stopped on. */
  pos: number
  mode: Mode
  wpm: number
  /** Reading size multiplier. */
  size: number
  mirror: boolean
  flip: boolean
}

export interface Prefs {
  anchor: boolean
  ids: boolean
  cues: boolean
  contrast: boolean
  countdown: boolean
}

export const DEFAULT_PREFS: Prefs = { anchor: true, ids: false, cues: true, contrast: false, countdown: true }

export function newScript(name: string, text: string): ScriptRecord {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `s${Date.now()}${Math.random().toString(36).slice(2)}`
  return { id, name, text, updated: Date.now(), pos: 0, mode: 'scroll', wpm: 150, size: 1, mirror: false, flip: false }
}

const clamp = (n: unknown, lo: number, hi: number, fallback: number) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback

function clean(raw: unknown): ScriptRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.name !== 'string' || typeof r.text !== 'string') return null
  return {
    id: r.id,
    name: r.name,
    text: r.text,
    updated: clamp(r.updated, 0, Number.MAX_SAFE_INTEGER, Date.now()),
    pos: Math.round(clamp(r.pos, 0, 100000, 0)),
    mode: r.mode === 'step' ? 'step' : 'scroll',
    wpm: Math.round(clamp(r.wpm, 60, 240, 150)),
    size: clamp(r.size, 0.5, 3, 1),
    mirror: r.mirror === true,
    flip: r.flip === true,
  }
}

export const mockStore = {
  /** Saved scripts. The first run is seeded with one sample; a library you emptied stays empty. */
  readScripts(): ScriptRecord[] {
    try {
      const raw = localStorage.getItem(SCRIPTS)
      if (raw !== null) {
        const list = JSON.parse(raw)
        if (Array.isArray(list)) return list.map(clean).filter((s): s is ScriptRecord => s !== null)
      }
    } catch {
      // fall through to the seed
    }
    return [newScript(SAMPLE_NAME, SAMPLE_TEXT)]
  },
  writeScripts(list: ScriptRecord[]) {
    try {
      localStorage.setItem(SCRIPTS, JSON.stringify(list))
    } catch {
      // storage unavailable; scripts live for this session only
    }
  },
  readPrefs(): Prefs {
    try {
      const raw = localStorage.getItem(PREFS)
      if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
    } catch {
      // defaults
    }
    return DEFAULT_PREFS
  },
  writePrefs(prefs: Prefs) {
    try {
      localStorage.setItem(PREFS, JSON.stringify(prefs))
    } catch {
      // session only
    }
  },
}
