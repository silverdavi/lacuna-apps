import { useCallback, useMemo, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  Divider,
  EmptyState,
  Kpi,
  KpiRow,
  Rail,
  Stack,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { mulberry32 } from '@lacuna/random'
import { useClipboard } from '@lacuna/use-clipboard'
import { useUndoStack } from '@lacuna/use-undo-stack'
import { MARKER_EXACT, MARKER_PARTIAL, PEG_FILL, PEGS, type PegColor } from './colors'
import { host } from './host'

const ROWS = 4
const COLS = 4

type Peg = PegColor | ''

type Markers = { exact: number; partial: number }

type GameState = {
  secret: PegColor[]
  seed: number
  rows: Peg[][]
  markers: Markers[]
}

function makeSecret(seed: number): PegColor[] {
  const rng = mulberry32(seed + 999)
  const secret = PEGS.slice()
  for (let i = secret.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = secret[i]
    secret[i] = secret[j]
    secret[j] = tmp
  }
  return secret
}

function scoreGuess(secret: PegColor[], guess: Peg[]): Markers {
  let exact = 0
  let partial = 0
  const remaining = secret.slice()
  for (let i = 0; i < COLS; i++) {
    if (guess[i] && guess[i] === secret[i]) {
      exact++
      remaining.splice(i, 1)
    }
  }
  for (let i = 0; i < COLS; i++) {
    if (guess[i] && guess[i] !== secret[i]) {
      const idx = remaining.indexOf(guess[i] as PegColor)
      if (idx >= 0) {
        partial++
        remaining.splice(idx, 1)
      }
    }
  }
  return { exact, partial }
}

function emptyRows(): Peg[][] {
  return Array.from({ length: ROWS }, () => Array<Peg>(COLS).fill(''))
}

function initialState(seed: number): GameState {
  return {
    secret: makeSecret(seed),
    seed,
    rows: emptyRows(),
    markers: [],
  }
}

const PEG_OPTIONS: (string | { value: string; label: string })[] = [
  { value: '', label: '—' },
  ...PEGS.map((color) => ({ value: color, label: color })),
]

export function App() {
  const [best, setBest] = useState(() => host.readBest())
  const [finished, setFinished] = useState<null | { won: boolean; guesses: number }>(null)
  const [seedInput, setSeedInput] = useState('')

  const stack = useUndoStack<GameState>(initialState(1))
  const { value, set, undo, redo, reset, canUndo, canRedo } = stack

  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  const [draft, setDraft] = useState<Peg[]>(() => Array<Peg>(COLS).fill(''))

  const startGame = useCallback(
    (nextSeed: number) => {
      setBest(host.readBest())
      setDraft(Array<Peg>(COLS).fill(''))
      reset(initialState(nextSeed))
      setFinished(null)
    },
    [reset],
  )

  const onNewGame = () => {
    const trimmed = seedInput.trim()
    if (trimmed === '') {
      startGame(1)
      setSeedInput('')
      return
    }
    const n = Number(trimmed)
    if (!Number.isInteger(n) || n < 0) return
    startGame(n)
    setSeedInput('')
  }

  const onPegChange = useCallback(
    (rowIdx: number, colIdx: number, newPeg: Peg) => {
      if (finished) return
      if (rowIdx !== value.markers.length) return
      setDraft((prev) => {
        const next = prev.slice()
        next[colIdx] = newPeg
        return next
      })
    },
    [finished, value.markers.length],
  )

  const submitGuess = useCallback(() => {
    if (finished) return
    const rowIdx = value.markers.length
    if (rowIdx >= ROWS) return
    if (draft.some((p) => p === '')) return

    const markers = scoreGuess(value.secret, draft)
    set((prev) => ({
      ...prev,
      rows: prev.rows.map((line, ri) => (ri === rowIdx ? draft.slice() : line)),
      markers: [...prev.markers, markers],
    }))
    setDraft(Array<Peg>(COLS).fill(''))

    const won = markers.exact === COLS
    const exhausted = markers.exact < COLS && rowIdx + 1 === ROWS

    if (won) {
      const guesses = rowIdx + 1
      setBest((prev) => {
        const b = prev === 0 ? guesses : Math.min(prev, guesses)
        host.writeBest(b)
        return b
      })
      setFinished({ won: true, guesses })
    } else if (exhausted) {
      setFinished({ won: false, guesses: ROWS })
    }
  }, [finished, value.secret, value.markers.length, draft, set, setBest])

  const undoGuess = useCallback(() => {
    if (finished) return
    undo()
  }, [finished, undo])

  const redoGuess = useCallback(() => {
    if (finished) return
    redo()
  }, [finished, redo])

  const copyText = useMemo(() => {
    const code = value.secret.join(', ')
    const guesses = value.markers.length
    if (finished?.won) return `Seed ${value.seed}: ${code} - ${guesses} guesses`
    if (finished && !finished.won) return `Seed ${value.seed}: ${code} - lost`
    return `Seed ${value.seed}: ${code}`
  }, [value.secret, value.seed, value.markers.length, finished])

  const onCopy = () => {
    void copy(copyText)
  }

  const secretRevealed = finished?.won === true

  return (
    <AppShell
      name="Mastermind Game"
      icon="grid"
      hue="blue"
      category="Games"
      meta={`Seed: ${value.seed}`}
      side={
        <Rail
          title="Mastermind"
          note="4 of 4 colors · 4 rows"
          chips={['Codebreaker']}
        >
          <p style={{ margin: 0 }}>Best score: {best}</p>
          <p style={{ margin: 0 }}>Guesses: {value.markers.length}</p>
          <KpiRow>
            <Kpi value={String(value.markers.length)} label="Guesses" accent />
            <Kpi value={String(best)} label="Best score" />
          </KpiRow>
          {finished ? (
            <EmptyState
              mono="Result"
              title={finished.won ? `You win in ${finished.guesses} guesses` : 'The code got away'}
              detail={
                finished.won
                  ? `Seed ${value.seed} broke. Press New game for a fresh seed or Undo to replay.`
                  : `Four rows and no break on seed ${value.seed}. Press New game for another shot.`
              }
              actionLabel="New game"
            />
          ) : (
            <EmptyState
              mono="In play"
              title="Pick four pegs"
              detail="Choose one color per peg, then submit. Black marks an exact hit, gold a color in the wrong slot."
              actionLabel="Submit guess"
            />
          )}
          <Divider />
          <KpiRow>
            <Kpi value={canUndo ? 'Yes' : 'No'} label="Can undo" />
            <Kpi value={canRedo ? 'Yes' : 'No'} label="Can redo" />
          </KpiRow>
        </Rail>
      }
    >
      <Card
        mono="Game"
        title="The board"
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button kind="primary" onClick={submitGuess} disabled={finished !== null}>
              Submit guess
            </Button>
            <Button onClick={undoGuess} disabled={!canUndo || finished !== null}>
              Undo
            </Button>
            <Button onClick={redoGuess} disabled={!canRedo || finished !== null}>
              Redo
            </Button>
            <Button onClick={onCopy}>
              {copied ? 'Result copied' : 'Copy result'}
            </Button>
          </div>
        }
      >
        <Stack>
          <div>
            <Tag accent>{finished ? (finished.won ? 'Solved' : 'Lost') : 'In play'}</Tag>
            <Tag>{`Seed ${value.seed}`}</Tag>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: 320 }}>
            <TextInput
              label="Seed"
              value={seedInput}
              onChange={setSeedInput}
              inputMode="numeric"
              placeholder="1"
            />
            <Button onClick={onNewGame}>New game</Button>
          </div>

          <div className="mm-secret" role="group" aria-label="Secret code">
            {value.secret.map((c, i) => (
              <div key={i} className="mm-cell mm-cell-secret">
                <div
                  className="mm-peg"
                  role="img"
                  style={secretRevealed ? { background: PEG_FILL[c] } : undefined}
                  aria-label={secretRevealed ? `Secret ${i + 1}: ${c}` : `Secret ${i + 1}: hidden`}
                />
              </div>
            ))}
          </div>

          <div className="mm-board" aria-label="Guess board">
            {value.rows.map((row, r) => {
              const isDraftRow = r === value.markers.length && finished === null
              const activeRow: Peg[] = isDraftRow ? draft : row
              return activeRow.map((peg, c) => (
                <div key={`${r}-${c}`} className="mm-cell mm-cell-input">
                  <select
                    className="lc-input mm-peg-select"
                    aria-label={`Peg ${c + 1} row ${r + 1}`}
                    value={peg}
                    onChange={(e) => onPegChange(r, c, e.target.value as Peg)}
                  >
                    {PEG_OPTIONS.map((o) => {
                      const opt = typeof o === 'string' ? { value: o, label: o } : o
                      return (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      )
                    })}
                  </select>
                </div>
              ))
            })}
          </div>

          {value.markers.map((m, i) => (
            <div key={i} className="mm-markers">
              <span>
                {m.exact} exact, {m.partial} partial
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: m.exact }, (_, k) => (
                  <span
                    key={`e-${k}`}
                    className="mm-marker"
                    style={{ background: MARKER_EXACT }}
                  />
                ))}
                {Array.from({ length: m.partial }, (_, k) => (
                  <span
                    key={`p-${k}`}
                    className="mm-marker"
                    style={{ background: MARKER_PARTIAL }}
                  />
                ))}
              </div>
            </div>
          ))}

          <p style={{ margin: 0, fontSize: '0.8em', opacity: 0.7 }}>
            {finished?.won
              ? `Solved. The code was ${value.secret.join(', ')}.`
              : finished
                ? `No break. The code was ${value.secret.join(', ')}.`
                : `Code: ${value.secret.join(', ')}`}
          </p>
        </Stack>
      </Card>
    </AppShell>
  )
}
