// Stand-in for the host records API. Records live in this browser only, and the app still runs when storage is blocked.
import type { Puzzle, SizeKey } from '../generate.ts'
import type { PlayState } from '../play.ts'

const KEY = 'lacuna.crossword'

export interface CrosswordRecord {
  id: string
  kind: 'crossword'
  name: string
  source: 'generated' | 'daily' | 'custom'
  status: 'new' | 'in-progress' | 'solved'
  updatedAt: number
  puzzle: Puzzle
  state: PlayState | null
}

export interface DailyDone {
  time: number
  reveals: number
  checks: number
}

export interface Stats {
  best: Partial<Record<SizeKey, number>>
  daily: Record<string, DailyDone>
}

const memory = new Map<string, string>()

function read<T>(name: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${KEY}.${name}`) ?? memory.get(name)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    try {
      const raw = memory.get(name)
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  }
}

function write(name: string, value: unknown) {
  const text = JSON.stringify(value)
  memory.set(name, text)
  try {
    localStorage.setItem(`${KEY}.${name}`, text)
  } catch {
    // storage unavailable; the data lives for this session only
  }
}

const MAX_AUTO = 24

export const mockStore = {
  listRecords(): CrosswordRecord[] {
    const all = read<CrosswordRecord[]>('records', [])
    return all.filter((r) => r && r.kind === 'crossword' && r.puzzle).sort((a, b) => b.updatedAt - a.updatedAt)
  },
  getRecord(id: string): CrosswordRecord | null {
    return this.listRecords().find((r) => r.id === id) ?? null
  },
  putRecord(record: CrosswordRecord) {
    const rest = this.listRecords().filter((r) => r.id !== record.id)
    let next = [record, ...rest]
    // Keep every custom puzzle; trim the oldest automatic ones.
    const auto = next.filter((r) => r.source !== 'custom')
    if (auto.length > MAX_AUTO) {
      const drop = new Set(auto.slice(MAX_AUTO).map((r) => r.id))
      next = next.filter((r) => !drop.has(r.id))
    }
    write('records', next)
  },
  deleteRecord(id: string) {
    write(
      'records',
      this.listRecords().filter((r) => r.id !== id),
    )
  },
  readStats(): Stats {
    const s = read<Partial<Stats>>('stats', {})
    return { best: s.best ?? {}, daily: s.daily ?? {} }
  },
  writeStats(stats: Stats) {
    write('stats', stats)
  },
  readDraft(): string {
    return read<string>('draft', '')
  },
  writeDraft(text: string) {
    write('draft', text)
  },
}
