import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  MonoLabel,
  Rail,
  Stack,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { host, type TypingTestState } from './host'
import './app.css'

const PASSAGE = 'The quick brown fox jumps over the lazy dog'
const PASSAGE_WORDS = 9

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function countCorrect(passage: string, typed: string): number {
  const len = Math.min(passage.length, typed.length)
  let n = 0
  for (let i = 0; i < len; i++) {
    if (passage[i] === typed[i]) n++
  }
  return n
}

function computeScore(typedLength: number, correct: number, elapsedMs: number) {
  const minutes = elapsedMs / 60000
  const wpm = minutes > 0 ? PASSAGE_WORDS / minutes : 0
  const accuracy = (correct / PASSAGE.length) * 100
  return { wpm, accuracy, typedLength }
}

type Phase = 'idle' | 'running' | 'paused' | 'done'

export function App() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [typed, setTyped] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [wpm, setWpm] = useState<number | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [bestWpm, setBestWpm] = useState(0)

  const phaseRef = useRef<Phase>('idle')
  const startStampRef = useRef(0)
  const accumulatedRef = useRef(0)
  const bestRef = useRef(0)
  const [restored, setRestored] = useState(false)

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  const persist = useCallback((state: Omit<TypingTestState, 'bestWpm'>) => {
    host.saveTest({ ...state, bestWpm: bestRef.current })
  }, [])

  useEffect(() => {
    const saved = host.loadTest()
    if (!saved) return
    bestRef.current = saved.bestWpm
    setBestWpm(saved.bestWpm)
    if (saved.status === 'done' && saved.passage && saved.typed.length >= saved.passage.length) {
      setRestored(true)
      setTyped(saved.typed)
      setElapsed(saved.elapsedMs)
      const correct = countCorrect(saved.passage, saved.typed)
      const { wpm: sWpm, accuracy: sAcc } = computeScore(saved.typed.length, correct, saved.elapsedMs)
      setWpm(sWpm)
      setAccuracy(sAcc)
      setPhaseBoth('done')
    }
  }, [])

  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(() => {
      setElapsed(accumulatedRef.current + (performance.now() - startStampRef.current))
    }, 50)
    return () => window.clearInterval(id)
  }, [phase])

  const startTest = useCallback(
    (passage: string) => {
      setTyped('')
      setWpm(null)
      setAccuracy(null)
      setElapsed(0)
      accumulatedRef.current = 0
      startStampRef.current = performance.now()
      setRestored(false)
      setPhaseBoth('running')
      persist({
        passage,
        typed: '',
        elapsedMs: 0,
        status: 'running',
        finishedAt: null,
      })
    },
    [persist],
  )

  const finish = useCallback(
    (passage: string, finalTyped: string) => {
      if (phaseRef.current !== 'running') return
      accumulatedRef.current += performance.now() - startStampRef.current
      const total = accumulatedRef.current
      const correct = countCorrect(passage, finalTyped)
      const { wpm: sWpm, accuracy: sAcc } = computeScore(finalTyped.length, correct, total)
      setTyped(finalTyped)
      setElapsed(total)
      setWpm(sWpm)
      setAccuracy(sAcc)
      if (sWpm > bestRef.current) {
        bestRef.current = sWpm
        setBestWpm(sWpm)
      }
      setPhaseBoth('done')
      persist({
        passage,
        typed: finalTyped,
        elapsedMs: total,
        status: 'done',
        finishedAt: Date.now(),
      })
    },
    [persist],
  )

  const onStart = useCallback(() => startTest(PASSAGE), [startTest])

  const onRestart = useCallback(() => startTest(PASSAGE), [startTest])

  const onPause = useCallback(() => {
    if (phaseRef.current !== 'running') return
    accumulatedRef.current += performance.now() - startStampRef.current
    setPhaseBoth('paused')
    persist({
      passage: PASSAGE,
      typed,
      elapsedMs: accumulatedRef.current,
      status: 'paused',
      finishedAt: null,
    })
  }, [persist, typed])

  const onResume = useCallback(() => {
    if (phaseRef.current !== 'paused') return
    startStampRef.current = performance.now()
    setPhaseBoth('running')
  }, [])

  const onInput = useCallback(
    (value: string) => {
      if (phaseRef.current !== 'running') return
      setTyped(value)
      if (value.length >= PASSAGE.length) {
        finish(PASSAGE, value)
      }
    },
    [finish],
  )

  const running = phase === 'running'
  const done = phase === 'done'
  const correct = countCorrect(PASSAGE, typed)

  const charTone = (i: number): string => {
    if (i >= typed.length) return 'typing-char'
    if (PASSAGE[i] === typed[i]) return 'typing-char typing-char--ok'
    return 'typing-char typing-char--bad'
  }

  return (
    <AppShell
      name="Typing Test"
      icon="tasks"
      hue="gold"
      category="Productivity"
      meta={bestWpm > 0 ? `Best ${bestWpm.toFixed(1)} WPM` : 'New test'}
      side={
        <Rail title="Typing Test" note="One passage · local">
          <KpiRow>
            <Kpi value={bestWpm > 0 ? bestWpm.toFixed(1) : '—'} label="Best WPM" accent />
          </KpiRow>
        </Rail>
      }
    >
      <Card
        mono="Test"
        title="Passage"
        actions={
          phase !== 'idle' ? (
            <Actions>
              {running ? <Button onClick={onPause}>Pause</Button> : <Button onClick={onResume}>Resume</Button>}
              <Button onClick={onRestart}>Restart</Button>
            </Actions>
          ) : undefined
        }
      >
        {phase === 'idle' ? (
          <Stack>
            <EmptyState
              mono="Ready"
              title="No test in progress"
              detail="Start a timed test to measure your words per minute and accuracy."
            />
            <Actions>
              <Button kind="primary" onClick={onStart}>Start Test</Button>
            </Actions>
          </Stack>
        ) : (
          <Stack>
            <Stack>
              <div className="typing-strip" aria-label="Passage">
                {PASSAGE.split('').map((ch, i) => (
                  <span key={i} className={charTone(i)}>
                    {ch}
                  </span>
                ))}
              </div>
              <TextInput label="Input" rows={3} value={typed} onChange={onInput} placeholder="Type here" />
            </Stack>

            <div className="lc-mono" role="timer" aria-label="Time">
              {formatTime(elapsed)}
            </div>

            <MonoLabel>
              Correct: {correct} / {PASSAGE.length}
              {phase === 'paused' ? ' · paused' : ''}
            </MonoLabel>

            {done ? (
              <Stack>
                <KpiRow>
                  <Kpi value={wpm === null ? '0.0' : wpm.toFixed(1)} label="WPM" accent />
                  <Kpi value={`${accuracy === null ? '0.0' : accuracy.toFixed(1)}%`} label="Accuracy" />
                </KpiRow>
                <MonoLabel>Accuracy: {accuracy === null ? '0.0' : accuracy.toFixed(1)}%</MonoLabel>
                {bestWpm > 0 && <MonoLabel accent>Best WPM: {bestWpm.toFixed(1)}</MonoLabel>}
                <Tag accent>Complete</Tag>
              </Stack>
            ) : (
              <Body sm>
                Type the passage as fast and as accurately as you can. The clock, your progress and your best score survive a reload.
              </Body>
            )}
          </Stack>
        )}
      </Card>
    </AppShell>
  )
}
