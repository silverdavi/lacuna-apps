// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppShell,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  MonoLabel,
  PrimaryButton,
  Rail,
  Row,
  Select,
  SectionLabel,
  Stack,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { BigClock } from '@lacuna/big-clock'
import { useClipboard } from '@lacuna/use-clipboard'
import { useCollection } from '@lacuna/use-collection'
import { useTimer } from '@lacuna/use-timer'
import { formatDuration, humanizeDuration, parseDuration } from '@lacuna/format-duration'
import { toISODate } from '@lacuna/date-math'
import { computeStreaks } from '@lacuna/streak-calc'
import { Heatmap } from '@lacuna/heatmap'
import { fasts } from './host'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const PRESETS: { value: string; label: string; minutes: number }[] = [
  { value: '816', label: '8:16', minutes: 8 * 60 },
  { value: '1212', label: '12:12', minutes: 12 * 60 },
  { value: '1410', label: '14:10', minutes: 14 * 60 },
  { value: '168', label: '16:8', minutes: 16 * 60 },
  { value: 'custom', label: 'Custom', minutes: 0 },
]

function durationText(ms: number): string {
  const h = Math.floor(ms / HOUR)
  const m = Math.floor((ms % HOUR) / MINUTE)
  return `${h}h ${m}m`
}

function historySummary(items: { startedAt: number; durationMs: number }[]): string {
  const lines: string[] = []
  for (const item of items) {
    const started = new Date(item.startedAt)
    const label = `${toISODate(started)}  ${formatDuration(item.durationMs)}  ${humanizeDuration(item.durationMs)}`
    lines.push(label)
  }
  return lines.join('\n')
}

