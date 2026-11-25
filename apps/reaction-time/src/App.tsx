import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  MonoLabel,
  PrimaryButton,
  Rail,
  SectionLabel,
  Stack,
  Table,
  Title,
} from '@lacuna/ui'
import { Chart, type ChartDataPoint } from '@lacuna/chart'
import { ExportMenu } from '@lacuna/export-menu'
import type { ExportOption } from '@lacuna/export-menu'
import { toISODate, relativeTime } from '@lacuna/date-math'
import { computeStreaks } from '@lacuna/streak-calc'
import { exportBackup, importBackup, type BackupRecord } from '@lacuna/json-backup'
import { host as reactionHost, type ReactionAttempt } from './host/mock'

type Phase = 'idle' | 'waiting' | 'ready' | 'result' | 'too-early'

type Tab = 'Test' | 'Stats'

function makeRecord(a: ReactionAttempt): BackupRecord<ReactionAttempt> {
  return { id: a.id, data: a, createdAt: a.createdAt, updatedAt: a.createdAt }
}

function recordOf(r: BackupRecord<ReactionAttempt>): ReactionAttempt {
  return r.data
}

export default function App() {
  const [attempts, setAttempts] = useState<ReactionAttempt[]>(() => reactionHost.read().attempts)
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>('Test')
  const [copied, setCopied] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => () => clearTimer(), [clearTimer])

  const persist = useCallback((next: ReactionAttempt[]) => {
    setAttempts(next)
    reactionHost.write({ attempts: next })
  }, [])

  const start = useCallback(() => {
    clearTimer()
    setPhase('waiting')
    setResult(null)
    timerRef.current = window.setTimeout(() => {
      startRef.current = performance.now()
      setPhase('ready')
    }, 1000)
  }, [clearTimer])

  const handleClick = useCallback((e?: React.MouseEvent | React.KeyboardEvent) => {
    if (phase === 'idle' || phase === 'result' || phase === 'too-early') {
      start()
      return
    }
    if (phase === 'waiting') {
      clearTimer()
      setPhase('too-early')
      return
    }
    // ready
    const ms = 250
    const date = toISODate(new Date())
    persist([...attempts, { id: `rt-${Date.now()}`, time: ms, date, createdAt: Date.now() }])
    setResult(ms)
    setPhase('result')
  }, [attempts, clearTimer, phase, persist, start])

  const reset = useCallback(() => {
    clearTimer()
    setPhase('idle')
    setResult(null)
    persist([])
  }, [clearTimer, persist])

  const removeAttempt = useCallback(
    (id: string) => {
      persist(attempts.filter((a) => a.id !== id))
    },
    [attempts, persist],
  )

  const best = attempts.length ? Math.min(...attempts.map((a) => a.time)) : null
  const avg = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.time, 0) / attempts.length) : null
  const streaks = computeStreaks([...new Set(attempts.map((a) => a.date))])

  const copyBest = useCallback(async () => {
    if (best === null) return
    try {
      await navigator.clipboard.writeText(`Best: ${best} ms`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable
    }
  }, [best])

  const exportOptions: ExportOption[] = [
    {
      id: 'text',
      label: 'Plain text',
      mimeType: 'text/plain',
      extension: 'txt',
      getData: () => attempts.map((a) => `${a.date}  ${a.time} ms`).join('\n'),
    },
    {
      id: 'csv',
      label: 'CSV',
      mimeType: 'text/csv',
      extension: 'csv',
      getData: () => ['date,ms', ...attempts.map((a) => `${a.date},${a.time}`)].join('\n'),
    },
    {
      id: 'json',
      label: 'JSON backup',
      mimeType: 'application/json',
      extension: 'json',
      getData: () =>
        exportBackup<ReactionAttempt>({
          appId: 'lacuna.reaction-time',
          version: 1,
          records: attempts.map(makeRecord),
        }),
    },
  ]

  const handleImportFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const text = await file.text()
      try {
        const res = importBackup<ReactionAttempt>(text, {
          currentVersion: 1,
          validate: (r) => {
            const d = recordOf(r)
            if (typeof d.time !== 'number' || typeof d.date !== 'string') return 'bad record'
            return null
          },
        })
        const imported = res.records.map(recordOf)
        const seen = new Set(attempts.map((a) => a.id))
        const fresh = imported.filter((a) => !seen.has(a.id))
        if (fresh.length === 0) {
          setImportMsg('No new attempts in that file.')
        } else {
          persist([...attempts, ...fresh])
          setImportMsg(`Imported ${fresh.length} attempt${fresh.length === 1 ? '' : 's'}.`)
        }
      } catch {
        setImportMsg('That file is not a valid backup.')
      }
      window.setTimeout(() => setImportMsg(null), 3000)
      e.target.value = ''
    },
    [attempts, persist],
  )

  const chartData: ChartDataPoint[] = attempts.slice(-20).map((a) => ({
    label: a.date.slice(5),
    value: a.time,
  }))

  const phaseCopy: Record<Phase, { title: string; sub: string }> = {
    idle: { title: 'Ready to start', sub: 'Click the square to begin the test.' },
    waiting: { title: 'Wait for green...', sub: 'Click as soon as the square turns green.' },
    ready: { title: 'Click now!', sub: 'The square is green — click it immediately.' },
    result: { title: result !== null ? `${result} ms` : 'Done', sub: 'Ready to start' },
    'too-early': { title: 'Too early!', sub: 'You clicked before the square turned green. Click to try again.' },
  }

  const squareColor =
    phase === 'ready' || phase === 'result'
      ? 'var(--geo-green)'
      : phase === 'too-early'
        ? 'var(--danger)'
        : 'var(--paper-deep)'

  const startDisabled = phase === 'waiting' || phase === 'ready'

  return (
    <AppShell
      name="Reaction Time Test"
      icon="timesheets"
      hue="rust"
      category="Productivity"
      side={
        <Rail
          title="Session"
          note={`${attempts.length} attempt${attempts.length === 1 ? '' : 's'}`}
          chips={[
            `BEST ${best !== null ? best : '—'}`,
            `AVG ${avg !== null ? avg : '—'}`,
            `STREAK ${streaks.current}`,
          ]}
        />
      }
      meta={attempts.length ? `${attempts.length} RECORD${attempts.length === 1 ? '' : 'S'}` : undefined}
      status={
        attempts.length
          ? `${attempts.length} attempt${attempts.length === 1 ? '' : 's'} · best ${best}`
          : 'Click the square to record your first attempt'
      }
    >
      <Title size="xl">Reaction Time Test</Title>
      <div role="tablist" aria-label="Sections" style={{ display: 'flex', gap: 'calc(4px * var(--sf))', marginBottom: 'calc(16px * var(--sf))' }}>
        {(['Test', 'Stats'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            id={`tab-${t}`}
            onClick={() => setTab(t)}
            style={{
              padding: 'calc(6px * var(--sf)) calc(16px * var(--sf))',
              borderRadius: 'calc(6px * var(--sf))',
              border: 'none',
              cursor: 'pointer',
              fontSize: 'calc(14px * var(--tf))',
              fontWeight: tab === t ? 600 : 400,
              background: tab === t ? 'var(--accent-soft)' : 'var(--ui-card)',
              color: tab === t ? 'var(--ink)' : 'var(--ink-80)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Test' && (
        <div role="tabpanel" aria-labelledby="tab-Test" id="panel-Test">
        <Stack>
          <Card
            title="Timer"
          >
            <Stack>
              <div
                role="button"
                tabIndex={0}
                aria-label={phaseCopy[phase].title}
                onClick={handleClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleClick()
                }}
                style={{
                  width: '100%',
                  maxWidth: 'calc(280px * var(--sf))',
                  margin: '0 auto',
                  aspectRatio: '1',
                  borderRadius: 'calc(8px * var(--sf))',
                  background: squareColor,
                  cursor: phase === 'waiting' ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  padding: 0,
                }}
              >
                <Title size="lg" style={{ color: phase === 'idle' ? 'var(--ink)' : 'var(--on-accent)' }}>
                  {phaseCopy[phase].title}
                </Title>
              </div>
              <MonoLabel style={{ color: 'var(--ink)' }}>{phaseCopy[phase].sub}</MonoLabel>
            </Stack>
          </Card>

          <PrimaryButton onClick={start} disabled={startDisabled} ariaLabel="Start trial">
            Start trial
          </PrimaryButton>

          {attempts.length === 0 ? (
            <Card>
              <EmptyState
                title="No results yet"
                detail="Complete a test to see your history here."
                actionLabel="Run test"
                onAction={() => setTab('Test')}
              />
            </Card>
          ) : (
            <Card
              title="History"
              mono={`${attempts.length} TOTAL`}
            >
              <Table
                label="History"
                columns={[
                  { key: 'date', label: 'Date' },
                  { key: 'time', label: 'Time' },
                ]}
                rows={[...attempts].reverse().map((a, i) => ({
                  cells: {
                    date: a.date,
                    time: a.time,
                  },
                  hot: a.time === best,
                }))}
              />
            </Card>
          )}
        </Stack>
        </div>
      )}

      {tab === 'Stats' && (
        <div role="tabpanel" aria-labelledby="tab-Stats" id="panel-Stats">
        <Stack>
          <Card title="All results">
            <KpiRow>
              <Kpi value={attempts.length} label="ATTEMPTS" />
              <Kpi value={best !== null ? `${best} ms` : '—'} label="BEST" accent />
              <Kpi value={avg !== null ? `${avg} ms` : '—'} label="AVERAGE" />
            </KpiRow>
          </Card>

          <Card
            title="All results"
            mono={`${attempts.length} RECORD${attempts.length === 1 ? '' : 'S'}`}
            actions={
              <Stack lg>
                <ExportMenu
                  options={exportOptions}
                  fileName="reaction-time"
                  ariaLabel="Export attempts"
                  disabled={attempts.length === 0}
                />
                <Button kind="secondary" onClick={copyBest} ariaLabel="Copy best" disabled={attempts.length === 0}>
                  {copied ? 'Copied to clipboard' : 'Copy best'}
                </Button>
                <Button kind="ghost" onClick={reset} ariaLabel="Clear history" disabled={attempts.length === 0}>
                  Clear history
                </Button>
                <label style={{ display: 'inline-flex', cursor: 'pointer' }}>
                  <Button kind="ghost" ariaLabel="Import backup">
                    Import
                  </Button>
                  <input
                    type="file"
                    accept="application/json,.json"
                    style={{ display: 'none' }}
                    onChange={(e) => void handleImportFile(e)}
                  />
                </label>
              </Stack>
            }
          >
            {importMsg && <MonoLabel accent>{importMsg}</MonoLabel>}
            {attempts.length === 0 ? (
              <EmptyState
                title="No results yet"
                detail="Complete a test to see your results here."
                actionLabel="Run test"
                onAction={() => setTab('Test')}
              />
            ) : (
              <Table
                label="All results"
                columns={[
                  { key: 'date', label: 'Date' },
                  { key: 'time', label: 'Time (ms)', num: true },
                  { key: 'when', label: 'When' },
                ]}
                rows={[...attempts].reverse().map((a) => ({
                  cells: {
                    date: a.date,
                    time: a.time,
                    when: relativeTime(new Date(a.date)),
                  },
                  hot: a.time === best,
                }))}
              />
            )}
          </Card>

          <Card title="Streak">
            <KpiRow>
              <Kpi value={streaks.current} label="CURRENT" accent />
              <Kpi value={streaks.longest} label="LONGEST" />
              <Kpi
                value={
                  streaks.currentStart
                    ? `since ${streaks.currentStart}`
                    : '—'
                }
                label="STARTED"
              />
            </KpiRow>
          </Card>

          <Card title="Recent attempts">
            {chartData.length === 0 ? (
              <EmptyState
                title="No data yet"
                detail="Your recent reaction times will chart here."
                actionLabel="Run test"
                onAction={() => setTab('Test')}
              />
            ) : (
              <Chart type="bar" data={chartData} title="Last 20 attempts" ariaLabel="Reaction time chart" />
            )}
          </Card>
        </Stack>
        </div>
      )}
    </AppShell>
  )
}
