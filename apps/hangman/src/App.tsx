import { useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  Rail,
  Stack,
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
  border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
  borderRadius: 'calc(2px * var(--sf))',
  padding: 'calc(4px * var(--sf)) calc(8px * var(--sf))',
  fontFamily: 'var(--mono)',
  fontSize: 'calc(13px * var(--tf))',
  color: 'var(--ink)',
}

const lineStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'calc(8px * var(--sf))',
}

const boardStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'calc(4px * var(--sf))',
}

export function App() {
  const { value: record, set: setRecord } = useLocalRecord<GameRecord>({
    key: 'lacuna.hangman.record',
    version: 1,
    defaultValue: { score: 0, best: 0 },
  })
  const [round, setRound] = useState<Round | null>(null)

  function start() {
    setRound(freshRound())
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

  const lives = round ? LIVES - round.missed.length : LIVES

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
          title="Hangman Game"
          note="One word · six lives · local"
          chips={['Guess', 'Restart', 'Works offline']}
        />
      }
    >
      <Stack lg>
        <Card mono="Score" title="Standing">
          <KpiRow>
            <Kpi value={`Score: ${record.score}`} label="This round" />
            <Kpi value={`Best: ${record.best}`} label="All time" accent />
          </KpiRow>
        </Card>

        <Card mono="Game" title="Round">
          {round ? (
            <Stack lg>
              <div role="group" aria-label="Word" style={lineStyle}>
                {Array.from({ length: SLOTS }, (_, i) => {
                  const ch = round.word[i]
                  return (
                    <output key={i} aria-label={`Slot ${i + 1}`} style={slotStyle}>
                      {ch && round.revealed[i] ? ch : '_'}
                    </output>
                  )
                })}
              </div>
              <Stack>
                <span>Lives: {lives}</span>
                {round.missed.length > 0 && (
                  <div>
                    <span>Missed:</span>{' '}
                    <span aria-label="Missed letters" style={{ color: 'var(--danger)' }}>
                      {round.missed.join(' ')}
                    </span>
                  </div>
                )}
              </Stack>
              <div role="group" aria-label="Keyboard" style={boardStyle}>
                {LETTERS.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    aria-label={ch}
                    className="lc-btn secondary"
                    data-letter={ch}
                    onClick={() => guess(ch)}
                    style={
                      round.missed.includes(ch)
                        ? { opacity: 0.5, background: 'var(--paper-deep)' }
                        : undefined
                    }
                  />
                ))}
              </div>
              {round.status === 'won' && <Body>You win!</Body>}
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