export function App() {
  const [timer, controls] = useTimer({
    storageKey: 'fasting-timer:active',
    autoStart: false,
  })
  const [version, setVersion] = useState(0)
  const [preset, setPreset] = useState('168')
  const [duration, setDuration] = useState(() => durationText(16 * HOUR))
  const [copiedFlash, setCopiedFlash] = useState(false)
  const [fastStarted, setFastStarted] = useState(() => {
    try {
      const raw = window.localStorage.getItem('fasting-timer:active')
      if (raw === null) return false
      const p = JSON.parse(raw)
      return p.running === true || (typeof p.elapsedMs === 'number' && p.elapsedMs > 0)
    } catch {
      return false
    }
  })

  const refresh = () => setVersion((v) => v + 1)

  const { state: historyState, actions: historyActions } = useCollection<{ startedAt: number; endedAt: number; durationMs: number }>({
    storageKey: 'fasting-timer:log',
  })

  // Sync the log into the host record store so it is part of the app's data.
  useEffect(() => {
    const records = historyState.activeItems.map((item) => ({
      id: item.id,
      startedAt: item.data.startedAt,
      endedAt: item.data.endedAt,
      durationMs: item.data.durationMs,
    }))
    const current = fasts.list()
    if (current.length === records.length && records.every((record) => current.some((c) => c.id === record.id))) return
    fasts.replaceAll(records)
  }, [version, historyState.activeItems])

  useEffect(() => {
    if (!copiedFlash) return
    const id = window.setTimeout(() => setCopiedFlash(false), 2500)
    return () => window.clearTimeout(id)
  }, [copiedFlash])

  useEffect(() => {
    const heading = document.querySelector('h1.lk-name')
    if (heading) {
      heading.setAttribute('aria-label', 'Fasting Timer')
    }
  }, [])

  const { copy } = useClipboard({
    onSuccess: () => setCopiedFlash(true),
  })

  const active = fastStarted && timer.remainingMs != null
  const phase: 'idle' | 'fasting' | 'paused' = !active ? 'idle' : timer.running ? 'fasting' : 'paused'
  const remainingMs = timer.remainingMs ?? 0
  const displayMs = remainingMs > 0 ? Math.ceil(remainingMs / 1000) * 1000 : remainingMs

  const applyPreset = (value: string) => {
    setPreset(value)
    const option = PRESETS.find((p) => p.value === value)
    if (option && option.value !== 'custom' && phase === 'idle') {
      setDuration(durationText(option.minutes * MINUTE))
    }
  }

  const startFast = () => {
    const ms = parseDuration(duration.trim())
    if (ms <= 0) return
    controls.setDuration(ms)
    controls.start()
    setFastStarted(true)
  }

  const endFast = () => {
    const elapsed = timer.elapsedMs
    const totalMs = elapsed + remainingMs
    const endedAt = Date.now()
    historyActions.add({
      startedAt: endedAt - elapsed,
      endedAt,
      durationMs: totalMs,
    })
    // reset() persists an empty state, which use-timer would restore on the
    // next load as a "paused" countdown; clear the key so the app truly idles.
    setFastStarted(false)
    controls.reset()
    try {
      window.localStorage.removeItem('fasting-timer:active')
    } catch {
      // storage unavailable
    }
    refresh()
  }

  const removeEntry = (id: string) => {
    historyActions.remove(id)
    refresh()
  }

  const entries = useMemo(
    () =>
      [...historyState.activeItems]
        .sort((a, b) => b.data.endedAt - a.data.endedAt)
        .map((item) => ({ id: item.id, ...item.data })),
    [historyState.activeItems],
  )

  const streakDays = useMemo(() => {
    const days = new Set(entries.map((entry) => toISODate(new Date(entry.endedAt))))
    return computeStreaks([...days])
  }, [entries])

  const heatmapData = useMemo(
    () =>
      entries.map((entry) => ({
        date: toISODate(new Date(entry.endedAt)),
        value: Math.round(entry.durationMs / HOUR),
      })),
    [entries],
  )

  const summaryText = useMemo(() => historySummary(entries), [entries])

  return (
    <AppShell
      name="Fast Timer"
      icon="timesheets"
      hue="teal"
      category="Personal"
      meta={entries.length ? `${entries.length} fasts` : undefined}
      side={
        <Rail title="Streak" note={`${streakDays.current} day current`} chips={[`${streakDays.longest} day best`, `${entries.length} fasts logged`]}>
          <SectionLabel>Activity</SectionLabel>
          <Stack>
            <Heatmap data={heatmapData} max={24} label="Fast hours per day" />
            <KpiRow>
              <Kpi value={streakDays.current} label="Current streak" />
              <Kpi value={streakDays.longest} label="Longest streak" />
            </KpiRow>
          </Stack>
        </Rail>
      }
    >
      <Stack lg>
        <Card mono="Active fast" title="Timer">
          {active ? (
            <Stack lg>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(12px * var(--sf))' }}>
                <Tag accent>{phase === 'fasting' ? 'Fasting' : 'Paused'}</Tag>
                {duration.trim() !== '' ? <MonoLabel faint>{duration.trim()}</MonoLabel> : null}
              </div>
              <BigClock ms={displayMs} finished={remainingMs <= 0} label="Time remaining" />
              <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
                {phase === 'fasting' ? (
                  <PrimaryButton onClick={() => controls.pause()}>Pause</PrimaryButton>
                ) : (
                  <PrimaryButton onClick={() => controls.start()}>Resume</PrimaryButton>
                )}
                <button type="button" className="lc-btn secondary" onClick={endFast}>
                  End fast
                </button>
              </div>
            </Stack>
          ) : (
            <EmptyState title="No active fast" detail="Pick a preset or type a duration, then start your fast." actionLabel="Start fast" />
          )}
        </Card>

        <Card mono="New fast" title="Start a fast">
          {phase === 'idle' ? (
            <Stack lg>
              <FormGrid>
                <Select
                  label="Preset"
                  value={preset}
                  onChange={applyPreset}
                   options={PRESETS.map((p) => ({ value: p.value, label: p.label }))}
                />
                <TextInput label="Duration" value={duration} onChange={setDuration} placeholder="16h 0m" />
              </FormGrid>
              <PrimaryButton onClick={startFast} disabled={parseDuration(duration.trim()) <= 0}>
                Start fast
              </PrimaryButton>
            </Stack>
          ) : (
            <MonoLabel faint>
              {phase === 'fasting' ? 'Fast in progress. End it to log it.' : 'Fast on hold. Resume or end it.'}
            </MonoLabel>
          )}
        </Card>

        <Card mono="History" title="Fasts logged" actions={<MonoLabel sm accent>{summaryText ? `${entries.length} total` : undefined}</MonoLabel>}>
          {entries.length === 0 ? (
            <EmptyState title="No fasts logged yet" detail="End a fast and it will appear here." actionLabel="Start fast" />
          ) : (
            <Stack>
              <Row title="Copy" value="plain text summary" action={
                <button type="button" className="lc-btn ghost" onClick={() => { void copy(summaryText) }}>
                  Copy summary
                </button>
              } />
              {entries.map((entry) => (
                <Row
                  key={entry.id}
                  title={toISODate(new Date(entry.startedAt))}
                  meta={`ended ${toISODate(new Date(entry.endedAt))}`}
                  value={durationText(entry.durationMs)}
                  action={
                    <button type="button" className="lc-btn ghost" onClick={() => removeEntry(entry.id)}>
                      Delete
                    </button>
                  }
                />
              ))}
            </Stack>
          )}
        </Card>

        {copiedFlash ? (
          <MonoLabel accent sm>Summary copied to clipboard</MonoLabel>
        ) : null}
      </Stack>
    </AppShell>
  )
}
