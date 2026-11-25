import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

export function App() {
  const [best, setBest] = useState(() => host.readBest())
  const [finished, setFinished] = useState<null | { won: boolean; guesses: number }>(null)
  const [seedInput, setSeedInput] = useState('')

  const stack = useUndoStack<GameState>(initialState(1))
  const { value, set, undo, redo, reset, canUndo, canRedo } = stack

  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  const finishedRef = useRef(finished)
  useEffect(() => {
    finishedRef.current = finished
  }, [finished])

  const bestRef = useRef(best)
  useEffect(() => {
    bestRef.current = best
  }, [best])

  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  const startGame = useCallback(
    (nextSeed: number) => {
      const b = host.readBest()
      setBest(b)
      reset(initialState(nextSeed))
      setFinished(null)
    },
    [reset],
  )

  const onNewGame = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = seedInput.trim()
    if (trimmed === '') {
      startGame(1)
      setSeedInput('')
      return
    }
    const n = Number(trimmed)
    if (!Number.isInteger(n) || n < 0) {
      setSeedInput('')
      return
    }
    startGame(n)
    setSeedInput('')
  }

  const onPegChange = useCallback(
    (rowIdx: number, colIdx: number, newPeg: Peg) => {
      const v = valueRef.current
      const next = v.rows.map((line, ri) =>
        ri === rowIdx ? line.map((p, ci) => (ci === colIdx ? newPeg : p)) : line,
      )
      set({ ...v, rows: next })
    },
    [set],
  )

  const submitGuess = useCallback(() => {
    const v = valueRef.current
    const f = finishedRef.current
    if (f) return
    const rowIdx = v.markers.length
    if (rowIdx >= ROWS) return

    const row = v.rows[rowIdx]
    if (row.some((p) => p === '')) return

    const markers = scoreGuess(v.secret, row)
    const nextRows = v.rows.map((line, ri) => (ri === rowIdx ? row.slice() : line.slice()))
    const nextMarkers = [...v.markers, markers]

    const won = markers.exact === COLS
    const exhausted = nextMarkers.length === ROWS && !won

    set({
      ...v,
      rows: nextRows,
      markers: nextMarkers,
    })

    if (won) {
      const prev = bestRef.current
      const b = prev === 0 ? rowIdx + 1 : Math.min(prev, rowIdx + 1)
      setBest(b)
      host.writeBest(b)
      setFinished({ won: true, guesses: rowIdx + 1 })
    } else if (exhausted) {
      setFinished({ won: false, guesses: ROWS })
    }
  }, [set])

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
              title={finished.won ? `Cracked it in ${finished.guesses}` : 'The code got away'}
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
              actionLabel="Submit"
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
            <Button onClick={undo} disabled={!canUndo}>
              Undo
            </Button>
            <Button onClick={redo} disabled={!canRedo}>
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

          <form
            onSubmit={onNewGame}
            style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: 320 }}
          >
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                flex: 1,
                fontSize: '0.8rem',
                opacity: 0.85,
              }}
            >
              Seed
              <input
                type="number"
                min={0}
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="1"
                style={{
                  width: '100%',
                  padding: 'calc(6px * var(--sf)) calc(8px * var(--sf))',
                  borderRadius: 6,
                  border: 'calc(1px * var(--sf)) solid var(--line)',
                  background: 'var(--paper)',
                  color: 'inherit',
                }}
              />
            </label>
            <Button type="submit">New game</Button>
          </form>

          <div className="mm-secret" role="group" aria-label="Secret code">
            {value.secret.map((c, i) => (
              <div key={i} className="mm-cell">
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
            {value.rows.map((row, r) =>
              row.map((peg, c) => (
                <div key={`${r}-${c}`} className="mm-cell">
                  <select
                    aria-label={`row ${r + 1} peg ${c + 1}`}
                    value={peg}
                    onChange={(e) => onPegChange(r, c, e.target.value as Peg)}
                  >
                    <option value="">—</option>
                    {PEGS.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </div>
              )),
            )}
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

          {finished ? (
            <EmptyState
              mono="Result"
              title={
                finished.won
                  ? `You win in ${finished.guesses} guesses`
                  : 'No break in four rows'
              }
              detail={
                finished.won
                  ? `The code was ${value.secret.join(', ')}. Copy the result or start a new seed.`
                  : `Four rows and no break. The code was ${value.secret.join(', ')}. Start a new seed.`
              }
              actionLabel="Copy result"
            />
          ) : null}
        </Stack>
      </Card>
    </AppShell>
  )
}
