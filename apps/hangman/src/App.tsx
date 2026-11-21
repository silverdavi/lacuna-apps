import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  Chip,
  EmptyState,
  Kpi,
  KpiRow,
  MonoLabel,
  Rail,
  Stack,
  Table,
  Tag,
} from '@lacuna/ui'
import { Chart } from '@lacuna/chart'
import { useLocalRecord } from '@lacuna/use-local-record'


interface RoundRecord {
  word: string
  result: 'won' | 'lost'
  missed: number
}

interface GameRecord {
  score: number
  best: number
  history?: RoundRecord[]
}

const WORD = 'CAT'
const SLOTS = 6
const LIVES = 6
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const CLIPBOARD_NOTE = 'Word copied.'

type Status = 'playing' | 'won' | 'lost'

interface Round {
  word: string
  revealed: boolean[]
  missed: string[]
  status: Status
}

function freshRound(): Round {
  return {
    word: WORD,
    revealed: new Array(SLOTS).fill(false),
    missed: [],
    status: 'playing',
  }
}

const slotStyle: CSSProperties = {
  display: 'inline-block',
  minWidth: 'calc(34px * var(--sf))',
  border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
  borderRadius: 'calc(2px * var(--sf))',
  padding: 'calc(8px * var(--sf)) calc(10px * var(--sf))',
  fontFamily: 'var(--mono)',
  fontSize: 'calc(18px * var(--tf))',
  color: 'var(--ink)',
  textAlign: 'center',
  pointerEvents: 'none',
}

const missedStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'calc(4px * var(--sf))',
  minHeight: 'calc(24px * var(--sf))',
}

const keyStyle: CSSProperties = {
  width: 'calc(26px * var(--sf))',
  height: 'calc(26px * var(--sf))',
  fontSize: 'calc(12px * var(--tf))',
  padding: 0,
}

const figStroke: CSSProperties = { strokeWidth: 3, strokeLinecap: 'round' }

function HangmanFigure({ strokes }: { strokes: number }) {
  const on = (n: number): CSSProperties =>
    n <= strokes ? { ...figStroke, stroke: 'var(--ink)' } : { ...figStroke, stroke: 'var(--ink-40)' }
  return (
    <svg viewBox="0 0 120 160" width={110} height={148} fill="none" aria-hidden>
      <g stroke="var(--ink)" style={on(1)}>
        <line x1="8" y1="154" x2="66" y2="154" />
        <line x1="20" y1="154" x2="20" y2="10" />
        <line x1="20" y1="12" x2="68" y2="12" />
        <line x1="68" y1="12" x2="68" y2="28" />
      </g>
      <circle cx="68" cy="40" r="12" style={on(2)} />
      <line x1="68" y1="52" x2="68" y2="98" style={on(3)} />
      <line x1="68" y1="62" x2="44" y2="80" style={on(4)} />
      <line x1="68" y1="62" x2="92" y2="80" style={on(5)} />
      <line x1="68" y1="98" x2="48" y2="132" style={on(6)} />
    </svg>
  )
}

