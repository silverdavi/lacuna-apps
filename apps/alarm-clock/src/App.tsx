import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AppShell,
  EmptyState,
  Rail,
  Row,
  Button,
  TextInput,
  Card,
  Stack,
  SectionLabel,
  List,
} from '@lacuna/ui'
import { exportBackup, type BackupFile } from '@lacuna/json-backup'
import { createMockRecordStore } from '@lacuna/host-mock'
import './app.css'

type Alarm = { id: string; time: string; label: string; enabled: boolean }
type Tab = 'Alarms' | 'Timer'

const PRESETS = [
  { label: '5 min', a11y: '5 min', ms: 5 * 60_000 },
  { label: '10 min', a11y: '10 min', ms: 10 * 60_000 },
  { label: '25 min', a11y: 'twenty-five min', ms: 25 * 60_000 },
  { label: '1 hr', a11y: '1 hour', ms: 60 * 60_000 },
]

function timeToMs(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!m) return null
  const min = Number(m[2])
  if (min > 59) return null
  return Number(m[1]) * 3_600_000 + min * 60_000
}

function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

function nextOccurrence(alarm: Alarm): Date | null {
  const ms = timeToMs(alarm.time)
  if (ms == null) return null
  const now = Date.now()
  const base = new Date()
  base.setMilliseconds(0)
  base.setSeconds(0)
  base.setMinutes(0)
  base.setHours(0, 0)
  let next = new Date(base.getTime() + ms)
  if (next.getTime() <= now) next = new Date(next.getTime() + 86_400_000)
  return next
}

const alarmStore = createMockRecordStore<Alarm>({
  key: 'lacuna.alarm-clock.alarms.v1',
  validate: (v: unknown): v is Alarm =>
    typeof (v as Record<string, unknown>)?.id === 'string' &&
    typeof (v as Record<string, unknown>)?.time === 'string' &&
    typeof (v as Record<string, unknown>)?.label === 'string' &&
    typeof (v as Record<string, unknown>)?.enabled === 'boolean',
})

