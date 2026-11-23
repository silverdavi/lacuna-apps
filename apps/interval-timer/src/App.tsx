import { useEffect, useRef, useState } from 'react'
import { AppShell, Body, Button, Card, EmptyState, FormGrid, List, MonoLabel, Row, Stack, TextInput } from '@lacuna/ui'
import { createMockValue } from '@lacuna/host-mock'

type Phase = 'ready' | 'work' | 'rest'

interface Entry {
  round: number
  workSec: number
  restSec: number
}

interface Persisted {
  phase: Exclude<Phase, 'ready'>
  round: number
  running: boolean
  remainingMs: number
  workMs: number
  restMs: number
}

function validatePersisted(v: unknown): v is Persisted {
  if (typeof v !== 'object' || v === null) return false
  const p = v as Record<string, unknown>
  if (p.phase !== 'work' && p.phase !== 'rest') return false
  const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x)
  if (!num(p.workMs) || !num(p.restMs) || !num(p.remainingMs)) return false
  const workMs = p.workMs as number
  const restMs = p.restMs as number
  const remainingMs = p.remainingMs as number
  if (workMs <= 0 || restMs <= 0 || remainingMs <= 0) return false
  if (!num(p.round) || (p.round as number) < 1) return false
  if (typeof p.running !== 'boolean') return false
  return true
}

const store = createMockValue<Persisted>({
  key: 'interval-timer',
  fallback: { phase: 'work', round: 1, running: false, remainingMs: 0, workMs: 0, restMs: 0 },
  validate: validatePersisted,
})

function load(): Persisted | null {
  const v = store.get()
  if (v.workMs <= 0 || v.restMs <= 0 || v.remainingMs <= 0) return null
  return v
}

function save(state: Persisted) {
  store.set(state)
}

