import { useEffect, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  MonoLabel,
  Rail,
  Stack,
  Table,
} from '@lacuna/ui'
import { host } from './host/mock'
import type { TuningEntry } from './host'

const STRINGS: { value: string; hz: number }[] = [
  { value: 'E2', hz: 82.41 },
  { value: 'A2', hz: 110.0 },
  { value: 'D3', hz: 146.83 },
  { value: 'G3', hz: 196.0 },
  { value: 'B3', hz: 246.94 },
  { value: 'E4', hz: 329.63 },
  { value: 'A4', hz: 440.0 },
]

const STRING_NAMES = STRINGS.map((s) => s.value)
const TARGETS: Record<string, number> = Object.fromEntries(STRINGS.map((s) => [s.value, s.hz]))

type TabId = 'Tuner' | 'History'

function formatCents(cents: number): string {
  return `${cents >= 0 ? '+' : ''}${cents.toFixed(1)}`
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function TunerTabs({
  items,
  active,
  onSelect,
}: {
  items: string[]
  active: string
  onSelect: (value: string) => void
}) {
  return (
    <div className="lc-tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={item === active}
          className={item === active ? 'lc-tab active tuner-tab' : 'lc-tab tuner-tab'}
          onClick={() => onSelect(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

function LabeledSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  const id = 'tuner-string-select'
  return (
    <div className="lc-field">
      <label className="lc-field-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="lc-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

function LabeledValue({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  const id = `tuner-kpi-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div>
      <button
        id={id}
        type="button"
        tabIndex={-1}
        aria-hidden="false"
        className={accent ? 'lc-kpi-value accent' : 'lc-kpi-value'}
        style={{
          border: 'none',
          background: 'none',
          padding: 0,
          cursor: 'default',
          textAlign: 'left',
          display: 'block',
          width: '100%',
        }}
      >
        {value}
      </button>
      <label htmlFor={id} className="lc-kpi-label">
        {label}
      </label>
    </div>
  )
}

export function App() {
  const [state, setState] = useState(() => host.read())
  const [tab, setTab] = useState<TabId>('Tuner')
  const [string, setString] = useState('E2')
  const [status, setStatus] = useState('Ready')
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [detectedHz, setDetectedHz] = useState<number | null>(null)
  const [centOffset, setCentOffset] = useState<number | null>(null)

  const timerRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)
  const targetRef = useRef<number>(82.41)
  const stringRef = useRef<string>('E2')

  const entries = state.entries
  const targetHz = TARGETS[string] ?? 440

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
    }
  }, [])

  function handleStringChange(value: string) {
    setString(value)
    const hz = TARGETS[value] ?? 440
    setStatus(`Selected ${value} at ${hz.toFixed(2)} Hz`)
  }

  function playReference() {
    const hz = TARGETS[string] ?? 440
    setStatus(`Playing ${string} at ${hz.toFixed(2)} Hz`)
  }

  function startRecording() {
    setRecording(true)
    setElapsed(0)
    startRef.current = Date.now()
    timerRef.current = window.setInterval(() => {
      setElapsed(Date.now() - startRef.current)
    }, 100)
  }

  function stopRecording() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    setRecording(false)

    const target = targetRef.current
    const detected = target + (Math.random() * 4 - 2)
    const detectedRounded = Math.round(detected * 100) / 100
    const cents = 1200 * Math.log2(detectedRounded / target)
    const centsRounded = Math.round(cents * 10) / 10

    setDetectedHz(detectedRounded)
    setCentOffset(centsRounded)
  }

  function saveToLog() {
    if (detectedHz === null || centOffset === null) return
    const entry = host.addEntry({
      date: todayISO(),
      string: string,
      targetHz: TARGETS[string] ?? 440,
      detectedHz,
      centOffset,
    })
    setState(entry)
  }

  function deleteEntry(id: string) {
    const next = host.deleteEntry(id)
    setState(next)
  }

  const tuningLogRows = entries.map((e) => ({
    cells: {
      date: e.date,
      string: e.string,
      targetHz: e.targetHz.toFixed(2),
      detectedHz: e.detectedHz.toFixed(2),
      cents: formatCents(e.centOffset),
      action: (
        <Button kind="ghost" ariaLabel={`Delete ${e.string} ${e.date}`} onClick={() => deleteEntry(e.id)}>
          Delete
        </Button>
      ),
    },
  }))

  const historyRows = entries.map((e) => ({
    cells: {
      date: e.date,
      string: e.string,
      targetHz: e.targetHz.toFixed(2),
      detectedHz: e.detectedHz.toFixed(2),
      cents: formatCents(e.centOffset),
    },
  }))

  const tabBody =
    tab === 'Tuner' ? (
      <Stack lg>
        <Card mono="Tune" title="Guitar Tuner">
          <Body sm>Select a string, play a reference, record a sample, and log the reading.</Body>
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            <LabeledSelect
              label="String"
              value={string}
              onChange={handleStringChange}
              options={STRING_NAMES}
            />
          </div>
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            <MonoLabel>STATUS</MonoLabel>
            <div
              role="status"
              style={{
                marginTop: 'calc(6px * var(--sf))',
                fontFamily: 'var(--mono)',
                fontSize: 'calc(13px * var(--tf))',
                color: 'var(--ink)',
              }}
            >
              {status}
            </div>
          </div>
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            <Actions>
              <Button kind="primary" onClick={playReference}>
                Play reference
              </Button>
              {recording ? (
                <Button kind="secondary" onClick={stopRecording}>
                  Stop recording
                </Button>
              ) : (
                <Button kind="secondary" onClick={startRecording}>
                  Record sample
                </Button>
              )}
              <Button kind="secondary" onClick={saveToLog} disabled={detectedHz === null}>
                Save to log
              </Button>
            </Actions>
          </div>
          {recording && (
            <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
              <MonoLabel sm>RECORDING</MonoLabel>
              <div
                style={{
                  marginTop: 'calc(4px * var(--sf))',
                  fontFamily: 'var(--mono)',
                  fontSize: 'calc(15px * var(--tf))',
                  color: 'var(--ink)',
                }}
              >
                {formatElapsed(elapsed)}
              </div>
            </div>
          )}
          <div
            className="lc-kpirow"
            style={{ marginTop: 'calc(16px * var(--sf))' }}
          >
            <LabeledValue
              value={detectedHz !== null ? detectedHz.toFixed(2) : '—'}
              label="Detected frequency"
              accent={detectedHz !== null}
            />
            <LabeledValue
              value={centOffset !== null ? formatCents(centOffset) : '—'}
              label="Cent offset"
            />
          </div>
        </Card>

        <Card
          mono={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
          title="Tuning log"
        >
          {entries.length === 0 ? (
            <EmptyState mono="Empty" title="No entries yet" detail="Save a reading to start the log." actionLabel="Save to log" />
          ) : (
            <Table
              label="Tuning log"
              columns={[
                { key: 'date', label: 'Date' },
                { key: 'string', label: 'String' },
                { key: 'targetHz', label: 'Target Hz', num: true },
                { key: 'detectedHz', label: 'Detected Hz', num: true },
                { key: 'cents', label: 'Cents', num: true },
                { key: 'action', label: '' },
              ]}
              rows={tuningLogRows}
              empty="No entries yet"
            />
          )}
        </Card>
      </Stack>
    ) : (
      <Card mono={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`} title="Session history">
        <Table
          label="Session history"
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'string', label: 'String' },
            { key: 'targetHz', label: 'Target Hz', num: true },
            { key: 'detectedHz', label: 'Detected Hz', num: true },
            { key: 'cents', label: 'Cents', num: true },
          ]}
          rows={historyRows}
          empty="No entries yet"
        />
      </Card>
    )

  return (
    <AppShell
      name="Guitar Tuner"
      icon="analytics"
      hue="teal"
      category="Productivity"
      meta={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
      status="Saved on this device"
      side={
        <Rail
          title="Guitar Tuner"
          note="Strings · reference tones · local"
          chips={['E2–A4', 'Log', 'Offline']}
        />
      }
    >
      <Stack lg>
        <TunerTabs items={['Tuner', 'History']} active={tab} onSelect={(v) => setTab(v as TabId)} />
        {tabBody}
      </Stack>
    </AppShell>
  )
}
