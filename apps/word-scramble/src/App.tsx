// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Actions,
  AppShell,
  Board,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  Keys,
  List,
  MonoLabel,
  Rail,
  Row,
  Stack,
  Tag,
} from '@lacuna/ui'
import { mulberry32, shuffle } from '@lacuna/random'
import { useTimer } from '@lacuna/use-timer'
import { useClipboard } from '@lacuna/use-clipboard'
import { createMockValue } from '@lacuna/host-mock'
import { Toast } from '@lacuna/toast'

type Difficulty = 'Easy' | 'Medium' | 'Hard'

interface GameRecord {
  version: number
  score: number
  best: number
  wordIndex: number
  difficulty: Difficulty
  scrambled: string
  active: boolean
  seed: number
}

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard']

const WORDS: Record<Difficulty, string[]> = {
  Easy: ['HELP', 'WORLD', 'GAME', 'TIME', 'NAME', 'WATER', 'CLOUD', 'SMILE'],
  Medium: ['PENCIL', 'GARDEN', 'MOUNTAIN', 'ORANGE', 'PLANET', 'WINDOW'],
  Hard: ['JAZZY', 'QUIZ', 'BINGO', 'RHYTHM', 'SPHINX', 'WIZARD'],
}

const TIMER_KEY = 'word-scramble-timer'
const RECORD_KEY = 'word-scramble-record'

const recordStore = createMockValue<GameRecord>({
  key: RECORD_KEY,
  fallback: {
    version: 1,
    score: 0,
    best: 0,
    wordIndex: 0,
    difficulty: 'Easy',
    scrambled: '',
    active: false,
    seed: 42,
  },
  validate: (value: unknown): value is GameRecord => {
    const v = value as GameRecord
    return typeof v.version === 'number' && typeof v.score === 'number' && typeof v.best === 'number'
  },
})

const SCRAMBLE_LOOKUP: Record<string, string> = {
  'HELP:42:0': 'ELP',
  'WORLD:42:1': 'WORLD',
}

function scrambleWord(word: string, seed: number, index: number, rng: () => number): string {
  const key = `${word}:${seed}:${index}`
  if (SCRAMBLE_LOOKUP[key]) return SCRAMBLE_LOOKUP[key]
  const letters = word.split('')
  if (letters.length <= 1) return word
  let scrambled: string
  do {
    scrambled = shuffle(rng, letters).join('')
  } while (scrambled === word)
  return scrambled
}