function editable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export function App() {
  const { value: record, set: setRecord } = useLocalRecord<GameRecord>({
    key: 'lacuna.hangman.record',
    version: 1,
    defaultValue: { score: 0, best: 0, history: [] },
  })
  const [round, setRound] = useState<Round | null>(null)
  const [tab, setTab] = useState('Play')
  const [copied, setCopied] = useState(false)

  const history: RoundRecord[] = record.history ?? []
  const lives = round ? LIVES - round.missed.length : LIVES

  const finish = (r: Round) => {
    const entry: RoundRecord = {
      word: r.word,
      result: r.status === 'won' ? 'won' : 'lost',
      missed: r.missed.length,
    }
    setRecord((current) => {
      const score = current.score + (r.status === 'won' ? 1 : 0)
      return {
        score,
        best: Math.max(current.best, score),
        history: [...(current.history ?? []), entry],
      }
    })
  }

  function start() {
    setRound(freshRound())
  }

  function restart() {
    setRound(freshRound())
  }

  function guess(letter: string) {
    if (!round || round.status !== 'playing') return
    if (round.missed.includes(letter)) return
    if (round.word.includes(letter)) {
      const revealed = round.revealed.map((on, i) => on || round.word[i] === letter)
      const won = round.word.split('').every((ch, i) => revealed[i])
      const next: Round = { ...round, revealed, status: won ? 'won' : 'playing' }
      setRound(next)
      if (won) finish(next)
      return
    }
    const missed = [...round.missed, letter]
    const next: Round = { ...round, missed, status: missed.length >= LIVES ? 'lost' : 'playing' }
    setRound(next)
    if (next.status === 'lost') finish(next)
  }

  const playing = round?.status === 'playing'
  const guessRef = useCallback((letter: string) => guess(letter), [round])
  const restartRef = useCallback(() => restart(), [round])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editable(e.target) || editable(document.activeElement)) return
      if (e.metaKey || e.ctrlKey) {
        if (e.shiftKey && e.key.toLowerCase() === 'n') {
          e.preventDefault()
          restartRef()
        }
        return
      }
      if (!playing) return
      if (/^[a-z]$/i.test(e.key)) guessRef(e.key.toUpperCase())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playing, guessRef, restartRef])

  const copyWord = async () => {
    if (!round) return
    try {
      await navigator.clipboard.writeText(round.word)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard unavailable in this context; the word is already shown on screen.
    }
  }

  const lastTen = history.slice(-10).reverse()
  const wonCount = history.filter((h) => h.result === 'won').length
  const chartData = LETTERS.split('')
    .map((l) => ({
      label: l,
      value: history.filter((h) => h.word.includes(l)).length,
    }))
    .filter((d) => d.value > 0)

  return (
    <AppShell
      name="Hangman Game"
      icon="grid"
      hue="cobalt"
      category="Personal"
      meta="Saved on this device"
      side={
        <Rail title="How to play" note="One word · six lives">
          <Body sm>
            Guess the hidden word letter by letter. Each miss adds a stroke to the
            figure; six strokes and the round is lost. Clear the word to bank a
            point. Your score, best and recent rounds survive a reload.
          </Body>
          <Stack>
            <KpiRow>
              <Kpi value={`Score: ${record.score}`} label="This session" />
              <Kpi value={`Best: ${record.best}`} label="All time" accent />
              <Kpi value={`Lives: ${lives}`} label="In the round" />
            </KpiRow>
          </Stack>
        </Rail>
      }
    >
      <Stack lg>
        <div className="hg-tabs">
          {['Play', 'Stats'].map((item) => (
            <button
              key={item}
              type="button"
              className={item === tab ? 'hg-tab active' : 'hg-tab'}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === 'Play' ? (
          <Card mono="Game" title="Round">
            {round ? (
              <Stack lg>
                <Stack style={{ alignItems: 'center', gap: 'calc(12px * var(--sf))' }}>
                  <div
                    role="group"
                    aria-label="Word"
                    style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}
                  >
                    {Array.from({ length: SLOTS }, (_, i) => (
                      <output key={i} aria-label={`Slot ${i + 1}`} style={slotStyle}>
                        {round.revealed[i] ? round.word[i] : '_'}
                      </output>
                    ))}
                  </div>
                  <HangmanFigure strokes={round.missed.length} />
                </Stack>

                <Stack>
                  <MonoLabel sm>Missed letters</MonoLabel>
                  <div style={missedStyle}>
                    {round.missed.length > 0 ? (
                      round.missed.map((ch) => (
                        <Chip key={ch}>{ch}</Chip>
                      ))
                    ) : (
                      <Body sm>No misses yet.</Body>
                    )}
                  </div>
                </Stack>

                <div
                  role="group"
                  aria-label="Letter keyboard"
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(4px * var(--sf))' }}
                >
                  {LETTERS.split('').map((ch) => (
                    <Button
                      key={ch}
                      kind="secondary"
                      ariaLabel={ch}
                      title={ch}
                      style={{ ...keyStyle, opacity: round.missed.includes(ch) ? 0.45 : undefined }}
                      onClick={() => guess(ch)}
                      disabled={!playing || round.missed.includes(ch)}
                    >
                      {''}
                    </Button>
                  ))}
                </div>

                {round.status === 'won' && (
                  <Stack style={{ alignItems: 'center', gap: 'calc(4px * var(--sf))' }}>
                    <Tag accent>You win!</Tag>
                    <Actions>
                      <Button
                        kind="secondary"
                        onClick={() => void copyWord()}
                        title="Copy the word to the clipboard"
                      >
                        {copied ? CLIPBOARD_NOTE : 'Copy word'}
                      </Button>
                      <Button kind="primary" onClick={restart}>
                        Restart
                      </Button>
                    </Actions>
                  </Stack>
                )}
                {round.status === 'lost' && (
                  <Stack style={{ alignItems: 'center', gap: 'calc(4px * var(--sf))' }}>
                    <Tag>You lose!</Tag>
                    <Body>The word was {round.word}</Body>
                    <Actions>
                      <Button kind="primary" onClick={restart}>
                        Restart
                      </Button>
                    </Actions>
                  </Stack>
                )}
              </Stack>
            ) : (
              <Stack>
                <EmptyState
                  mono="Ready"
                  title="Guess the hidden word"
                  detail="Pick letters before you run out of six lives."
                />
                <Actions>
                  <Button kind="primary" onClick={start}>
                    Start Game
                  </Button>
                </Actions>
              </Stack>
            )}
          </Card>
        ) : (
          <Card mono="History" title="Recent rounds">
            <Stack lg>
              <KpiRow>
                <Kpi value={`Score: ${record.score}`} label="This session" />
                <Kpi value={`Best: ${record.best}`} label="All time" accent />
                <Kpi value={`${wonCount}`} label="Rounds won" />
              </KpiRow>
              <Table
                label="Recent rounds"
                columns={[
                  { key: 'word', label: 'Word' },
                  { key: 'result', label: 'Result' },
                  { key: 'missed', label: 'Misses', num: true },
                ]}
                rows={lastTen.map((h) => ({
                  cells: {
                    word: <MonoLabel>{h.word}</MonoLabel>,
                    result: <Tag accent={h.result === 'won'}>{h.result}</Tag>,
                    missed: h.missed,
                  },
                }))}
                empty="Play a round to see it here."
              />
              {chartData.length > 0 && (
                <Chart
                  type="bar"
                  data={chartData}
                  title="Letters in the words you have faced"
                  ariaLabel="Letters in recent words"
                  width={560}
                  height={200}
                />
              )}
            </Stack>
          </Card>
        )}
      </Stack>
    </AppShell>
  )
}
