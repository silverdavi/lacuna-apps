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
  List,
  MonoLabel,
  Rail,
  Row,
  Select,
  Stack,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { useCollection } from '@lacuna/use-collection'
import { useLocalRecord } from '@lacuna/use-local-record'
import { host, type TypingTestState } from './host'
import './app.css'

const PASSES = [
  { id: 'standard', label: 'Standard · 43 chars', passage: 'The quick brown fox jumps over the lazy dog', words: 9 },
  { id: 'short', label: 'Short · 19 chars', passage: 'The quick brown fox', words: 4 },
  { id: 'long', label: 'Long · 68 chars', passage: 'The quick brown fox jumps over the lazy dog by the slow moving river', words: 14 },
] as const

type PassId = (typeof PASSES)[number]['id']

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

function computeScore(passage: string, typedLength: number, correct: number, elapsedMs: number) {
  const words = Math.max(1, passage.split(' ').length)
  const minutes = elapsedMs / 60000
  const wpm = minutes > 0 ? words / minutes : 0
  const accuracy = (correct / passage.length) * 100
  return { wpm, accuracy }
}

type Phase = 'idle' | 'running' | 'paused' | 'done'

interface Settings {
  passId: PassId
}

export function App() {
  const { value: settings, set: setSettings } = useLocalRecord<Settings>({
    key: 'lacuna.typing-test.settings',
    version: 1,
    defaultValue: { passId: 'standard' },
  })

  const [passId, setPassId] = useState<PassId>(settings.passId)
  const [phase, setPhase] = useState<Phase>('idle')
  const [typed, setTyped] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [wpm, setWpm] = useState<number | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [bestWpm, setBestWpm] = useState(0)

  const passage = PASSES.find((p) => p.id === passId)?.passage ?? PASSES[0].passage
  const passageWords = PASSES.find((p) => p.id === passId)?.words ?? PASSES[0].words

  const phaseRef = useRef<Phase>('idle')
  const startStampRef = useRef(0)
  const accumulatedRef = useRef(0)
  const bestRef = useRef(0)
  const [restored, setRestored] = useState(false)

  const { state: history, actions: historyActions } = useCollection<{ wpm: number; accuracy: number; chars: number; durationMs: number }>({
    storageKey: 'lacuna.typing-test.attempts',
  })

  const { copied, copy: copyResult } = useClipboard({ timeoutMs: 2000 })

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  const persist = useCallback(
    (state: Omit<TypingTestState, 'bestWpm'>) => {
      host.saveTest({ ...state, bestWpm: bestRef.current })
    },
    [],
  )

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
      const { wpm: sWpm, accuracy: sAcc } = computeScore(saved.passage, saved.typed.length, correct, saved.elapsedMs)
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
    (p: string, words: number) => {
      setTyped('')
      setWpm(null)
      setAccuracy(null)
      setElapsed(0)
      accumulatedRef.current = 0
      startStampRef.current = performance.now()
      setRestored(false)
      setPhaseBoth('running')
      persist({
        passage: p,
        typed: '',
        elapsedMs: 0,
        status: 'running',
        finishedAt: null,
      })
    },
    [persist],
  )

  const finish = useCallback(
    (p: string, words: number, finalTyped: string) => {
      if (phaseRef.current !== 'running') return
      accumulatedRef.current += performance.now() - startStampRef.current
      const total = accumulatedRef.current
      const correct = countCorrect(p, finalTyped)
      const { wpm: sWpm, accuracy: sAcc } = computeScore(p, finalTyped.length, correct, total)
      setTyped(finalTyped)
      setElapsed(total)
      setWpm(sWpm)
      setAccuracy(sAcc)
      if (sWpm > bestRef.current) {
        bestRef.current = sWpm
        setBestWpm(sWpm)
      }
      historyActions.add({ wpm: sWpm, accuracy: sAcc, chars: p.length, durationMs: total })
      setPhaseBoth('done')
      persist({
        passage: p,
        typed: finalTyped,
        elapsedMs: total,
        status: 'done',
        finishedAt: Date.now(),
      })
    },
    [historyActions, persist],
  )

  const onStart = useCallback(() => startTest(passage, passageWords), [startTest, passage, passageWords])

  const onRestart = useCallback(() => startTest(passage, passageWords), [startTest, passage, passageWords])

  const onPause = useCallback(() => {
    if (phaseRef.current !== 'running') return
    accumulatedRef.current += performance.now() - startStampRef.current
    setPhaseBoth('paused')
    persist({
      passage,
      typed,
      elapsedMs: accumulatedRef.current,
      status: 'paused',
      finishedAt: null,
    })
  }, [persist, typed, passage])

  const onResume = useCallback(() => {
    if (phaseRef.current !== 'paused') return
    startStampRef.current = performance.now()
    setPhaseBoth('running')
  }, [])

  const onInput = useCallback(
    (value: string) => {
      if (phaseRef.current !== 'running') return
      setTyped(value)
      if (value.length >= passage.length) {
        finish(passage, passageWords, value)
      }
    },
    [finish, passage, passageWords],
  )

  const onCopyResult = useCallback(async () => {
    if (wpm === null || accuracy === null) return
    await copyResult(`Typing Test · ${passageWords} words in ${formatTime(elapsed)} · WPM ${wpm.toFixed(1)} · Accuracy ${accuracy.toFixed(1)}%`)
  }, [copyResult, wpm, accuracy, elapsed, passageWords])

  const onPassChange = useCallback(
    (value: string) => {
      const next = value as PassId
      setPassId(next)
      setSettings((prev: Settings) => ({ ...prev, passId: next }))
      if (phaseRef.current !== 'idle') {
        startTest(PASSES.find((p) => p.id === next)?.passage ?? PASSES[0].passage, PASSES.find((p) => p.id === next)?.words ?? PASSES[0].words)
      }
    },
    [setSettings, startTest],
  )

  const running = phase === 'running'
  const paused = phase === 'paused'
  const done = phase === 'done'
  const correct = countCorrect(passage, typed)
  const attempts = history.activeItems

  const charTone = (i: number): string => {
    if (i >= typed.length) return 'typing-char'
    if (passage[i] === typed[i]) return 'typing-char typing-char--ok'
    return 'typing-char typing-char--bad'
  }

  return (
    <AppShell
      name="Typing Test"
      icon="tasks"
      hue="gold"
      category="Productivity"
      meta={bestWpm > 0 ? `Best ${bestWpm.toFixed(1)} WPM` : 'New test'}
      status={
        running
          ? `Running · ${formatTime(elapsed)}`
          : paused
            ? 'Paused'
            : done
              ? `Done · ${wpm?.toFixed(1) ?? '0.0'} WPM`
              : 'Ready'
      }
      side={
        <Rail
          title="Typing Test"
          note={`${attempts.length} attempts · local`}
          chips={[`${passage.length} chars`, `${passageWords} words`, 'Offline']}
        >
          <KpiRow>
            <Kpi value={done ? (wpm ?? 0).toFixed(1) : '—'} label="WPM" accent={done} />
            <Kpi value={done ? `${(accuracy ?? 0).toFixed(1)}%` : '—'} label="Accuracy" />
            <Kpi value={bestWpm > 0 ? bestWpm.toFixed(1) : '—'} label="Best WPM" />
          </KpiRow>
          {done && (
            <Actions>
              <Button onClick={onCopyResult} ariaLabel="Copy the result to the clipboard">
                {copied ? 'Copied' : 'Copy to clipboard'}
              </Button>
            </Actions>
          )}
        </Rail>
      }
    >
      <Card mono="Settings" title="Passage">
        <Select
          label="Length"
          value={passId}
          onChange={onPassChange}
          options={PASSES.map((p) => ({ value: p.id, label: p.label }))}
        />
        {phase === 'idle' && (
          <Body sm>
            Pick a passage, then start the test. Your speed and accuracy are scored against the clock.
          </Body>
        )}
      </Card>

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
              <Button kind="primary" onClick={onStart}>
                Start Test
              </Button>
            </Actions>
          </Stack>
        ) : (
          <Stack>
            <Stack>
              <div className="typing-strip" aria-label="Passage">
                {passage.split('').map((ch, i) => (
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
              Correct: {correct} / {passage.length}
              {paused ? ' · paused' : ''}
            </MonoLabel>

            {done ? (
              <Stack>
                <KpiRow>
                  <Kpi value={(wpm ?? 0).toFixed(1)} label="WPM" accent />
                  <Kpi value={`${(accuracy ?? 0).toFixed(1)}%`} label="Accuracy" />
                </KpiRow>
                <MonoLabel>WPM: {wpm === null ? '0.0' : wpm.toFixed(1)}</MonoLabel>
                <MonoLabel>Accuracy: {accuracy === null ? '0.0' : accuracy.toFixed(1)}%</MonoLabel>
                {restored && bestWpm > 0 && <MonoLabel accent>Best WPM: {bestWpm.toFixed(1)}</MonoLabel>}
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

      <Card mono={`${attempts.length} attempts`} title="Attempts">
        {attempts.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No attempts yet"
            detail="Finish a test and each score lands here."
          />
        ) : (
          <List label="Attempts">
            {attempts
              .slice()
              .reverse()
              .map((a, idx) => (
                <Row
                  key={a.id}
                  title={`WPM ${a.data.wpm.toFixed(1)}`}
                  meta={`${a.data.accuracy.toFixed(1)}% · ${a.data.chars} chars · ${formatTime(a.data.durationMs)}`}
                  hot={idx === 0 && done}
                  action={
                    <Button
                      kind="ghost"
                      ariaLabel={`Remove attempt ${a.data.wpm.toFixed(1)}`}
                      onClick={() => historyActions.remove(a.id)}
                    >
                      Remove
                    </Button>
                  }
                />
              ))}
          </List>
        )}
      </Card>
    </AppShell>
  )
}
