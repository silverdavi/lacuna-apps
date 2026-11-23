import { useEffect, useState } from 'react'
import { AppShell, Button, Card, EmptyState, FormGrid, TextInput } from '@lacuna/ui'
import { useCollection, type CollectionItem } from '@lacuna/use-collection'
import { useTimer } from '@lacuna/use-timer'
import { BigClock } from '@lacuna/big-clock'
import { toParts } from '@lacuna/format-duration'

const TABS = ['Alarms', 'Timer'] as const
type Tab = (typeof TABS)[number]

interface Alarm {
  time: string
  label: string
  enabled: boolean
}

const STORAGE_KEY = 'lacuna.alarm-clock.alarms.v1'
const PRESETS = ['5 min', '10 min', '20 min', '30 min', '40 min', '60 min'] as const

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function fmtCountdown(ms: number): string {
  const { hours, minutes, seconds } = toParts(Math.max(0, ms))
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

function timeToMs(time: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!m) return 0
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return 0
  return h * 3600000 + min * 60000
}

export function App() {
  const [tab, setTab] = useState<Tab>('Alarms')
  const [time, setTime] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const collection = useCollection<Alarm>({ storageKey: STORAGE_KEY })
  const [timerState, timerControls] = useTimer({ storageKey: 'lacuna.alarm-clock.timer.v1' })
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  function addAlarm() {
    if (timeToMs(time) === 0) {
      setError('Enter a time')
      return
    }
    setError(null)
    collection.actions.add({ time: time.trim(), label: label.trim() || 'Alarm', enabled: true })
    setLabel('')
  }

  function removeAlarm(id: string) {
    collection.actions.remove(id)
  }

  function toggleAlarm(id: string, enabled: boolean) {
    collection.actions.update(id, { enabled })
  }

  function applyPreset(preset: string) {
    const minutes = Number(preset.split(' ')[0])
    timerControls.setDuration(minutes * 60000)
    setSelectedPreset(preset)
  }

  const remaining =
    selectedPreset !== null
      ? timerState.elapsedMs > 0
        ? timerState.remainingMs ?? 0
        : (timerState.remainingMs ?? 0)
      : 0
  const finished = remaining === 0 && timerState.elapsedMs > 0
  const alarms = collection.state.items

  return (
    <AppShell name="Alarm Clock" icon="timesheets" hue="gold" category="Personal">
      <div className="lc-tabs" role="tablist" aria-label="Alarm Clock views">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className="ac-tab"
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
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={tab}>
        {tab === 'Alarms' ? (
          <>
            <Card mono="New" title="Set an alarm">
              <FormGrid>
                <TextInput label="Time" value={time} onChange={setTime} placeholder="07:00" error={error} />
                <TextInput label="Label" value={label} onChange={setLabel} placeholder="Wake up" />
              </FormGrid>
              <Button kind="primary" onClick={addAlarm}>
                Add alarm
              </Button>
            </Card>

            {alarms.length === 0 ? (
              <EmptyState
                title="No alarms yet"
                detail="Set a time and label above to add your first alarm."
                actionLabel="Add alarm"
              />
            ) : (
              <ul className="lk-list" aria-label="Alarms">
                {alarms.map((a: CollectionItem<Alarm>) => (
                  <li key={a.id} className="lk-row" aria-label={a.data.label}>
                    <span className="lk-row-text">
                      <span className="lk-row-title">{a.data.time}</span>
                      <span className="lk-row-meta">{a.data.label}</span>
                    </span>
                    <span className="lk-row-actions">
                      <input
                        type="checkbox"
                        id={`alarm-enabled-${a.id}`}
                        checked={a.data.enabled}
                        onChange={(e) => toggleAlarm(a.id, e.target.checked)}
                        aria-label={`Enable ${a.data.label}`}
                      />
                      <label htmlFor={`alarm-enabled-${a.id}`} className="lc-faint">
                        On
                      </label>
                      <Button
                        kind="ghost"
                        ariaLabel={`Delete ${a.data.label}`}
                        onClick={() => removeAlarm(a.id)}
                      >
                        Delete
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <Card title="Countdown timer">
            <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap' }}>
              {PRESETS.map((p) => (
                <Button key={p} kind="secondary" onClick={() => applyPreset(p)}>
                  {p}
                </Button>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'calc(16px * var(--sf))',
                padding: 'calc(12px * var(--sf))',
              }}
            >
              <div
                role="timer"
                aria-label="Countdown timer"
                className="ac-clock"
                style={{
                  display: 'inline-flex',
                  padding: 'calc(8px * var(--sf))',
                  borderWidth: 'calc(1px * var(--sf))',
                  borderStyle: 'solid',
                  borderColor: finished ? 'var(--danger)' : 'var(--hair)',
                  borderRadius: 'calc(4px * var(--sf))',
                  background: 'var(--paper-deep)',
                }}
              >
                <time
                  style={{
                    color: finished ? 'var(--danger)' : 'var(--ink)',
                    fontFamily: 'var(--mono)',
                    fontSize: 'calc(40px * var(--tf))',
                    lineHeight: 1.1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {fmtCountdown(remaining)}
                </time>
              </div>
              <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
                {timerState.running ? (
                  <Button kind="primary" onClick={timerControls.pause}>
                    Pause
                  </Button>
                ) : timerState.elapsedMs > 0 ? (
                  <Button kind="primary" onClick={timerControls.start}>
                    Resume
                  </Button>
                ) : (
                  <Button kind="primary" onClick={timerControls.start}>
                    Start
                  </Button>
                )}
                <Button
                  kind="secondary"
                  onClick={() => {
                    timerControls.reset()
                    setSelectedPreset(null)
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