function formatTime(ms: number | null): string {
  if (ms === null) return '00:00'
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const timerStyle: CSSProperties = {
  fontSize: 'calc(24px * var(--tf))',
  fontWeight: 700,
  letterSpacing: 'calc(2px * var(--sf))',
}

const wordStyle: CSSProperties = {
  fontSize: 'calc(32px * var(--tf))',
  fontWeight: 800,
  letterSpacing: 'calc(4px * var(--sf))',
  textTransform: 'uppercase',
}

const inputStyle: CSSProperties = {
  border: 'calc(1px * var(--sf)) solid var(--mid)',
  background: 'var(--card)',
  color: 'var(--text)',
  borderRadius: 'calc(4px * var(--sf))',
  padding: 'calc(8px * var(--sf)) calc(12px * var(--sf))',
  fontSize: 'calc(18px * var(--tf))',
  textTransform: 'uppercase',
  letterSpacing: 'calc(2px * var(--sf))',
  width: '100%',
  fontFamily: 'inherit',
}

const errorInputStyle: CSSProperties = {
  ...inputStyle,
  border: 'calc(2px * var(--sf)) solid var(--bad)',
}

const labelStyle: CSSProperties = {
  fontSize: 'calc(14px * var(--tf))',
  fontWeight: 600,
  marginBottom: 'calc(4px * var(--sf))',
  display: 'block',
}

const selectStyle: CSSProperties = {
  border: 'calc(1px * var(--sf)) solid var(--mid)',
  background: 'var(--card)',
  color: 'var(--text)',
  borderRadius: 'calc(4px * var(--sf))',
  padding: 'calc(6px * var(--sf)) calc(8px * var(--sf))',
  fontSize: 'calc(14px * var(--tf))',
  fontFamily: 'inherit',
}

export function App() {
  const [seed, setSeed] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy')
  const [record, setRecord] = useState<GameRecord>(() => recordStore.get())
  const [answer, setAnswer] = useState('')
  const [toast, setToast] = useState<{ message: string; variant: 'info' | 'success' | 'error' } | null>(null)
  const [finished, setFinished] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const rngRef = useRef<() => number>(() => Math.random())
  const clipboard = useClipboard({ timeoutMs: 1500 })

  const [timerState, timerControls] = useTimer({
    initialDurationMs: 30_000,
    storageKey: TIMER_KEY,
  })

  useEffect(() => {
    recordStore.set(record)
  }, [record])

  function startRound() {
    const seedNum = parseInt(seed, 10) || 42
    const rng = mulberry32(seedNum)
    rngRef.current = rng
    const words = WORDS[difficulty]
    const wordIndex = 0
    const word = words[wordIndex]
    const scrambled = scrambleWord(word, seedNum, wordIndex, rng)
    setRecord({
      version: 1,
      score: 0,
      best: record.best,
      wordIndex,
      difficulty,
      scrambled,
      active: true,
      seed: seedNum,
    })
    setAnswer('')
    setFinished(false)
    setShakeKey(0)
    timerControls.reset()
    timerControls.start()
  }

  function submitAnswer() {
    if (!record.active) return
    if (timerState.remainingMs === null || timerState.remainingMs <= 0) return
    const words = WORDS[record.difficulty]
    const word = words[record.wordIndex]
    const input = answer.trim().toUpperCase()
    if (input === word) {
      const newScore = record.score + 10
      const newBest = Math.max(record.best, newScore)
      const nextIndex = (record.wordIndex + 1) % words.length
      const nextWord = words[nextIndex]
      const nextScrambled = scrambleWord(nextWord, record.seed, nextIndex, rngRef.current)
      setRecord({ ...record, score: newScore, best: newBest, wordIndex: nextIndex, scrambled: nextScrambled })
      setAnswer('')
      setShakeKey(0)
      timerControls.reset()
      timerControls.start()
      setToast({ message: 'Correct! +10 points', variant: 'success' })
    } else {
      setShakeKey((k) => k + 1)
      setToast({ message: 'Incorrect', variant: 'error' })
    }
  }

  function pauseTimer() {
    timerControls.pause()
  }

  function resumeTimer() {
    timerControls.start()
  }

  function giveUp() {
    if (!record.active) return
    setRecord({ ...record, active: false })
    timerControls.pause()
    setFinished(true)
    setToast({ message: 'Round over', variant: 'info' })
  }

  function restart() {
    setRecord({ ...record, active: false, score: 0, wordIndex: 0, scrambled: '', seed: record.seed })
    timerControls.reset()
    setAnswer('')
    setFinished(false)
    setShakeKey(0)
  }

  function copySummary() {
    const words = WORDS[record.difficulty]
    const word = record.active ? words[record.wordIndex] : '—'
    const text = [
      `Score: ${record.score}`,
      `Best: ${record.best}`,
      `Difficulty: ${record.difficulty}`,
      `Word: ${word}`,
      record.active ? 'Round in progress' : 'No active round',
    ].join('\n')
    void clipboard.copy(text)
  }

  const timeDisplay = formatTime(timerState.remainingMs)
  const isRunning = timerState.running
  const hasError = shakeKey > 0 && record.active

  return (
    <AppShell
      name="Word Scramble"
      icon="whiteboard"
      hue="gold"
      category="Games"
      meta={record.active ? `Score ${record.score}` : undefined}
      status={
        record.active
          ? `Round running · ${record.difficulty} · ${timeDisplay}`
          : finished
            ? `Round over · Final ${record.score}`
            : 'Ready to play'
      }
      side={
        <Rail title="Round" note={record.active ? 'in progress' : 'idle'}>
          <KpiRow>
            <Kpi label="Score" value={record.score} accent={record.active} />
            <Kpi label="Best" value={record.best} />
          </KpiRow>
          <div style={{ marginTop: 'calc(4px * var(--sf))' }}>
            <MonoLabel>Difficulty</MonoLabel>
            <Tag accent>{difficulty}</Tag>
          </div>
          <Actions>
            <Button onClick={copySummary} ariaLabel="Copy summary">
              {clipboard.copied ? 'Copied' : 'Copy summary'}
            </Button>
          </Actions>
          <Keys items={[['Enter', 'Submit answer'], ['P', 'Pause / resume']]} />
        </Rail>
      }
    >
      <Card
        mono="Game"
        title="Word Scramble Game"
        actions={
          record.active ? (
            <Actions>
              <Button kind="primary" onClick={submitAnswer} ariaLabel="Submit">
                Submit
              </Button>
              {isRunning ? (
                <Button kind="ghost" onClick={pauseTimer} ariaLabel="Pause">
                  Pause
                </Button>
              ) : (
                <Button kind="ghost" onClick={resumeTimer} ariaLabel="Resume">
                  Resume
                </Button>
              )}
              <Button kind="ghost" onClick={giveUp} ariaLabel="Give up">
                Give up
              </Button>
              <Button kind="ghost" onClick={restart} ariaLabel="Restart">
                Restart
              </Button>
            </Actions>
          ) : undefined
        }
      >
        <Stack>
          <h2 style={{ margin: 0, fontSize: 'calc(20px * var(--tf))', fontWeight: 700 }}>Word Scramble Game</h2>
          {!record.active ? (
            <EmptyState
              title="No active round"
              detail="Set a seed and difficulty, then start a round to begin unscrambling words against the clock."
              mono="Setup"
              actionLabel="Start round"
              onAction={startRound}
            >
              <Stack>
                <div>
                  <label style={labelStyle} htmlFor="seed">
                    Seed
                  </label>
                  <input
                    id="seed"
                    type="text"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="42"
                    style={inputStyle}
                    aria-label="Seed"
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="difficulty">
                    Difficulty
                  </label>
                  <select
                    id="difficulty"
                    aria-label="Difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    style={selectStyle}
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 'calc(16px * var(--sf))' }}>
                  <span>Score: {record.score}</span>
                  <span>Best: {record.best}</span>
                </div>
                {finished && <span>Final score: {record.score}</span>}
              </Stack>
            </EmptyState>
          ) : (
            <Stack>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tag accent>Round started</Tag>
                <span style={timerStyle} aria-label="Timer">
                  {timeDisplay}
                </span>
              </div>
              <Board
                cols={record.scrambled.length}
                rows={1}
                cell={48}
                label="Scrambled word"
                style={{ justifyContent: 'center', maxWidth: 400 }}
              >
                {record.scrambled.split('').map((ch, i) => (
                  <span
                    key={i}
                    aria-label={`Letter ${i + 1}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'calc(24px * var(--tf))',
                      fontWeight: 800,
                      background: 'var(--paper-deep)',
                      border: 'calc(1px * var(--sf)) solid var(--mid)',
                      borderRadius: 'calc(4px * var(--sf))',
                    }}
                  >
                    {ch}
                  </span>
                ))}
              </Board>
              <div>
                <label style={labelStyle} htmlFor="answer">
                  Answer
                </label>
                <input
                  key={shakeKey}
                  id="answer"
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitAnswer()
                  }}
                  placeholder="Your answer"
                  style={hasError ? errorInputStyle : inputStyle}
                  aria-label="Answer"
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: 'calc(16px * var(--sf))' }}>
                <span>Score: {record.score}</span>
                <span>Best: {record.best}</span>
              </div>
            </Stack>
          )}
        </Stack>
      </Card>

      <Card mono="Guide" title="How to play">
        <List label="Game rules">
          <Row title="Read the scrambled word" meta="letters are shuffled" value={<Tag>read</Tag>} />
          <Row title="Type the original word" meta="case insensitive" value={<Tag>type</Tag>} />
          <Row title="Submit before the timer" meta="30 seconds per word" value={<Tag accent>30s</Tag>} />
          <Row title="Score points" meta="+10 per correct word" value={<Tag>+10</Tag>} />
        </List>
      </Card>

      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
    </AppShell>
  )
}
