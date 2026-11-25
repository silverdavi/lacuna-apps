// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useRef, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  Divider,
  EmptyState,
  Kpi,
  KpiRow,
  MonoLabel,
  PrimaryButton,
  Rail,
  SectionLabel,
  Stack,
  Table,
} from '@lacuna/ui'
import { ExportMenu } from '@lacuna/export-menu'
import { ProgressRing } from '@lacuna/progress-ring'
import { Chart } from '@lacuna/chart'
import { createMockValue } from '@lacuna/host-mock'

type PatternKey = 'box' | '478' | 'coherent' | '4210'
type PhaseName = 'Inhale' | 'Hold' | 'Exhale'

interface Phase {
  name: PhaseName
  seconds: number
}

interface PatternDef {
  key: PatternKey
  label: string
  use: string
  phases: Phase[]
}

const PATTERNS: Record<PatternKey, PatternDef> = {
  box: {
    key: 'box',
    label: 'Box Breathing',
    use: 'Steady, equal counts. Used under pressure: before a call, at a fork in the road, before sleep.',
    phases: [
      { name: 'Inhale', seconds: 4 },
      { name: 'Hold', seconds: 4 },
      { name: 'Exhale', seconds: 4 },
      { name: 'Hold', seconds: 4 },
    ],
  },
  '478': {
    key: '478',
    label: '4-7-8 Breathing',
    use: 'The long exhale slows the heart. The standard wind-down before bed.',
    phases: [
      { name: 'Inhale', seconds: 4 },
      { name: 'Hold', seconds: 7 },
      { name: 'Exhale', seconds: 8 },
    ],
  },
  coherent: {
    key: 'coherent',
    label: 'Coherent 5-5',
    use: 'Five in, five out, no holds. Five to ten minutes settles the breathing into rhythm.',
    phases: [
      { name: 'Inhale', seconds: 5 },
      { name: 'Exhale', seconds: 5 },
    ],
  },
  '4210': {
    key: '4210',
    label: 'Physiological Sigh',
    use: 'Two quick inhales, one long exhale. The fastest single-cycle reset when the mind is racing.',
    phases: [
      { name: 'Inhale', seconds: 4 },
      { name: 'Hold', seconds: 2 },
      { name: 'Exhale', seconds: 10 },
    ],
  },
}

const PATTERN_KEYS = Object.keys(PATTERNS) as PatternKey[]

interface LogEntry {
  id: string
  date: string
  pattern: PatternKey
  cycles: number
}

interface Settings {
  inhale: number
  hold: number
  exhale: number
  target: number
}

interface Persisted {
  pattern: PatternKey | null
  cycles: number
  settings: Settings
  log: LogEntry[]
}

const KEY = 'lacuna.breathing-exercise.session'
const DEFAULT_SETTINGS: Settings = { inhale: 4, hold: 4, exhale: 4, target: 10 }

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.round(v)))
}

function isSettings(value: unknown): value is Settings {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  const fields = ['inhale', 'hold', 'exhale', 'target'] as const
  return fields.every((f) => typeof v[f] === 'number' && Number.isFinite(v[f] as number))
}

function isLogEntry(value: unknown): value is LogEntry {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.date === 'string' &&
    PATTERN_KEYS.includes(v.pattern as PatternKey) &&
    typeof v.cycles === 'number' &&
    Number.isFinite(v.cycles)
  )
}

function isPersisted(value: unknown): value is Persisted {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  const pattern = v.pattern
  if (pattern !== null && !PATTERN_KEYS.includes(pattern as PatternKey)) return false
  if (typeof v.cycles !== 'number' || !Number.isFinite(v.cycles)) return false
  if (v.settings !== null && !isSettings(v.settings)) return false
  if (v.log !== undefined && (!Array.isArray(v.log) || !v.log.every(isLogEntry))) return false
  return true
}

function today(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}



const session = createMockValue<Persisted>({
  key: KEY,
  fallback: { pattern: null, cycles: 0, settings: DEFAULT_SETTINGS, log: [] },
  validate: isPersisted,
})

