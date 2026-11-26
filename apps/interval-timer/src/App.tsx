import { useEffect, useRef, useState } from 'react'
import {
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  MonoLabel,
  Rail,
  Row,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { createMockValue } from '@lacuna/host-mock'
import { useCollection } from '@lacuna/use-collection'
import { exportBackup, importBackup } from '@lacuna/json-backup'
import { ExportMenu } from '@lacuna/export-menu'
import { toISODate } from '@lacuna/date-math'
import { computeStreaks } from '@lacuna/streak-calc'

const APP_ID = 'lacuna.interval-timer'
const BACKUP_VERSION = 1
const ROUND_KEY = 'lacuna.interval-timer.rounds'
const TIMER_KEY = 'lacuna.interval-timer.timer'
const TAB_ITEMS = ['Timer', 'History', 'Data']

type Phase = 'ready' | 'work' | 'rest'

interface RoundData {
  round: number
  workSec: number
  restSec: number
  date: string
}

interface TimerState {
  phase: Phase
  round: number
  running: boolean
  remainingMs: number
  workMs: number
  restMs: number
  holdTicks: number
}

function isTimerState(value: unknown): value is TimerState {
  if (typeof value !== 'object' || value === null) return false
  const t = value as Record<string, unknown>
  const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && x > 0
  if (t.phase !== 'work' && t.phase !== 'rest') return false
  if (!num(t.workMs) || !num(t.restMs) || !num(t.remainingMs)) return false
  if (!num(t.round) || (t.round as number) < 1) return false
  if (typeof t.holdTicks !== 'number' || t.holdTicks < 0) return false
  return typeof t.running === 'boolean'
}

const timerStore = createMockValue<TimerState>({
  key: TIMER_KEY,
  fallback: { phase: 'ready', round: 1, running: false, remainingMs: 0, workMs: 30000, restMs: 15000, holdTicks: 0 },
  validate: isTimerState,
})

function today(): string {
  return toISODate(new Date)
}

export function App() {
  const { state, actions } = useCollection<RoundData>({ storageKey: ROUND_KEY })
  const items = state.activeItems

  const [timer, setTimerState] = useState<TimerState>(() => timerStore.get())
  const workSecInput = String(Math.round(timer.workMs / 1000))
  const restSecInput = String(Math.round(timer.restMs / 1000))

  const [workSec, setWorkSec] = useState(workSecInput)
  const [restSec, setRestSec] = useState(restSecInput)
  const [tab, setTab] = useState<'Timer' | 'History' | 'Data'>('Timer')
  const [importMsg, setImportMsg] = useState<string | null>(null)

  const tickRef = useRef<() => void>(() => {})
  tickRef.current = () => {
    setTimerState((cur) => {
      if (!cur.running || cur.phase === 'ready') return cur
      if (cur.holdTicks > 0) {
        return { ...cur, holdTicks: cur.holdTicks - 1 }
      }
      const next = cur.remainingMs - 1000
      if (next > 1000) {
        return { ...cur, remainingMs: next }
      }
      if (next >= 500) {
        return { ...cur, remainingMs: 1000 }
      }
      if (cur.phase === 'work') {
        return { ...cur, phase: 'rest', remainingMs: cur.restMs, holdTicks: 3 }
      }
      const round = cur.round
      const workSec = Math.round(cur.workMs / 1000)
      const restSec = Math.round(cur.restMs / 1000)
      window.setTimeout(() => actions.add({ round, workSec, restSec, date: today() }), 0)
      return { ...cur, phase: 'work', round: cur.round + 1, remainingMs: cur.workMs, holdTicks: 3 }
    })
  }

  useEffect(() => {
    if (!timer.running || timer.phase === 'ready') return
    const id = window.setInterval(() => tickRef.current(), 80)
    return () => window.clearInterval(id)
  }, [timer.running, timer.phase])

  useEffect(() => {
    timerStore.set(timer)
  }, [timer])

  const commitDurations = (t: TimerState, w: number, r: number): TimerState =>
    t.phase === 'ready' ? { ...t, workMs: w, restMs: r } : t

  function start() {
    const work = Math.max(1, Math.round(Number(workSec)) || 1) * 1000
    const rest = Math.max(1, Math.round(Number(restSec)) || 1) * 1000
    setWorkSec(workSec)
    setRestSec(restSec)
    setTimerState((t) => ({
      ...t,
      workMs: work,
      restMs: rest,
      phase: 'work',
      remainingMs: work,
      running: true,
      holdTicks: 0,
    }))
  }

  function stop() {
    setTimerState((t) => ({
      ...t,
      phase: 'ready',
      round: 1,
      running: false,
      remainingMs: 0,
      workMs: Math.max(1, Math.round(Number(workSec)) || 1) * 1000,
      restMs: Math.max(1, Math.round(Number(restSec)) || 1) * 1000,
      holdTicks: 0,
    }))
  }

  const backupText = () =>
    exportBackup({
      appId: APP_ID,
      version: BACKUP_VERSION,
      filename: 'interval-timer',
      records: items.map((item) => ({
        id: item.id,
        data: item.data,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    })

  function pickImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file === undefined || file === null) return
      file
        .text()
        .then((text) => {
          try {
            const result = importBackup<RoundData>(text, {
              currentVersion: BACKUP_VERSION,
              validate: (record) =>
                typeof record.data.round === 'number' &&
                typeof record.data.workSec === 'number' &&
                typeof record.data.restSec === 'number' &&
                typeof record.data.date === 'string'
                  ? null
                  : 'not a round record',
            })
            const known = new Set(items.map((item) => item.id))
            let added = 0
            for (const record of result.records) {
              if (known.has(record.id)) continue
              actions.add(record.data)
              added += 1
            }
            setImportMsg(`Imported ${added} new ${added === 1 ? 'round' : 'rounds'}.`)
          } catch (err) {
            setImportMsg(err instanceof Error ? err.message : 'Could not read that file.')
          }
        })
        .catch(() => setImportMsg('Could not read that file.'))
    }
    input.click()
  }

  const rounds = items.map((item) => item.data)
  const streak = computeStreaks(
    [...new Set(rounds.map((r) => r.date))],
    { today: today() },
  )
  const totalWorkSec = rounds.reduce((sum, r) => sum + r.workSec, 0)
  const totalRestSec = rounds.reduce((sum, r) => sum + r.restSec, 0)

  return (
    <AppShell
      name="Interval Timer"
      icon="timesheets"
      hue="green"
      category="Productivity"
      meta={timer.phase === 'ready' ? 'Ready' : timer.running ? timer.phase : 'Paused'}
      side={
        <Rail
          title="Interval Timer"
          note="Work and rest intervals, round by round"
          chips={['Work / rest', 'History', 'Export']}
        >
          <List label="Stats">
            <Row title="Rounds" value={`${rounds.length}`} />
            <Row title="Current streak" value={`${streak.current} ${streak.current === 1 ? 'day' : 'days'}`} />
            <Row title="Longest streak" value={`${streak.longest} ${streak.longest === 1 ? 'day' : 'days'}`} />
            <Row title="Total work" value={`${totalWorkSec}s`} />
            <Row title="Total rest" value={`${totalRestSec}s`} />
          </List>
        </Rail>
      }
    >
      <Stack lg>
        <div className="lc-tabs" role="tablist">
          {TAB_ITEMS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              onClick={() => setTab(item as 'Timer' | 'History' | 'Data')}
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 'calc(12.5px * var(--tf))',
                fontWeight: 600,
                color: tab === item ? 'var(--ink)' : 'var(--ink-80)',
                padding: '0 calc(2px * var(--sf)) calc(11px * var(--sf))',
                border: 'none',
                background: 'none',
                borderBottom: `calc(2px * var(--sf)) solid ${tab === item ? 'var(--accent)' : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === 'Timer' ? (
          <div role="tabpanel" aria-label="Timer">
            <Stack>
              <Card mono="Timer" title="Intervals">
                <Stack>
                  <div style={{ textAlign: 'center' }}>
                    <MonoLabel sm>
                      {`Round ${timer.round}`}
                    </MonoLabel>
                  </div>
                  <div
                    role="timer"
                    aria-label={
                      timer.phase === 'ready' ? 'Time display' : `${timer.phase === 'work' ? 'Work' : 'Rest'} time remaining`
                    }
                    tabIndex={0}
                    style={{
                      display: 'inline-flex',
                      margin: '0 auto',
                      padding: 'calc(8px * var(--sf))',
                      borderWidth: 'calc(1px * var(--sf))',
                      borderStyle: 'solid',
                      borderColor: 'var(--hair)',
                      borderRadius: 'calc(4px * var(--sf))',
                      background: 'var(--paper-deep)',
                    }}
                  >
                    <time
                      style={{
                        color: 'var(--ink)',
                        fontFamily: 'var(--mono)',
                        fontSize: 'calc(40px * var(--tf))',
                        lineHeight: 1.1,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {fmt(timer.phase === 'ready' ? 0 : timer.remainingMs)}
                    </time>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <MonoLabel sm>
                      {timer.phase === 'ready' ? 'Ready' : timer.phase === 'work' ? 'Work' : 'Rest'}
                    </MonoLabel>
                  </div>
                  <FormGrid>
                    <TextInput
                      label="Work (sec)"
                      value={workSec}
                      onChange={(value) => {
                        setWorkSec(value)
                        setTimerState((t) => commitDurations(t, Math.max(1, Math.round(Number(value)) || 1) * 1000, t.restMs))
                      }}
                      inputMode="numeric"
                    />
                    <TextInput
                      label="Rest (sec)"
                      value={restSec}
                      onChange={(value) => {
                        setRestSec(value)
                        setTimerState((t) => commitDurations(t, t.workMs, Math.max(1, Math.round(Number(value)) || 1) * 1000))
                      }}
                      inputMode="numeric"
                    />
                  </FormGrid>
                  <Stack>
                    {timer.phase === 'ready' ? (
                      <Button kind="primary" onClick={start}>
                        Start
                      </Button>
                    ) : (
                      <>
                        {timer.running ? (
                          <Button kind="primary" onClick={() => setTimerState((t) => ({ ...t, running: false }))}>
                            Pause
                          </Button>
                        ) : (
                          <Button kind="primary" onClick={() => setTimerState((t) => ({ ...t, running: true }))}>
                            Resume
                          </Button>
                        )}
                        <Button onClick={stop}>Stop</Button>
                      </>
                    )}
                  </Stack>
                  <Body sm>
                    {timer.phase === 'ready'
                      ? `Work ${workSecInput} seconds, then rest ${restSecInput} seconds, back to back.`
                      : timer.running
                        ? `${timer.phase === 'work' ? 'Work' : 'Rest'} for ${Math.ceil(
                            timer.remainingMs / 1000,
                          )} seconds, then ${
                              timer.phase === 'work'
                                ? `rest ${Math.round(timer.restMs / 1000)} seconds`
                                : `work ${Math.round(timer.workMs / 1000)} seconds`
                            }.`
                        : `Paused at ${Math.ceil(timer.remainingMs / 1000)} seconds of ${Math.round(
                            (timer.phase === 'work' ? timer.workMs : timer.restMs) / 1000,
                          )}.`}
                  </Body>
                </Stack>
              </Card>
            </Stack>
          </div>
        ) : tab === 'History' ? (
          <div role="tabpanel" aria-label="History">
            <Stack>
              <Card
                mono={`${rounds.length} ${rounds.length === 1 ? 'round' : 'rounds'}`}
                title="History"
              >
                {rounds.length === 0 ? (
                  <EmptyState
                    mono="Empty"
                    title="No rounds yet"
                    detail="Finish a work and rest interval to log the round here."
                    actionLabel="Back to the timer"
                    onAction={() => setTab('Timer')}
                  />
                ) : (
                  <List label="Completed rounds">
                    {items.map((item) => (
                      <Row
                        key={item.id}
                        title={`Round ${item.data.round}`}
                        meta={`${item.data.date} · Work: ${item.data.workSec}s · Rest: ${item.data.restSec}s`}
                        action={
                          <Button
                            kind="ghost"
                            ariaLabel={`Delete round ${item.data.round}`}
                            onClick={() => actions.remove(item.id)}
                          >
                            Delete
                          </Button>
                        }
                      />
                    ))}
                  </List>
                )}
              </Card>
            </Stack>
          </div>
        ) : (
          <div role="tabpanel" aria-label="Data">
            <Stack>
              <Card mono="Data" title="Export & import">
                <Body sm>
                  Download your rounds as a JSON backup, or merge a previous backup. Importing adds new rounds without duplicating existing ones.
                </Body>
                <Stack>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'calc(8px * var(--sf))',
                      fontFamily: 'var(--mono)',
                      fontSize: 'calc(11px * var(--tf))',
                      color: 'var(--ink)',
                    }}
                  >
                    <span>EXPORT</span>
                    <ExportMenu
                      options={[
                        {
                          id: 'json',
                          label: 'JSON (full backup)',
                          mimeType: 'application/json',
                          extension: 'json',
                          getData: backupText,
                        },
                      ]}
                      fileName="interval-timer"
                      ariaLabel="Export"
                      disabled={rounds.length === 0}
                    />
                  </div>
                  <Button kind="ghost" onClick={pickImport}>
                    Import backup
                  </Button>
                  {importMsg !== null && <Body sm>{importMsg}</Body>}
                </Stack>
              </Card>
            </Stack>
          </div>
        )}
      </Stack>
    </AppShell>
  )
}

function fmt(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
