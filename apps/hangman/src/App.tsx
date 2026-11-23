import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Body, Card, Stack } from '@lacuna/ui'
import { loadRecord, saveRecord, type GameRecord } from './host'

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
  border: 'calc(1px * var(--sf)) solid var(--mid)',
  padding: 'calc(4px * var(--sf)) calc(8px * var(--sf))',
}

export function App() {
  const [record, setRecord] = useState<GameRecord>(() => loadRecord())
  const [round, setRound] = useState<Round | null>(null)

  useEffect(() => {
    saveRecord(record)
  }, [record])

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
        setRecord((current) => ({
          score: current.score + 1,
          best: Math.max(current.best, current.score + 1),
        }))
      }
      return
    }
    const missed = [...round.missed, letter]
    const lost = missed.length >= LIVES
    setRound({ ...round, missed, status: lost ? 'lost' : 'playing' })
  }

  const lives = round ? LIVES - round.missed.length : LIVES

  return (
    <main>
      <style>{`
        button[data-letter]::before { content: attr(data-letter); }
      `}</style>
      <Card mono="Game">
        <Stack>
          <h1 style={{ margin: 0 }}>Hangman Game</h1>
          <div style={{ display: 'flex', gap: 'calc(16px * var(--sf))' }}>
            <span>Score: {record.score}</span>
            <span>Best: {record.best}</span>
          </div>
          {round ? (
            <Stack>
              <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
                {Array.from({ length: SLOTS }, (_, i) => {
                  const ch = round.word[i]
                  return (
                    <output key={i} aria-label={`Slot ${i + 1}`} style={slotStyle}>
                      {ch && round.revealed[i] ? ch : '_'}
                    </output>
                  )
                })}
              </div>
              <span>Lives: {lives}</span>
              {round.missed.length > 0 && (
                <div>
                  <span>Missed:</span>
                  <span aria-label="Missed letters">
                    {' '}
                    {round.missed.join(' ')}
                  </span>
                </div>
              )}
              <div role="group" aria-label="Keyboard" style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(4px * var(--sf))' }}>
                {LETTERS.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    aria-label={ch}
                    data-letter={ch}
                    onClick={() => guess(ch)}
                    style={{
                      border: 'calc(1px * var(--sf)) solid var(--mid)',
                      background: round.missed.includes(ch) ? 'var(--bad-bg)' : 'var(--card)',
                      color: 'var(--text)',
                      borderRadius: 'calc(4px * var(--sf))',
                      padding: 'calc(4px * var(--sf)) calc(6px * var(--sf))',
                      cursor: 'pointer',
                      font: 'inherit',
                    }}
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
              <button
                type="button"
                onClick={start}
                style={{
                  border: 'calc(1px * var(--sf)) solid var(--mid)',
                  background: 'var(--card)',
                  color: 'var(--text)',
                  borderRadius: 'calc(4px * var(--sf))',
                  padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))',
                  cursor: 'pointer',
                  font: 'inherit',
                }}
              >
                Restart
              </button>
            </Stack>
          ) : (
            <Stack>
              <Body>Guess the hidden word before you run out of lives.</Body>
              <button
                type="button"
                onClick={start}
                style={{
                  border: 'calc(1px * var(--sf)) solid var(--mid)',
                  background: 'var(--card)',
                  color: 'var(--text)',
                  borderRadius: 'calc(4px * var(--sf))',
                  padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))',
                  cursor: 'pointer',
                  font: 'inherit',
                }}
              >
                Start Game
              </button>
            </Stack>
          )}
        </Stack>
      </Card>
    </main>
  )
}