function fmt(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const TICK_MS = 100
const SPEED = 10

export function App() {
  const [initial] = useState(load)
  const [workSec, setWorkSec] = useState(() => String(Math.round((initial?.workMs ?? 30000) / 1000)))
  const [restSec, setRestSec] = useState(() => String(Math.round((initial?.restMs ?? 15000) / 1000)))
  const [phase, setPhase] = useState<Phase>(initial?.phase ?? 'ready')
  const [round, setRound] = useState(initial?.round ?? 1)
  const [running, setRunning] = useState(initial?.running ?? false)
  const [remainingMs, setRemainingMs] = useState(initial?.remainingMs ?? 0)
  const [entries, setEntries] = useState<Entry[]>([])
  const [tab, setTab] = useState<'Timer' | 'History'>('Timer')
  const [flash, setFlash] = useState(false)

  const workMs = Math.max(1, Math.round(Number(workSec)) || 1) * 1000
  const restMs = Math.max(1, Math.round(Number(restSec)) || 1) * 1000
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const roundRef = useRef(round)
  roundRef.current = round
  const workRef = useRef(workMs)
  workRef.current = workMs
  const restRef = useRef(restMs)
  restRef.current = restMs
  const remainingRef = useRef(remainingMs)
  remainingRef.current = remainingMs
  // The remaining time to use when the current phase begins ticking. Set
  // explicitly on start / transition / resume so the timer never re-seeds
  // from a stale or zero value.
  const phaseRemainingRef = useRef(0)

  function start() {
    if (phase !== 'ready') return
    phaseRemainingRef.current = workMs
    setPhase('work')
    setRemainingMs(workMs)
    setRunning(true)
  }

  function resume() {
    // Continue from the current remaining; the effect will seed from it.
    setRunning(true)
  }

  // Tick the countdown while running; transition phases when time elapses.
  useEffect(() => {
    if (phase === 'ready' || !running) return
    // Seed: prefer an explicitly-set phase remaining (start/transition);
    // otherwise fall back to the live remaining (resume case).
    const startRemaining =
      phaseRemainingRef.current > 0 ? phaseRemainingRef.current : remainingRef.current
    phaseRemainingRef.current = 0
    const startReal = Date.now()
    let firstTick = true
    const id = window.setInterval(() => {
      // Hold the display at the phase's full duration for the first tick after
      // a (re)start or transition, so the new phase reads its full time.
      if (firstTick) {
        firstTick = false
        setRemainingMs(startRemaining)
        return
      }
      const elapsedVirtual = (Date.now() - startReal) * SPEED
      const remaining = startRemaining - elapsedVirtual
      if (remaining <= 0) {
        if (phaseRef.current === 'work') {
          phaseRemainingRef.current = restRef.current
          setPhase('rest')
        } else {
          phaseRemainingRef.current = workRef.current
          setPhase('work')
          setRound((r) => r + 1)
          setEntries((e) => [...e, { round: roundRef.current, workSec: workRef.current / 1000, restSec: restRef.current / 1000 }])
        }
        setFlash(true)
        setRemainingMs(0)
      } else {
        setRemainingMs(Math.ceil(remaining / 1000) * 1000)
      }
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [running, phase])

  useEffect(() => {
    if (!flash) return
    const id = window.setTimeout(() => setFlash(false), 500)
    return () => window.clearTimeout(id)
  }, [flash])

  // Persist the running timer so a reload restores it.
  useEffect(() => {
    if (phase === 'ready') {
      save({ phase: 'work', round, running: false, remainingMs: workMs, workMs, restMs })
      return
    }
    save({ phase, round, running, remainingMs, workMs, restMs })
  }, [phase, round, running, remainingMs, workMs, restMs])

  function stop() {
    setRunning(false)
    setPhase('ready')
    setRound(1)
    setRemainingMs(0)
  }

  const activeMs = phase === 'work' ? workMs : restMs
  const displayMs = phase === 'ready' ? 0 : remainingMs
  const clockLabel = phase === 'ready' ? 'Time display' : `${phase === 'work' ? 'Work' : 'Rest'} time remaining`

  return (
    <AppShell
      name="Interval Timer"
      icon="timesheets"
      hue="green"
      category="Productivity"
      meta={phase === 'ready' ? 'Ready' : running ? phase : 'Paused'}
    >
      <div role="tablist" aria-label="Views">
        {(['Timer', 'History'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'calc(12.5px * var(--tf))',
              fontWeight: 600,
              color: tab === t ? 'var(--ink)' : 'var(--ink-80)',
              padding: '0 calc(2px * var(--sf)) calc(11px * var(--sf))',
              border: 'none',
              background: 'none',
              borderBottom: `calc(2px * var(--sf)) solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Timer' ? (
        <div role="tabpanel" aria-label="Timer">
          <Stack>
            <Card mono="Timer" title="Interval Timer">
              <Stack>
                <MonoLabel sm accent={phase !== 'ready'}>{`Round ${round}`}</MonoLabel>
                <div style={{ textAlign: 'center' }}>
                  <div
                    role="timer"
                    aria-label={clockLabel}
                    tabIndex={0}
                    style={{
                      display: 'inline-flex',
                      padding: 'calc(8px * var(--sf))',
                      borderWidth: 'calc(1px * var(--sf))',
                      borderStyle: 'solid',
                      borderColor: flash ? 'var(--danger)' : 'var(--hair)',
                      borderRadius: 'calc(4px * var(--sf))',
                      background: 'var(--paper-deep)',
                    }}
                  >
                    <time
                      style={{
                        color: flash ? 'var(--danger)' : 'var(--ink)',
                        fontFamily: 'var(--mono)',
                        fontSize: 'calc(40px * var(--tf))',
                        lineHeight: 1.1,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {fmt(displayMs)}
                    </time>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <MonoLabel accent sm>{phase === 'ready' ? 'Ready' : phase === 'work' ? 'Work' : 'Rest'}</MonoLabel>
                </div>
                <FormGrid>
                  <TextInput label="Work (sec)" value={workSec} onChange={setWorkSec} inputMode="numeric" />
                  <TextInput label="Rest (sec)" value={restSec} onChange={setRestSec} inputMode="numeric" />
                </FormGrid>
                <Stack>
                  {phase === 'ready' ? (
                    <Button kind="primary" onClick={start}>Start</Button>
                  ) : (
                    <>
                      {running ? (
                        <Button kind="primary" onClick={() => setRunning(false)}>Pause</Button>
                      ) : (
                        <Button kind="primary" onClick={resume}>Resume</Button>
                      )}
                      <Button onClick={stop}>Stop</Button>
                    </>
                  )}
                </Stack>
                <Body sm>
                  {phase === 'ready'
                    ? `Work ${workSec} seconds, then rest ${restSec} seconds, back to back.`
                    : running
                      ? `${phase === 'work' ? 'Work' : 'Rest'} for ${Math.ceil(displayMs / 1000)} seconds, then ${
                          phase === 'work' ? `rest ${Math.round(restMs / 1000)} seconds` : `work ${Math.round(workMs / 1000)} seconds`
                        }.`
                      : `Paused at ${Math.ceil(displayMs / 1000)} seconds of ${Math.round(activeMs / 1000)}.`}
                </Body>
              </Stack>
            </Card>
          </Stack>
        </div>
      ) : (
        <div role="tabpanel" aria-label="History">
          <Stack>
            <Card mono={`${entries.length} ${entries.length === 1 ? 'round' : 'rounds'}`} title="History">
              {entries.length === 0 ? (
                <EmptyState
                  mono="Empty"
                  title="No rounds yet"
                  detail="Finish a work and rest interval to log the round here."
                  actionLabel="Back to the timer"
                  onAction={() => setTab('Timer')}
                />
              ) : (
                <List label="Completed rounds">
                  {entries.map((entry) => (
                    <Row
                      key={entry.round}
                      title={`Round ${entry.round}`}
                      meta={`Work: ${entry.workSec}s · Rest: ${entry.restSec}s`}
                    />
                  ))}
                </List>
              )}
            </Card>
          </Stack>
        </div>
      )}
    </AppShell>
  )
}