export default function App() {
  const [tab, setTab] = useState<Tab>('Alarms')
  const [alarms, setAlarms] = useState<Alarm[]>(() => alarmStore.list())

  const [time, setTime] = useState('')
  const [label, setLabel] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const addAlarm = useCallback(() => {
    const ms = timeToMs(time)
    if (ms == null) {
      setFormError('Enter a time')
      return
    }
    setFormError(null)
    alarmStore.add({ time: time.trim(), label: label.trim(), enabled: true })
    setAlarms(alarmStore.list())
    setTime('')
    setLabel('')
  }, [time, label])

  const deleteAlarm = useCallback((alarm: Alarm) => {
    alarmStore.remove(alarm.id)
    setAlarms(alarmStore.list())
  }, [])

  const toggleAlarm = useCallback((alarm: Alarm) => {
    alarmStore.update(alarm.id, { enabled: !alarm.enabled })
    setAlarms(alarmStore.list())
  }, [])

  const enabledCount = useMemo(() => alarms.filter((a) => a.enabled).length, [alarms])

  // ---- export / import ----
  const doExport = useCallback(() => {
    const file = exportBackup<Alarm>({
      appId: 'alarm-clock',
      version: 1,
      records: alarms.map((a) => ({
        id: a.id,
        data: a,
        createdAt: 0,
        updatedAt: 0,
      })),
    })
    const blob = new Blob([JSON.parse(file)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a')
    el.href = url
    el.download = 'alarm-clock-backup.json'
    el.click()
    URL.revokeObjectURL(url)
  }, [alarms])

  const doImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return
      const text = await f.text()
      try {
        const parsed: BackupFile<Alarm> = JSON.parse(text)
        const records = parsed.records ?? []
        alarmStore.replaceAll(records.map((r) => r.data))
        setAlarms(alarmStore.list())
      } catch { /* invalid file */ }
    }
    input.click()
  }, [])

  // ---- timer ----
  const [timerMs, setTimerMs] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerPaused, setTimerPaused] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastTickRef = useRef(0)

  const stopTimer = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    if (timerMs <= 0) return
    setTimerRunning(true)
    setTimerPaused(false)
    lastTickRef.current = Date.now()
    intervalRef.current = setInterval(() => {
      const now = Date.now()
      const delta = now - lastTickRef.current
      lastTickRef.current = now
      setTimerMs((prev) => {
        const next = prev - delta
        if (next <= 0) {
          stopTimer()
          setTimerRunning(false)
          setTimerPaused(false)
          return 0
        }
        return next
      })
    }, 100)
  }, [timerMs, stopTimer])

  const pauseTimer = useCallback(() => {
    stopTimer()
    setTimerRunning(false)
    setTimerPaused(true)
  }, [stopTimer])

  const resetTimer = useCallback(() => {
    stopTimer()
    setTimerRunning(false)
    setTimerPaused(false)
    setTimerMs(0)
  }, [stopTimer])

  const applyPreset = useCallback((ms: number) => {
    stopTimer()
    setTimerRunning(false)
    setTimerPaused(false)
    setTimerMs(ms)
  }, [stopTimer])

  useEffect(() => stopTimer, [stopTimer])

  // ---- rail data ----
  const nextAlarm = useMemo(() => {
    const candidates = alarms
      .filter((a) => a.enabled)
      .map((a) => ({ alarm: a, date: nextOccurrence(a) }))
      .filter((x): x is { alarm: Alarm; date: Date } => x.date != null)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    return candidates[0] ?? null
  }, [alarms])

  const nextAlarmNote = nextAlarm
    ? `Fires in ${fmtCountdown(Math.max(0, nextAlarm.date.getTime() - Date.now()))}`
    : 'No alarms set'

  const chips = [
    `${alarms.length} alarm${alarms.length === 1 ? '' : 's'}`,
    `${enabledCount} on`,
  ]

  return (
    <AppShell
      name="Alarm Clock"
      icon="timesheets"
      hue="gold"
      category="personal"
      meta={`${alarms.length} alarms`}
      status={alarms.length > 0 ? `${enabledCount} active · ${alarms.length} total` : undefined}
      side={
        <Rail title="Alarm Clock" note={nextAlarmNote} chips={chips}>
          <List label="Status">
            <Row title="Timer" value={timerRunning ? 'running' : timerMs > 0 ? 'set' : 'idle'} />
            <Row title="Presets" meta="5 · 10 · 25 min · 1 hr" />
          </List>
        </Rail>
      }
    >
      <Card>
        <Stack lg>
          <div className="ac-tabs" role="tablist" aria-label="Alarm Clock sections">
            <button
              role="tab"
              id="tab-alarms"
              aria-selected={tab === 'Alarms'}
              aria-controls="panel-alarms"
              tabIndex={tab === 'Alarms' ? 0 : -1}
              className={tab === 'Alarms' ? 'ac-tab active' : 'ac-tab'}
              onClick={() => setTab('Alarms')}
            >
              Alarms
            </button>
            <button
              role="tab"
              id="tab-timer"
              aria-selected={tab === 'Timer'}
              aria-controls="panel-timer"
              tabIndex={tab === 'Timer' ? 0 : -1}
              className={tab === 'Timer' ? 'ac-tab active' : 'ac-tab'}
              onClick={() => setTab('Timer')}
            >
              Timer
            </button>
          </div>

          {tab === 'Alarms' ? (
            <div role="tabpanel" id="panel-alarms" aria-labelledby="tab-alarms" hidden={false}>
              <Stack>
                <Card>
                  <Stack>
                    <SectionLabel>New alarm</SectionLabel>
                    <div className="ac-form-row">
                      <TextInput
                        label="Time"
                        value={time}
                        onChange={setTime}
                        placeholder="07:30"
                        error={formError}
                      />
                      <TextInput
                        label="Label"
                        value={label}
                        onChange={setLabel}
                        placeholder="Morning"
                      />
                      <Button kind="primary" onClick={addAlarm}>
                        Add alarm
                      </Button>
                    </div>
                  </Stack>
                </Card>

                {alarms.length === 0 ? (
                  <EmptyState
                    title="No alarms yet"
                    detail="Set a time and label above to create your first alarm."
                    actionLabel="Set an alarm"
                    onAction={() => document.querySelector<HTMLInputElement>('.ac-form-row .lc-input')?.focus()}
                  />
                ) : (
                  <div>
                    <SectionLabel>Alarms</SectionLabel>
                    <List>
                      {alarms.map((alarm) => (
                        <Row
                          key={alarm.id}
                          title={alarm.label || alarm.time}
                          meta={alarm.enabled ? 'On' : 'Off'}
                          value={alarm.time}
                          hot={alarm.enabled}
                          action={
                            <div className="ac-row-actions">
                              <Button
                                kind={alarm.enabled ? 'secondary' : 'ghost'}
                                onClick={() => toggleAlarm(alarm)}
                              >
                                {alarm.enabled ? 'Disable' : 'Enable'}
                              </Button>
                              <Button
                                kind="danger"
                                ariaLabel={`Delete ${alarm.label || alarm.time}`}
                                onClick={() => deleteAlarm(alarm)}
                              >
                                Delete
                              </Button>
                            </div>
                          }
                        />
                      ))}
                    </List>

                    <div className="ac-export-row">
                      <Button kind="ghost" onClick={doExport}>
                        Export backup
                      </Button>
                      <Button kind="ghost" onClick={doImport}>
                        Import backup
                      </Button>
                    </div>
                  </div>
                )}
              </Stack>
            </div>
          ) : (
            <div role="tabpanel" id="panel-timer" aria-labelledby="tab-timer" hidden={false}>
              <Stack>
                <div className="ac-timer-display" role="timer" aria-label="Timer">
                  <time>{fmtCountdown(timerMs)}</time>
                </div>

                <div className="ac-timer-controls">
                  {timerRunning ? (
                    <Button kind="primary" onClick={pauseTimer}>
                      Pause
                    </Button>
                  ) : (
                    <Button kind="primary" onClick={startTimer} disabled={timerMs <= 0}>
                      {timerPaused ? 'Resume' : 'Start'}
                    </Button>
                  )}
                  <Button kind="secondary" onClick={resetTimer}>
                    Reset
                  </Button>
                </div>

                <div className="ac-presets">
                  <SectionLabel>Presets</SectionLabel>
                  {PRESETS.map((p) => (
                    <Button
                      key={p.label}
                      kind="ghost"
                      ariaLabel={p.a11y}
                      onClick={() => applyPreset(p.ms)}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </Stack>
            </div>
          )}
        </Stack>
      </Card>

    </AppShell>
  )
}
