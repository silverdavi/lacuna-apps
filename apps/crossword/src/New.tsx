import { useMemo, useState } from 'react'
import { Actions, Button, Card, ErrorState, MonoLabel, Pills, Stack } from '@lacuna/ui'
import { CATEGORIES } from './data/clues.ts'
import type { Category } from './data/clues.ts'
import { SIZES, generate, generateDaily, poolFor } from './generate.ts'
import type { DifficultyChoice, Puzzle, SizeKey } from './generate.ts'
import type { DailyDone } from './host/index.ts'
import { formatTime } from './play.ts'

const SIZE_KEYS = Object.keys(SIZES) as SizeKey[]
const DIFFS: { label: string; value: DifficultyChoice }[] = [
  { label: 'Easy', value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard', value: 'hard' },
  { label: 'Mixed', value: 'mixed' },
]

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

interface Props {
  onStart: (p: Puzzle, source: 'generated' | 'daily') => void
  today: string
  dailyDone: DailyDone | undefined
}

export function NewPuzzle({ onStart, today, dailyDone }: Props) {
  const [size, setSize] = useState<SizeKey>('medium')
  const [difficulty, setDifficulty] = useState<DifficultyChoice>('mixed')
  const [cats, setCats] = useState<Category[]>([])
  const [fail, setFail] = useState<{ reason: string; pool: number } | null>(null)

  const pool = useMemo(() => poolFor(difficulty, cats, SIZES[size].n).length, [difficulty, cats, size])

  const toggle = (c: Category) => setCats((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))

  const run = () => {
    const seed = `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`
    const r = generate({ size, difficulty, categories: cats, seed, title: 'Crossword', attempts: 400, budgetMs: 150 })
    if (r.ok) {
      setFail(null)
      onStart(r.puzzle, 'generated')
    } else {
      setFail({ reason: r.reason, pool: r.pool })
    }
  }

  const daily = () => {
    const r = generateDaily(new Date())
    if (r.ok) onStart(r.puzzle, 'daily')
    else setFail({ reason: r.reason, pool: r.pool })
  }

  return (
    <div className="cw-screen">
      <Card
        mono="Generate"
        title="New puzzle"
        actions={
          <Actions>
            <Button kind="primary" onClick={run}>
              Generate
            </Button>
            <Button onClick={daily} ariaLabel={`Daily puzzle for ${today}`}>
              Daily
            </Button>
          </Actions>
        }
      >
        <Stack>
          <div className="cw-field">
            <MonoLabel>Size</MonoLabel>
            <Pills items={SIZE_KEYS.map((k) => SIZES[k].label)} active={SIZES[size].label} onSelect={(l) => setSize(SIZE_KEYS.find((k) => SIZES[k].label === l)!)} />
          </div>
          <div className="cw-field">
            <MonoLabel>Difficulty</MonoLabel>
            <Pills items={DIFFS.map((d) => d.label)} active={DIFFS.find((d) => d.value === difficulty)!.label} onSelect={(l) => setDifficulty(DIFFS.find((d) => d.label === l)!.value)} />
          </div>
          <div className="cw-field">
            <MonoLabel>Categories</MonoLabel>
            <div className="lc-pills" role="group" aria-label="Categories">
              <button type="button" className={`lc-pill${cats.length === 0 ? ' active' : ''}`} aria-pressed={cats.length === 0} onClick={() => setCats([])}>
                All
              </button>
              {CATEGORIES.map((c) => (
                <button key={c} type="button" className={`lc-pill${cats.includes(c) ? ' active' : ''}`} aria-pressed={cats.includes(c)} onClick={() => toggle(c)}>
                  {cap(c)}
                </button>
              ))}
            </div>
            <span className="cw-hint">{pool} clues match. {cats.length === 0 ? 'Every category is on.' : `${cats.length} of ${CATEGORIES.length} categories on.`}</span>
          </div>
          {fail ? (
            <ErrorState title="Could not build a full puzzle" detail={`${fail.reason} Widen the categories, choose Mixed difficulty, or pick a smaller size.`}>
              <Actions>
                <Button kind="primary" onClick={run}>
                  Retry
                </Button>
                <Button onClick={() => (setCats([]), setDifficulty('mixed'), setFail(null))}>Widen filters</Button>
              </Actions>
            </ErrorState>
          ) : null}
        </Stack>
      </Card>
      <Card mono={today} title="Daily puzzle">
        <Stack>
          <p>One medium crossword a day, the same for everyone on the same date. It builds on this device with no network.</p>
          <p className="cw-hint">{dailyDone ? `Solved today in ${formatTime(dailyDone.time)}.` : 'Not solved yet today.'}</p>
        </Stack>
      </Card>
    </div>
  )
}