export function App() {
  const [persisted, setPersisted] = useState<Persisted>(() => {
    const p = session.get()
    return p.settings ? p : { ...p, settings: DEFAULT_SETTINGS }
  })
  const [selected, setSelected] = useState<PatternKey | null>(persisted.pattern)
  const [cycles, setCycles] = useState<number>(persisted.cycles)
  const [settings, setSettings] = useState<Settings>(persisted.settings ?? DEFAULT_SETTINGS)
  const [log, setLog] = useState<LogEntry[]>(persisted.log ?? [])

  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const elapsedMsRef = useRef(0)
  const updateElapsed = (ms: number) => {
    elapsedMsRef.current = ms
    setElapsedMs(ms)
  }

  const patternDef = selected ? PATTERNS[selected] : null
  const activePhases: Phase[] = selected ? PATTERNS[selected].phases : []

  const cycleLengthMs = activePhases.reduce((sum, p) => sum + p.seconds * 1000, 0)
  const cycleMs = cycleLengthMs > 0 ? elapsedMs % cycleLengthMs : 0

  let phase: Phase | null = null
  let countdown = 0
  if (started) {
    let remaining = cycleMs
    let idx = 0
    for (; idx < activePhases.length; idx++) {
      if (remaining < activePhases[idx].seconds * 1000) break
      remaining -= activePhases[idx].seconds * 1000
    }
    phase = activePhases[idx] ?? activePhases[activePhases.length - 1] ?? null
    countdown = phase ? Math.ceil((phase.seconds * 1000 - remaining) / 1000) : 0
  }

  const progressPct = started && cycleLengthMs > 0 ? Math.floor((cycleMs / cycleLengthMs) * 100) : 0

  const commit = (patch: Partial<Persisted>) => {
    const next: Persisted = { ...persisted, ...patch, settings, log: patch.log ?? log }
    setPersisted(next)
    session.set(next)
  }

  const selectPattern = (key: PatternKey) => {
    if (selected === key) return
    setRunning(false)
    setStarted(false)
    updateElapsed(0)
    setSelected(key)
    commit({ pattern: key })
  }

  const start = () => {
    if (!selected) return
    updateElapsed(0)
    startRef.current = 0
    cycleCountRef.current = 0
    setStarted(true)
    setRunning(true)
    commit({ pattern: selected })
  }

  const reset = () => {
    setRunning(false)
    setStarted(false)
    updateElapsed(0)
    setCycles(0)
    commit({ pattern: selected, cycles: 0 })
  }

  const startRef = useRef(0)
  const cycleCountRef = useRef(0)
  const targetRef = useRef(DEFAULT_SETTINGS.target)
  const logRef = useRef<LogEntry[]>([])
  const selectedRef = useRef<PatternKey | null>(null)
  const phasesRef = useRef<Phase[]>([])

  const onCycleComplete = (done: number) => {
    setCycles(done)
    session.set({ ...persisted, settings, log, pattern: selected, cycles: done })
    if (selectedRef.current && done === targetRef.current) {
      setRunning(false)
      setStarted(false)
      updateElapsed(0)
      const sel = selectedRef.current
      const entry: LogEntry = {
        id: `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
        date: today(),
        pattern: sel,
        cycles: done,
      }
      const nextLog = [...logRef.current, entry]
      logRef.current = nextLog
      setLog(nextLog)
      setPersisted((p) => {
        const n: Persisted = { ...p, log: nextLog }
        session.set(n)
        return n
      })
    }
  }

  useEffect(() => {
    if (running && startRef.current === 0) {
      startRef.current = performance.now()
    }
    targetRef.current = settings.target
    logRef.current = log
    selectedRef.current = selected
    phasesRef.current = activePhases
    if (!running) return
    const id = window.setInterval(() => {
      const now = performance.now()
      const total = elapsedMsRef.current + (now - startRef.current)
      const phases = phasesRef.current
      if (phases.length === 0) return
      const cycleMs = phases.reduce((sum, p) => sum + p.seconds * 1000, 0)
      const cyclesDone = Math.floor(total / cycleMs)
      if (cyclesDone > cycleCountRef.current) {
        for (let c = cycleCountRef.current + 1; c <= cyclesDone; c++) {
          onCycleComplete(c)
        }
        cycleCountRef.current = cyclesDone
      }
      updateElapsed(total)
    }, 100)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  const clearHistory = () => {
    setLog([])
    commit({ log: [] })
  }

  const logCount = log.length
  const cyclesToday = log.filter((e) => e.date === today()).reduce((s, e) => s + e.cycles, 0)

  const chartData = log.slice(-8).map((e) => ({ label: fmtDate(e.date), value: e.cycles }))

  const csvData =
    'date,pattern,cycles\n' + log.map((e) => `${e.date},${PATTERNS[e.pattern].label},${e.cycles}`).join('\n')

  const jsonBackup = () =>
    JSON.stringify(
      {
        version: 1,
        appId: 'lacuna.breathing-exercise',
        exportedAt: new Date().toISOString(),
        records: log.map((e) => ({
          id: e.id,
          data: { date: e.date, pattern: e.pattern, cycles: e.cycles },
          createdAt: Date.parse(e.date),
          updatedAt: Date.parse(e.date),
        })),
      },
      null,
      2,
    )

  let phaseProgressPct = 0
  if (started && phase) {
    const offset = activePhases.slice(0, activePhases.indexOf(phase)).reduce((s, p) => s + p.seconds * 1000, 0)
    const intoPhase = cycleMs - offset
    phaseProgressPct = Math.round((intoPhase / (phase.seconds * 1000)) * 100)
  }

  const phaseWord = started ? (phase?.name ?? 'Ready') : 'Ready'
  const statusText = running
    ? `${phaseWord} ${countdown} · ${patternDef?.label ?? ''} · cycle ${cycles + 1} of ${settings.target}`
    : started
      ? `Paused at ${phaseWord} ${countdown} · ${cycles} of ${settings.target} cycles done`
      : `Ready · target ${settings.target} cycles`

  const breathTone =
    phase?.name === 'Inhale' ? 'var(--accent)' : phase?.name === 'Exhale' ? 'var(--ink-80)' : 'var(--ink-40)'

  return (
    <AppShell
      name="Breathing Exercise"
      icon="tasks"
      hue="teal"
      category="personal"
      meta={logCount > 0 ? `${logCount} sessions` : undefined}
      status={statusText}
      side={
         <Rail
           title="Pattern"
           note={patternDef ? patternDef.use : 'Pick one to start breathing'}
          chips={
            [
              `${settings.inhale}s in`,
              `${settings.hold}s hold`,
              `${settings.exhale}s out`,
              `target ${settings.target}`,
              `${logCount} logged`,
            ].slice(0, 5)
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'calc(8px * var(--sf))', marginBottom: 'calc(8px * var(--sf))' }}>
            {PATTERN_KEYS.map((k) => (
              <Button
                key={k}
                ariaLabel={PATTERNS[k].label}
                onClick={() => selectPattern(k)}
                style={{
                  justifyContent: 'center',
                  color: selected === k ? 'var(--ink)' : undefined,
                  borderColor: selected === k ? 'var(--ink-80)' : undefined,
                  fontWeight: selected === k ? 600 : undefined,
                }}
              >
                {PATTERNS[k].label}
              </Button>
            ))}
          </div>
          <SectionLabel>Tune the breath</SectionLabel>
          <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
            <MonoLabel sm>In {settings.inhale}s</MonoLabel>
            <MonoLabel sm>Hold {settings.hold}s</MonoLabel>
            <MonoLabel sm>Out {settings.exhale}s</MonoLabel>
          </div>
          <Divider />
          <SectionLabel>Session target</SectionLabel>
          <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
            <Button
              ariaLabel="Fewer target cycles"
              onClick={() => {
                const t = clamp(settings.target - 1, 1, 30)
                setSettings({ ...settings, target: t })
                commit({ settings: { ...settings, target: t } })
              }}
            >
              −
            </Button>
            <MonoLabel sm>{settings.target} cycles</MonoLabel>
            <Button
              ariaLabel="More target cycles"
              onClick={() => {
                const t = clamp(settings.target + 1, 1, 30)
                setSettings({ ...settings, target: t })
                commit({ settings: { ...settings, target: t } })
              }}
            >
              +
            </Button>
          </div>
          <Divider />
          <SectionLabel>Phase lengths</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--sf))' }}>
            {(
              [
                ['Inhale', 'inhale'],
                ['Hold', 'hold'],
                ['Exhale', 'exhale'],
              ] as const
            ).map(([label, field]) => (
              <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
                <span style={{ width: 'calc(56px * var(--tf))' }}>
                  <MonoLabel sm>{label}</MonoLabel>
                </span>
                <Button
                  ariaLabel={`${label} shorter`}
                  onClick={() => {
                    const v = clamp(settings[field] - 1, 1, 15)
                    setSettings({ ...settings, [field]: v })
                    commit({ settings: { ...settings, [field]: v } })
                  }}
                >
                  −
                </Button>
                <MonoLabel sm>{settings[field]}s</MonoLabel>
                <Button
                  ariaLabel={`${label} longer`}
                  onClick={() => {
                    const v = clamp(settings[field] + 1, 1, 15)
                    setSettings({ ...settings, [field]: v })
                    commit({ settings: { ...settings, [field]: v } })
                  }}
                >
                  +
                </Button>
              </div>
            ))}
          </div>
        </Rail>
      }
    >
      <Card mono="Session" title="Breathing Exercise">
        {patternDef ? (
          <Stack>
            <div
              id="big-clock"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'calc(8px * var(--sf))',
              }}
            >
              <MonoLabel sm>{phaseWord}</MonoLabel>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)', fontSize: 'calc(48px * var(--tf))', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                {countdown}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'calc(8px * var(--sf))',
                width: '100%',
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 'calc(48px * var(--sf))',
                  height: 'calc(4px * var(--sf))',
                  background: 'var(--hair)',
                  overflow: 'hidden',
                  borderRadius: 'calc(2px * var(--sf))',
                }}
              >
                <div
                  style={{
                    width: `${phaseProgressPct}%`,
                    height: '100%',
                    background: breathTone,
                    transition: 'width 120ms linear, background 120ms ease',
                  }}
                />
              </div>
              <div id="progress-ring">
                <ProgressRing value={progressPct} max={100} label="Cycle progress" size={14} strokeWidth={3}>
                  {progressPct}%
                </ProgressRing>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'calc(8px * var(--sf))' }}>
                <MonoLabel sm>{`Cycles: ${cycles}`}</MonoLabel>
                <MonoLabel sm>{`target ${settings.target}`}</MonoLabel>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {running ? (
                <PrimaryButton onClick={() => setRunning(false)}>Pause</PrimaryButton>
              ) : (
                <PrimaryButton onClick={started ? () => setRunning(true) : start}>
                  {started ? 'Resume' : 'Start'}
                </PrimaryButton>
              )}
              <Button onClick={reset} style={{ marginLeft: 'calc(8px * var(--sf))' }}>
                Reset
              </Button>
            </div>
          </Stack>
        ) : (
          <EmptyState
            title="No pattern selected"
            detail="Pick a pattern from the panel on the right to start a paced breathing session."
            mono="4 patterns · target cycles · session log"
            actionLabel="Select a pattern to begin"
          />
        )}
      </Card>

      <KpiRow>
        <Kpi value={cycles} label="cycles this session" />
        <Kpi value={cyclesToday} label="cycles today" />
        <Kpi value={logCount} label="sessions logged" accent={logCount > 0} />
      </KpiRow>

      <Card mono="Log" title="Session history">
        {log.length > 0 ? (
          <Stack>
            <Table
              label="Session history"
              columns={[
                { key: 'date', label: 'Date' },
                { key: 'pattern', label: 'Pattern' },
                { key: 'cycles', label: 'Cycles', num: true },
              ]}
              rows={log
                .slice()
                .reverse()
                .map((e) => ({
                  cells: {
                    date: fmtDate(e.date),
                    pattern: PATTERNS[e.pattern].label,
                    cycles: e.cycles,
                  },
                }))}
            />
            <Chart type="bar" data={chartData} title="Recent sessions" ariaLabel="Cycles per session, last eight" width={320} height={160} />
            <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
              <ExportMenu
                fileName="breathing-sessions"
                ariaLabel="Export history"
                options={[
                  {
                    id: 'csv',
                    label: 'CSV',
                    mimeType: 'text/csv',
                    extension: 'csv',
                    getData: () => csvData,
                  },
                  {
                    id: 'json',
                    label: 'JSON backup',
                    mimeType: 'application/json',
                    extension: 'json',
                    getData: () => jsonBackup(),
                  },
                ]}
              />
              <Button onClick={clearHistory}>Clear history</Button>
            </div>
          </Stack>
        ) : (
          <EmptyState
            title="No sessions yet"
            detail="Finish a target number of cycles and the session is logged here with the pattern, date, and cycle count."
            mono="history · csv · json"
            actionLabel={selected ? 'Begin a session when ready' : 'Pick a pattern from the panel'}
            onAction={() => {
              if (selected) {
                start()
              }
            }}
          />
        )}
      </Card>
    </AppShell>
  )
}
