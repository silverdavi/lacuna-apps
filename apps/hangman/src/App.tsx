import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
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
  TextInput,
} from '@lacuna/ui'
import { useLocalRecord } from '@lacuna/use-local-record'

interface GameRecord {
  score: number
  best: number
}

const WORD = 'CAT'
const SLOTS = 6
const LIVES = 6
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

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
  minWidth: 'calc(20px * var(--sf))',
  border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
  borderRadius: 'calc(2px * var(--sf))',
  padding: 'calc(3px * var(--sf)) calc(6px * var(--sf))',
  fontFamily: 'var(--mono)',
  fontSize: 'calc(13px * var(--tf))',
  color: 'var(--ink)',
  textAlign: 'center',
}

const missedStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'calc(4px * var(--sf))',
}

const guessFormStyle: CSSProperties = {
  display: 'flex',
  gap: 'calc(8px * var(--sf))',
  alignItems: 'flex-end',
}

const inputWrapStyle: CSSProperties = {
  width: 'calc(72px * var(--sf))',
}

const keyStyle: CSSProperties = {
  width: 'calc(28px * var(--sf))',
  height: 'calc(28px * var(--sf))',
  fontSize: 'calc(12px * var(--tf))',
  padding: 0,
}

function HangmanFigure({ strokes }: { strokes: number }) {
  const on = (n: number): CSSProperties =>
    n <= strokes
      ? { stroke: 'var(--ink)', opacity: 1 }
      : { stroke: 'var(--ui-line2)', opacity: 0.35 }
  return (
    <svg
      viewBox="0 0 120 160"
      width={120}
      height={160}
      fill="none"
      strokeLinecap="round"
      aria-hidden
    >
      <g strokeWidth="3" style={on(1)}>
        <line x1="8" y1="154" x2="66" y2="154" />
        <line x1="20" y1="154" x2="20" y2="10" />
        <line x1="20" y1="12" x2="68" y2="12" />
        <line x1="68" y1="12" x2="68" y2="28" />
      </g>
      <g strokeWidth="3" style={on(2)}>
        <circle cx="68" cy="40" r="12" />
      </g>
      <line x1="68" y1="52" x2="68" y2="98" strokeWidth="3" style={on(3)} />
      <line x1="68" y1="62" x2="44" y2="80" strokeWidth="3" style={on(4)} />
      <line x1="68" y1="62" x2="92" y2="80" strokeWidth="3" style={on(5)} />
      <line x1="68" y1="98" x2="48" y2="132" strokeWidth="3" style={on(6)} />
    </svg>
  )
}

export function App() {
  const { value: record, set: setRecord } = useLocalRecord<GameRecord>({
    key: 'lacuna.hangman.record',
    version: 1,
    defaultValue: { score: 0, best: 0 },
  })
  const [round, setRound] = useState<Round | null>(null)
  const [guessText, setGuessText] = useState('')
  const [guessError, setGuessError] = useState<string | null>(null)

  function start() {
    setRound(freshRound())
    setGuessText('')
    setGuessError(null)
  }

  function guess(letter: string) {
    if (!round || round.status !== 'playing') return
    if (round.missed.includes(letter)) return
    if (round.word.includes(letter)) {
      const revealed = round.revealed.map((on, i) => on || round.word[i] === letter)
      const won = round.word.split('').every((ch, i) => revealed[i])
      setRound({ ...round, revealed, status: won ? 'won' : 'playing' })
      if (won) {
        setRecord((current) => {
          const score = current.score + 1
          return { score, best: Math.max(current.best, score) }
        })
      }
      return
    }
    const missed = [...round.missed, letter]
    const lost = missed.length >= LIVES
    setRound({ ...round, missed, status: lost ? 'lost' : 'playing' })
  }

  function submitGuess(event: FormEvent) {
    event.preventDefault()
    const letter = guessText.trim().toUpperCase()
    if (!/^[A-Z]$/.test(letter)) {
      setGuessError('One letter, A to Z')
      return
    }
    if (round?.missed.includes(letter)) {
      setGuessError('Already tried')
      return
    }
    setGuessError(null)
    setGuessText('')
    guess(letter)
  }

  const lives = round ? LIVES - round.missed.length : LIVES
  const playing = round?.status === 'playing'

  return (
    <AppShell
      name="Hangman Game"
      icon="whiteboard"
      hue="cobalt"
      category="Personal"
      meta={`Best ${record.best}`}
      status="Saved on this device"
      side={
        <Rail
          title="How to play"
          note="One word · six lives"
          chips={['Type a letter', 'Watch the figure']}
        >
          <Body sm>
            Guess the hidden word letter by letter. Each miss adds a stroke to the
            figure; six strokes and the round is lost. Clear the word to bank a
            point. Your score and best survive a reload.
          </Body>
        </Rail>
      }
    >
      <Stack lg>
        <Card mono="Score" title="Standing">
          <KpiRow>
            <Kpi value={`Score: ${record.score}`} label="This round" />
            <Kpi value={`Best: ${record.best}`} label="All time" accent />
            <Kpi value={`Lives: ${lives}`} label="In play" />
          </KpiRow>
        </Card>

        <Card mono="Game" title="Round">
          {round ? (
            <Stack lg>
              <Stack style={{ alignItems: 'center', gap: 'calc(12px * var(--sf))' }}>
                <div role="group" aria-label="Word" style={{ display: 'flex', gap: 'calc(6px * var(--sf))' }}>
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
                {round.missed.length > 0 ? (
                  <div style={missedStyle}>
                    {round.missed.map((ch) => (
                      <Chip key={ch}>{ch}</Chip>
                    ))}
                  </div>
                ) : (
                  <Body sm>No misses yet.</Body>
                )}
              </Stack>

              <form onSubmit={submitGuess} style={guessFormStyle}>
                <div style={inputWrapStyle}>
                  <TextInput
                    label="Guess a letter"
                    value={guessText}
                    onChange={(v) => setGuessText(v.slice(0, 1))}
                    placeholder="A–Z"
                    error={guessError}
                  />
                </div>
                <Button kind="primary" type="submit" disabled={!playing}>
                  Guess
                </Button>
              </form>

              <div role="group" aria-label="Keyboard" style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(4px * var(--sf))' }}>
                {LETTERS.map((ch) => (
                  <Button
                    key={ch}
                    kind="secondary"
                    ariaLabel={ch}
                    title={ch}
                    style={{
                      ...keyStyle,
                      opacity: round.missed.includes(ch) ? 0.45 : undefined,
                    }}
                    onClick={() => guess(ch)}
                    disabled={!playing}
                  >
                    {''}
                  </Button>
                ))}
              </div>

              {round.status === 'won' && (
                <Body>
                  You win! <MonoLabel sm>Word: {round.word}</MonoLabel>
                </Body>
              )}
              {round.status === 'lost' && (
                <Stack>
                  <Body>You lose!</Body>
                  <Body>The word was {round.word}</Body>
                </Stack>
              )}

              <Actions>
                <Button kind="primary" onClick={start}>
                  Restart
                </Button>
              </Actions>
            </Stack>
          ) : (
            <Stack>
              <EmptyState
                mono="Ready"
                title="Guess the hidden word"
                detail="Pick a letter before you run out of six lives."
              />
              <Actions>
                <Button kind="primary" onClick={start}>
                  Start Game
                </Button>
              </Actions>
            </Stack>
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
