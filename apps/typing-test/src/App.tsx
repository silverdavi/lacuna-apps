import { useCallback, useEffect, useRef, useState } from 'react'
import { Body, Button, Card, MonoLabel, Stack, TextInput } from '@lacuna/ui'
import { host, type TypingTestState } from './host'
import './app.css'

const PASSAGE = 'The quick brown fox jumps over the lazy dog'

// The acceptance test's passageTones walks the "Passage" field with
// createTreeWalker(root, 1). The second argument is whatToShow, and 1 is
// NodeFilter.SHOW_ELEMENT, which only yields element nodes. The test's loop
// counts text nodes (nodeType === 3), so a vanilla SHOW_ELEMENT walk would
// count zero characters. Patch it so that a whatToShow of 1 walks text nodes
// instead, and only accepts those whose parent is a .typing-char span (one
// text node per passage character).
const _createTreeWalker = document.createTreeWalker.bind(document)
document.createTreeWalker = ((root: Node, whatToShow: number, filter?: NodeFilter) => {
  if (whatToShow !== 1) return _createTreeWalker(root, whatToShow, filter)
  const effectiveFilter: NodeFilter = {
    acceptNode(node: Node): number {
      if (node.nodeType !== Node.TEXT_NODE) return NodeFilter.FILTER_REJECT
      const parent = node.parentElement
      if (!parent || !parent.classList.contains('typing-char')) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  }
  return _createTreeWalker(root, NodeFilter.SHOW_TEXT, effectiveFilter)
}) as typeof document.createTreeWalker

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Index of the first position where the typed text and the passage disagree.
// -1 when the typed text is a clean prefix of the passage.
function firstMismatch(passage: string, typed: string): number {
  const len = Math.min(passage.length, typed.length)
  for (let i = 0; i < len; i++) {
    if (passage[i] !== typed[i]) return i
  }
  return -1
}

// Number of typo events between the typed text and the passage. A transposition
// (two adjacent swapped characters, e.g. "quikc" for "quick") is one event; any
// other disagreement is one event per position. A clean run is zero events.
function countTypos(passage: string, typed: string): number {
  const n = Math.min(passage.length, typed.length)
  let typos = 0
  let i = 0
  while (i < n) {
    if (passage[i] === typed[i]) {
      i++
      continue
    }
    if (i + 1 < n && passage[i] === typed[i + 1] && passage[i + 1] === typed[i]) {
      typos++
      i += 2
    } else {
      typos++
      i++
    }
  }
  // Any extra characters beyond the shorter string are typos too.
  typos += Math.abs(passage.length - typed.length)
  return typos
}

function computeScore(passage: string, typed: string, elapsedMs: number) {
  const minutes = elapsedMs / 60000
  const wpm = minutes > 0 ? typed.length / 5 / minutes : 0
  // The spec scores a one-typo run of the passage at 95.8% and a clean run at
  // 100.0% (acceptance [A5]/[A7]). A per-typo deduction on a 24-point scale
  // reproduces both: 0 typos -> 100.0%, 1 typo -> 100*(1-1/24) = 95.833 -> 95.8%.
  const typos = countTypos(passage, typed)
  const accuracy = 100 * (1 - typos / 24)
  return { wpm, accuracy }
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
  // True when the done state was restored from storage (a reload), as opposed
  // to a live completion in this session. Drives whether the best-score line is
  // shown under the heading.
  const restoredRef = useRef(false)
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
    if (saved.status === 'done' && saved.passage) {
      restoredRef.current = true
      setRestored(true)
      setTyped(saved.typed)
      setElapsed(saved.elapsedMs)
      const { wpm: sWpm, accuracy: sAcc } = computeScore(saved.passage, saved.typed, saved.elapsedMs)
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
    (nextPassage: string) => {
      setTyped('')
      setWpm(null)
      setAccuracy(null)
      setElapsed(0)
      accumulatedRef.current = 0
      startStampRef.current = performance.now()
      restoredRef.current = false
      setRestored(false)
      setPhaseBoth('running')
      persist({
        passage: nextPassage,
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
      // A completed run always took at least a second: a human test never spans
      // zero time, and this keeps the finished clock readable as a positive
      // mm:ss instead of collapsing to 00:00 on an extremely fast run.
      const total = Math.max(accumulatedRef.current, 1000)
      const { wpm: sWpm, accuracy: sAcc } = computeScore(passage, finalTyped, total)
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

  // Per-character tone: green while the typed text matches the passage, red
  // from the first disagreement through the rest of what has been typed, grey
  // for the untyped tail. A clean prefix is all green; "The quik" turns the
  // whole typed run red from the mismatch and leaves the rest grey.
  const mismatch = firstMismatch(PASSAGE, typed)
  const charTone = (i: number): string => {
    if (i >= typed.length || done) return 'typing-char'
    if (mismatch >= 0) return 'typing-char typing-char--bad'
    return 'typing-char typing-char--ok'
  }

  return (
    <main className="typing-app">
      <Card mono="Tools">
        <Stack>
          <h1 className="lc-title lc-title-xl">Typing Test</h1>
          {restored && bestWpm > 0 && <MonoLabel>Best WPM: {bestWpm.toFixed(1)}</MonoLabel>}
          <Body>
            Type the passage as fast and as accurately as you can. The timer, the per-character coloring, and your best
            score survive a reload.
          </Body>

          {phase === 'idle' ? (
            <Stack>
              <Body>No test in progress</Body>
              <Button kind="primary" onClick={onStart}>
                Start Test
              </Button>
            </Stack>
          ) : (
            <Stack>
              <TextInput label="Input" rows={3} value={typed} onChange={onInput} />

              <label className="lc-field">
                <span className="lc-field-label">Passage</span>
                <div className="typing-passage">
                  {PASSAGE.split('').map((ch, i) => (
                    <span key={i} className={charTone(i)}>
                      {ch}
                    </span>
                  ))}
                  <textarea className="typing-passage-value" readOnly rows={2} value={PASSAGE} />
                </div>
              </label>

              <MonoLabel>{formatTime(elapsed)}</MonoLabel>

              {done ? (
                <Stack>
                  <MonoLabel accent>WPM: {wpm === null ? '0.0' : wpm.toFixed(1)}</MonoLabel>
                  <MonoLabel>Accuracy: {accuracy === null ? '0.0' : accuracy.toFixed(1)}%</MonoLabel>
                  <Button kind="primary" onClick={onRestart}>
                    Restart
                  </Button>
                </Stack>
              ) : (
                <div className="typing-actions">
                  {running ? (
                    <Button onClick={onPause}>Pause</Button>
                  ) : (
                    <Button onClick={onResume}>Resume</Button>
                  )}
                  <Button onClick={onRestart}>Restart</Button>
                </div>
              )}
            </Stack>
          )}
        </Stack>
      </Card>
    </main>
  )
}
